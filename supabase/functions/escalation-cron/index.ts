// Supabase Edge Function — escalation + digest push driver (AGENTS.md §3.3, §8.2).
//
// The on-device code (src/lib/notifications.ts) fires Wave-1 reminders locally.
// This cron drives what a device can't:
//   • CONDITIONAL ESCALATION — fire Wave 2/3/4 only if the scheduled occurrence
//     was ignored (no completion/skip today), spacing waves by escalation speed,
//     and never double-sending (notification_log).
//   • DAILY DIGEST — one summary push per user per day when goals are due.
//
// Buddy notify (§4.6) is NOT implemented: `buddies.contact` is a free-text
// handle with no link to an app user / push token, so there's nothing to target
// yet. It needs a buddy↔profile invite-linking flow first (tracked for v1.1).
//
// TIMEZONE: schedules store local "HH:mm" but we have no per-user tz, so this
// cron treats all times as UTC. Good enough for a first cut; real tz handling
// needs a profiles.timezone column (future). Run it every ~5 min via cron.
//
// Deploy:  supabase functions deploy escalation-cron
// Env:     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, [EXPO_ACCESS_TOKEN], [DIGEST_HOUR_UTC]

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Escalation offsets in minutes (mirror of src/services/escalationService.ts).
const OFFSETS: Record<string, number[]> = {
  slow: [0, 30, 60, 120],
  normal: [0, 15, 30, 45],
  unhinged: [0, 5, 10, 15],
};

const DIGEST_HOUR = Number(Deno.env.get('DIGEST_HOUR_UTC') ?? '8'); // local-as-UTC day start

type PushMessage = { to: string; title: string; body: string; data?: Record<string, unknown> };

