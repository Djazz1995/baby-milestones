/** Week overview: per-day done-vs-due grid + per-goal streaks. AGENTS.md §4.7. */

import { supabase } from '@/lib/supabase';
import type { Goal, StreakStats } from '@/models';
import { completionService } from '@/services/completionService';

const isoDay = (d: Date): number => (d.getDay() === 0 ? 7 : d.getDay());

function startOfWeek(d: Date): Date {
  const offset = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * How many active goals are "due" on weekday `day` of the week starting `start`:
 * fixed slot on that weekday, weekly goals every day, specific-dates goals when
 * a picked date lands on that calendar day.
 */
function dueOn(goals: Goal[], day: number, start: Date): number {
  const cellDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (day - 1));
  const cell = ymd(cellDate);
  const cellFloor = cellDate.getTime();
  return goals.filter((g) => {
    if (g.paused || g.archived) return false;
    // Not due before the goal existed.
    const created = new Date(g.createdAt);
    if (cellFloor < new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime())
      return false;
    if (g.schedule.dates?.length) return g.schedule.dates.includes(cell);
    if (g.schedule.weeklyTarget) return true;
    return g.schedule.slots.some((s) => s.day === day);
  }).length;
}

export type WeekDay = { day: number; done: number; due: number };
/** Per-day heatmap state for one goal across the 7 days of the displayed week. */
export type WeekCell = 'done' | 'skipped' | 'off' | 'missed' | 'none';
/**
 * `weekDone` = completions in the displayed week (drives weekly progress copy).
 * `cells` = the goal's 7-day heatmap row (Mon→Sun) for the consistency grid.
 */
export type GoalStreak = { goal: Goal; stats: StreakStats; weekDone: number; cells: WeekCell[] };
export type WeekOverview = { grid: WeekDay[]; streaks: GoalStreak[] };

/** Is goal `g` scheduled/due on ISO weekday `day` (1=Mon…7=Sun) at `cellDate`? */
function goalDueOnDay(g: Goal, day: number, cellDate: Date): boolean {
  const created = new Date(g.createdAt);
  if (
    cellDate.getTime() <
    new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime()
  )
    return false;
  if (g.schedule.dates?.length) return g.schedule.dates.includes(ymd(cellDate));
  if (g.schedule.weeklyTarget) return true;
  return g.schedule.slots.some((s) => s.day === day);
}

export const statsService = {
  /** Overview for the week containing `weekRef` (defaults to the current week). */
  async getOverview(goals: Goal[], weekRef: Date = new Date()): Promise<WeekOverview> {
    const start = startOfWeek(weekRef);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    const grid: WeekDay[] = Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      done: 0,
      due: dueOn(goals, i + 1, start),
    }));

    if (goals.length === 0) return { grid, streaks: [] };

    const ids = goals.map((g) => g.id);
    const [{ data: comp, error }, { data: skip, error: skipErr }] = await Promise.all([
      supabase
        .from('completions')
        .select('goal_id, ts')
        .in('goal_id', ids)
        .gte('ts', start.toISOString())
        .lt('ts', end.toISOString()),
      supabase
        .from('skips')
        .select('goal_id, ts')
        .in('goal_id', ids)
        .gte('ts', start.toISOString())
        .lt('ts', end.toISOString()),
    ]);
    if (error) throw error;
    if (skipErr) throw skipErr;

    const weekDoneByGoal = new Map<string, number>();
    // Per-goal, per-weekday flags (1=Mon…7=Sun) for the heatmap.
    const doneByGoalDay = new Set<string>();
    const skipByGoalDay = new Set<string>();
    for (const r of comp as { goal_id: string; ts: string }[]) {
      const d = isoDay(new Date(r.ts));
      grid[d - 1].done += 1;
      weekDoneByGoal.set(r.goal_id, (weekDoneByGoal.get(r.goal_id) ?? 0) + 1);
      doneByGoalDay.add(`${r.goal_id}:${d}`);
    }
    for (const r of skip as { goal_id: string; ts: string }[]) {
      skipByGoalDay.add(`${r.goal_id}:${isoDay(new Date(r.ts))}`);
    }

    const now = new Date();
    const todayFloor = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const cellsFor = (goal: Goal): WeekCell[] =>
      Array.from({ length: 7 }, (_, i) => {
        const day = i + 1;
        const cellDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        if (doneByGoalDay.has(`${goal.id}:${day}`)) return 'done';
        if (skipByGoalDay.has(`${goal.id}:${day}`)) return 'skipped';
        if (!goalDueOnDay(goal, day, cellDate)) return 'off';
        // Due, not acted: past day → missed; today/future → not yet decided.
        return cellDate.getTime() < todayFloor ? 'missed' : 'none';
      });

    const streaks = await Promise.all(
      goals.map(async (goal) => ({
        goal,
        stats: await completionService.getStats(goal.id),
        weekDone: weekDoneByGoal.get(goal.id) ?? 0,
        cells: cellsFor(goal),
      }))
    );

    return { grid, streaks };
  },
};
