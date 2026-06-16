/** Completion logging + derived streak stats. AGENTS.md §4.3, §4.7, §15.3. */

import { getUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Completion, CompletionSource, StreakStats } from '@/models';

type CompletionRow = {
  id: string;
  goal_id: string;
  user_id: string;
  ts: string;
  source: CompletionSource;
  witnessed: boolean;
};

function mapCompletion(row: CompletionRow): Completion {
  return {
    id: row.id,
    goalId: row.goal_id,
    timestamp: row.ts,
    source: row.source,
    witnessed: row.witnessed,
  };
}

/** Local YYYY-MM-DD key for a timestamp. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function daysBetween(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((da - db) / ms);
}

/**
 * Streaks from distinct completion days. `longest` = longest run of
 * consecutive calendar days; `current` = run ending today or yesterday
 * (0 if the most recent completion is older, i.e. the streak broke).
 */
function computeStreaks(completionDates: string[]): { current: number; longest: number } {
  const uniqueDays = [...new Set(completionDates.map(dayKey))]
    .map((k) => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m, d);
    })
    .sort((a, b) => a.getTime() - b.getTime());

  if (uniqueDays.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    if (daysBetween(uniqueDays[i], uniqueDays[i - 1]) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
  }

  const today = new Date();
  const last = uniqueDays[uniqueDays.length - 1];
  const gap = daysBetween(today, last);
  let current = 0;
  if (gap === 0 || gap === 1) {
    current = 1;
    for (let i = uniqueDays.length - 1; i > 0; i--) {
      if (daysBetween(uniqueDays[i], uniqueDays[i - 1]) === 1) current += 1;
      else break;
    }
  }

  return { current, longest };
}

/** Engagement rate over a window: completions / (completions + skips). */
function rateInWindow(completions: string[], skips: string[], days: number): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const c = completions.filter((t) => new Date(t).getTime() >= cutoff).length;
  const s = skips.filter((t) => new Date(t).getTime() >= cutoff).length;
  const total = c + s;
  return total === 0 ? 0 : c / total;
}

export const completionService = {
  async complete(
    goalId: string,
    source: CompletionSource = 'tap',
    witnessed = false
  ): Promise<Completion> {
    const userId = await getUserId();
    if (!userId) throw new Error('Not signed in.');
    const { data, error } = await supabase
      .from('completions')
      .insert({ goal_id: goalId, user_id: userId, source, witnessed })
      .select()
      .single();
    if (error) throw error;
    return mapCompletion(data as CompletionRow);
  },

  async getStats(goalId: string): Promise<StreakStats> {
    const [{ data: comp, error: compErr }, { data: skip, error: skipErr }] = await Promise.all([
      supabase.from('completions').select('ts').eq('goal_id', goalId),
      supabase.from('skips').select('ts').eq('goal_id', goalId),
    ]);
    if (compErr) throw compErr;
    if (skipErr) throw skipErr;

    const completions = (comp as { ts: string }[]).map((r) => r.ts);
    const skips = (skip as { ts: string }[]).map((r) => r.ts);
    const { current, longest } = computeStreaks(completions);

    return {
      current,
      longest,
      completionRate7: rateInWindow(completions, skips, 7),
      completionRate30: rateInWindow(completions, skips, 30),
      completionRate90: rateInWindow(completions, skips, 90),
      // Requires the notification engine to know what was scheduled-but-ignored.
      ignoredCount: 0, // TODO(Phase 5): derive from scheduled-vs-acted.
    };
  },
};