async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(Deno.env.get('EXPO_ACCESS_TOKEN')
          ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` }
          : {}),
      },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }
}

const parseMin = (t: string): number => {
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Is `nowMin` inside the [start,end) quiet window? Handles overnight wrap. */
function inQuietHours(start: string | null, end: string | null, nowMin: number): boolean {
  if (!start || !end) return false;
  const s = parseMin(start);
  const e = parseMin(end);
  return s <= e ? nowMin >= s && nowMin < e : nowMin >= s || nowMin < e; // wrap past midnight
}

const SLOT_RE = /\{(\w+)\}/g;
const requiredSlots = (t: string): string[] => [...t.matchAll(SLOT_RE)].map((m) => m[1]);

/** Pick a pool line whose slots are all fillable, then interpolate. */
function personalize(
  rows: { text: string }[],
  slots: Record<string, string | undefined>
): string | undefined {
  const avail = new Set(
    Object.entries(slots)
      .filter(([, v]) => v != null && v !== '')
      .map(([k]) => k)
  );
  const eligible = rows.filter((r) => requiredSlots(r.text).every((s) => avail.has(s)));
  if (eligible.length === 0) return undefined;
  const pick = eligible[Math.floor(Math.random() * eligible.length)].text;
  return pick.replace(SLOT_RE, (_, k: string) => slots[k] ?? '');
}

const isoDow = (d: Date): number => ((d.getUTCDay() + 6) % 7) + 1; // 1=Mon … 7=Sun
const mondayIndex = (d: Date): number =>
  Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000 / 7);

type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  cue: string | null;
  schedule: { slots?: { day: number; time: string }[]; weeklyTarget?: number };
  rudeness_level: number;
  escalation_speed: string;
};
type ProfileRow = {
  id: string;
  push_token: string | null;
  rudeness_level: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // service role: bypass RLS for cron reads/writes
  );

  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const dayStart = `${today}T00:00:00.000Z`;
  const dow = isoDow(now);
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const thisWeek = mondayIndex(now);

  // ── Load everything the run needs in a handful of queries ────────────────
  const [{ data: goalsRaw }, { data: poolRaw }, { data: logRaw }, { data: compRaw }, { data: skipRaw }] =
    await Promise.all([
      supabase
        .from('goals')
        .select('id,user_id,name,category,cue,schedule,rudeness_level,escalation_speed')
        .eq('paused', false)
        .eq('archived', false),
      supabase.from('roast_lines').select('text,category,level,wave,kind').in('kind', ['wave', 'digest']),
      supabase.from('notification_log').select('goal_id,user_id,wave,kind').eq('occurred_on', today),
      supabase.from('completions').select('goal_id,ts').gte('ts', dayStart),
      supabase.from('skips').select('goal_id,ts').gte('ts', dayStart),
    ]);

  const goals = (goalsRaw ?? []) as GoalRow[];
  const pool = poolRaw ?? [];
  const log = logRaw ?? [];

  // Owner profiles (push token + quiet hours) for the users that own a goal.
  const userIds = [...new Set(goals.map((g) => g.user_id))];
  const profiles = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profRaw } = await supabase
      .from('profiles')
      .select('id,push_token,rudeness_level,quiet_hours_start,quiet_hours_end')
      .in('id', userIds);
    for (const p of (profRaw ?? []) as ProfileRow[]) profiles.set(p.id, p);
  }

  const completedToday = new Set((compRaw ?? []).map((r: { goal_id: string }) => r.goal_id));
  const skippedToday = new Set((skipRaw ?? []).map((r: { goal_id: string }) => r.goal_id));
  const waveSent = new Set(
    log.filter((r) => r.kind === 'wave').map((r) => `${r.goal_id}:${r.wave}`)
  );
  const digestSent = new Set(log.filter((r) => r.kind === 'digest').map((r) => r.user_id));

  // Roast-only (v1): every escalation wave pulls a roast-tactic line; `wave`
  // drives only cadence + dedup, not the copy tier.
  const waveLines = (cat: string, level: number) =>
    pool.filter((r) => r.kind === 'wave' && r.category === cat && r.level === level && r.tactic === 'roast');
  const digestLines = (level: number) => pool.filter((r) => r.kind === 'digest' && r.level === level);

  const messages: PushMessage[] = [];
  const logInserts: { user_id: string; goal_id: string | null; occurred_on: string; wave: number | null; kind: string }[] = [];

  // ── 1. CONDITIONAL ESCALATION (fixed-slot goals only) ────────────────────
  for (const goal of goals) {
    const profile = profiles.get(goal.user_id);
    if (!profile?.push_token) continue;
    if (completedToday.has(goal.id) || skippedToday.has(goal.id)) continue; // acted on → stop
    if (inQuietHours(profile.quiet_hours_start, profile.quiet_hours_end, nowMin)) continue;

    const offsets = OFFSETS[goal.escalation_speed] ?? OFFSETS.normal;
    const slotsToday = (goal.schedule?.slots ?? []).filter((s) => s.day === dow);

    for (const slot of slotsToday) {
      const elapsed = nowMin - parseMin(slot.time);
      if (elapsed < 0) continue; // occurrence hasn't happened yet today

      // Highest wave whose offset has elapsed. Wave 1 fires locally on-device.
      let waveIdx = -1;
      for (let i = 0; i < offsets.length; i++) if (offsets[i] <= elapsed) waveIdx = i;
      const wave = waveIdx + 1;
      if (wave < 2) continue;
      if (waveSent.has(`${goal.id}:${wave}`)) continue; // already escalated this far today

      const body = personalize(waveLines(goal.category, goal.rudeness_level), {
        name: goal.name,
        cue: goal.cue ?? undefined,
      });
      if (!body) continue;

      messages.push({
        to: profile.push_token,
        title: 'RoastMode',
        body,
        data: { goalId: goal.id, wave, deepLink: `/goal/${goal.id}` },
      });
      logInserts.push({ user_id: goal.user_id, goal_id: goal.id, occurred_on: today, wave, kind: 'wave' });
      waveSent.add(`${goal.id}:${wave}`); // guard against multiple slots same goal/run
      break; // one escalation push per goal per run
    }
  }

  // ── 2. DAILY DIGEST (one per user per day, at/after day start) ────────────
  if (nowMin >= DIGEST_HOUR * 60) {
    // Week completions per goal, for weekly-target due checks.
    const { data: weekCompRaw } = await supabase
      .from('completions')
      .select('goal_id,ts')
      .gte('ts', new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((dow + 6) % 7))).toISOString());
    const weekCountByGoal = new Map<string, number>();
    for (const r of (weekCompRaw ?? []) as { goal_id: string }[])
      weekCountByGoal.set(r.goal_id, (weekCountByGoal.get(r.goal_id) ?? 0) + 1);

    const dueByUser = new Map<string, number>();
    for (const goal of goals) {
      const wk = goal.schedule?.weeklyTarget;
      let due = false;
      if (wk && wk > 0) {
        due = (weekCountByGoal.get(goal.id) ?? 0) < wk && !completedToday.has(goal.id);
      } else {
        const slotToday = (goal.schedule?.slots ?? []).some((s) => s.day === dow);
        due = slotToday && !completedToday.has(goal.id) && !skippedToday.has(goal.id);
      }
      if (due) dueByUser.set(goal.user_id, (dueByUser.get(goal.user_id) ?? 0) + 1);
    }

    for (const [userId, count] of dueByUser) {
      if (count <= 0 || digestSent.has(userId)) continue;
      const profile = profiles.get(userId);
      if (!profile?.push_token) continue;
      if (inQuietHours(profile.quiet_hours_start, profile.quiet_hours_end, nowMin)) continue;

      const body = personalize(digestLines(profile.rudeness_level), { count: String(count) });
      if (!body) continue;
      messages.push({ to: profile.push_token, title: 'RoastMode', body, data: { deepLink: '/' } });
      logInserts.push({ user_id: userId, goal_id: null, occurred_on: today, wave: null, kind: 'digest' });
    }
  }

  // ── Send + record ────────────────────────────────────────────────────────
  await sendExpoPush(messages);
  if (logInserts.length > 0) await supabase.from('notification_log').insert(logInserts);

  return new Response(
    JSON.stringify({ ok: true, escalations: logInserts.filter((l) => l.kind === 'wave').length, digests: logInserts.filter((l) => l.kind === 'digest').length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
