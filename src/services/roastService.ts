/** Reads the shared cached roast pool + personalizes by string interpolation.
 *  AGENTS.md §8.4, §15.3, §15.5.
 *
 *  NO live AI call at send time (§8.4): every line comes from the pre-generated
 *  `roast_lines` pool (filled by the batch job, scripts/generate-roasts.mjs) and
 *  is personalized by filling template slots — {name} {cue} {excuse} {count}
 *  {done}/{target}/{unit} — with goal/context data. Owns all pool I/O; returns
 *  models/strings, throws on error.
 *
 *  Two safety gates apply (§9.3): the pool itself is pre-filtered at generation,
 *  and a user-supplied excuse is re-checked here (isSafeExcuse) before it can be
 *  interpolated into a {excuse} slot. The kill switch routes around the pool to
 *  neutral copy entirely.
 */

import { supabase } from '@/lib/supabase';
import { isSafeExcuse, roastKillSwitchOn } from '@/lib/safety';
import type { Goal, PartialBucket, RoastCard, RudenessLevel } from '@/models';

type Row = { text: string };

/** Slot tokens a template line may contain. */
const SLOT_RE = /\{(\w+)\}/g;

/** Tokens required by a line (e.g. ["name","cue"]). */
function requiredSlots(text: string): string[] {
  return [...text.matchAll(SLOT_RE)].map((m) => m[1]);
}

/** Pick a line whose required slots are all fillable, then interpolate it. */
function personalize(rows: Row[], slots: Record<string, string | undefined>): string | undefined {
  const available = new Set(Object.entries(slots).filter(([, v]) => v != null).map(([k]) => k));
  const eligible = rows.filter((r) => requiredSlots(r.text).every((s) => available.has(s)));
  if (eligible.length === 0) return undefined;
  const text = eligible[Math.floor(Math.random() * eligible.length)].text;
  return text.replace(SLOT_RE, (_, k: string) => slots[k] ?? '');
}

/** First user blocker that clears the §9.3 excuse gate, if any (§4.1). */
function safeExcuse(goal: Goal): string | undefined {
  return goal.blockers.find((b) => isSafeExcuse(b));
}

/** done/target ratio → pool bucket (§4.3). Caller handles full (ratio ≥ 1). */
function ratioBucket(done: number, target: number): PartialBucket {
  const r = target > 0 ? done / target : 0;
  if (r < 0.34) return 'low';
  if (r < 0.67) return 'half';
  return 'almost';
}

export const roastService = {
  /**
   * A personalized Wave-N line for a goal (§4.2). Returns a shareable RoastCard
   * (§4.8). Falls back to neutral copy on kill switch or an empty/uncovered pool.
   */
  async getLine(goal: Goal, wave: number): Promise<RoastCard> {
    const text = await this.lineText(goal, wave);
    return {
      id: `${goal.id}-${wave}-${Date.now()}`,
      goalId: goal.id,
      text,
      wave,
      watermark: true,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Raw roast body text for a goal. v1 is ROAST-ONLY: every notification (the
   * local reminder + every escalation wave) pulls a roast-tactic line, so the
   * `wave` arg drives only cadence/dedup, not which copy tier is used.
   */
  async lineText(goal: Goal, wave: number): Promise<string> {
    void wave; // roast-only: content no longer varies by wave
    const neutral = goal.cue ? `${goal.cue}.` : `${goal.name}. Time to go.`;
    if (roastKillSwitchOn()) return neutral;
    const { data, error } = await supabase
      .from('roast_lines')
      .select('text')
      .eq('kind', 'wave')
      .eq('category', goal.category)
      .eq('level', goal.rudenessLevel)
      .eq('tactic', 'roast');
    if (error) throw error;
    const text = personalize(data ?? [], {
      name: goal.name,
      cue: goal.cue,
      excuse: safeExcuse(goal),
    });
    return text ?? neutral;
  },

  /** Skip-confirmation roast, keyed by level; {excuse} = the skip reason (§4.5). */
  async getSkip(level: RudenessLevel, reason: string): Promise<string> {
    const neutral = 'Skip logged. Counts against your streak.';
    if (roastKillSwitchOn()) return neutral;
    const { data, error } = await supabase
      .from('roast_lines')
      .select('text')
      .eq('kind', 'skip')
      .eq('level', level);
    if (error) throw error;
    return personalize(data ?? [], { excuse: isSafeExcuse(reason) ? reason : undefined }) ?? neutral;
  },

  /** Daily multi-goal digest line, keyed by level; {count} = goals due (§4.2). */
  async getDigest(level: RudenessLevel, count: number): Promise<string> {
    const neutral = `${count} ${count === 1 ? 'goal' : 'goals'} due today.`;
    if (roastKillSwitchOn() || count <= 0) return neutral;
    const { data, error } = await supabase
      .from('roast_lines')
      .select('text')
      .eq('kind', 'digest')
      .eq('level', level);
    if (error) throw error;
    return personalize(data ?? [], { count: String(count) }) ?? neutral;
  },

  /**
   * Partial-completion roast for a quantified goal — mocks the ratio, not the
   * skip (§4.3). Roasts the effort level, never the person (§3.1).
   */
  async getPartial(goal: Goal, done: number): Promise<string> {
    const target = goal.targetValue ?? 0;
    const unit = goal.unit ?? 'units';
    const neutral = `${done} of ${target} ${unit}. Logged.`;
    if (roastKillSwitchOn()) return neutral;
    const { data, error } = await supabase
      .from('roast_lines')
      .select('text')
      .eq('kind', 'partial')
      .eq('category', goal.category)
      .eq('level', goal.rudenessLevel)
      .eq('bucket', ratioBucket(done, target));
    if (error) throw error;
    return (
      personalize(data ?? [], { done: String(done), target: String(target), unit }) ?? neutral
    );
  },

  /**
   * Weekly-progress roast for a weekly-frequency goal (§4.7) — mocks the
   * days-done vs days-wanted ratio (e.g. "gym 2 of 5 this week"), not a skip.
   * `done`/`target` are DAYS. Roasts the shortfall, never the person (§3.1).
   */
  async getWeekly(goal: Goal, done: number, target: number): Promise<string> {
    const neutral = `${done} of ${target} days this week. Logged.`;
    if (roastKillSwitchOn()) return neutral;
    const { data, error } = await supabase
      .from('roast_lines')
      .select('text')
      .eq('kind', 'weekly')
      .eq('category', goal.category)
      .eq('level', goal.rudenessLevel)
      .eq('bucket', ratioBucket(done, target));
    if (error) throw error;
    return (
      personalize(data ?? [], { done: String(done), target: String(target), name: goal.name }) ??
      neutral
    );
  },
};
