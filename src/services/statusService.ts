/** Per-goal "today" status (done / skipped / pending / off). AGENTS.md §4.7. */

import { supabase } from '@/lib/supabase';
import type { Goal, GoalToday, TodayStatus } from '@/models';

const isoDay = (d: Date): number => (d.getDay() === 0 ? 7 : d.getDay());

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday 00:00 of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const offset = (d.getDay() + 6) % 7; // 0 = Mon … 6 = Sun
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Pure status rule for one goal given this week's completion timestamps and
 * today's skip timestamps. Exported for testing.
 */
export function todayStatusFor(
  goal: Goal,
  weekCompletions: string[],
  todaySkips: string[],
  now: Date = new Date()
): TodayStatus {
  if (goal.paused || goal.archived) return 'off';

  const completedToday = weekCompletions.some((ts) => sameDay(new Date(ts), now));
  if (completedToday) return 'done';
  if (todaySkips.some((ts) => sameDay(new Date(ts), now))) return 'skipped';

  const weeklyTarget = goal.schedule.weeklyTarget;
  if (weeklyTarget && weeklyTarget > 0) {
    // Expected any day until the weekly target is met.
    const weekStart = startOfWeek(now).getTime();
    const hitsThisWeek = weekCompletions.filter((ts) => new Date(ts).getTime() >= weekStart).length;
    return hitsThisWeek >= weeklyTarget ? 'off' : 'pending';
  }

  // Fixed schedule: expected only on its scheduled weekdays.
  const today = isoDay(now);
  return goal.schedule.slots.some((s) => s.day === today) ? 'pending' : 'off';
}

export const statusService = {
  /** Today's snapshot for each goal (status + weekly progress), in one pair of queries. */
  async getTodayStatuses(goals: Goal[]): Promise<Record<string, GoalToday>> {
    const out: Record<string, GoalToday> = {};
    if (goals.length === 0) return out;

    const now = new Date();
    const ids = goals.map((g) => g.id);
    const weekStart = startOfWeek(now).toISOString();
    const todayStart = startOfDay(now).toISOString();

    const [{ data: comp, error: compErr }, { data: skip, error: skipErr }] = await Promise.all([
      supabase.from('completions').select('goal_id, ts').in('goal_id', ids).gte('ts', weekStart),
      supabase.from('skips').select('goal_id, ts').in('goal_id', ids).gte('ts', todayStart),
    ]);
    if (compErr) throw compErr;
    if (skipErr) throw skipErr;

    const compByGoal = new Map<string, string[]>();
    for (const r of comp as { goal_id: string; ts: string }[]) {
      (compByGoal.get(r.goal_id) ?? compByGoal.set(r.goal_id, []).get(r.goal_id)!).push(r.ts);
    }
    const skipByGoal = new Map<string, string[]>();
    for (const r of skip as { goal_id: string; ts: string }[]) {
      (skipByGoal.get(r.goal_id) ?? skipByGoal.set(r.goal_id, []).get(r.goal_id)!).push(r.ts);
    }

    const weekStartMs = startOfWeek(now).getTime();
    for (const g of goals) {
      const comps = compByGoal.get(g.id) ?? [];
      const status = todayStatusFor(g, comps, skipByGoal.get(g.id) ?? [], now);
      const weekDone = comps.filter((ts) => new Date(ts).getTime() >= weekStartMs).length;
      out[g.id] = { status, weekDone, weekTarget: g.schedule.weeklyTarget };
    }
    return out;
  },
};
