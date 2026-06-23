/** Completion + skip records and derived streak stats. See AGENTS.md §4.3, §4.5, §4.7. */

export type CompletionSource = 'tap' | 'notification';

export type Completion = {
  id: string;
  goalId: string;
  timestamp: string;
  source: CompletionSource;
  /** Whether an accountability buddy was notified (§4.6). */
  witnessed: boolean;
  /**
   * Logged amount for quantified goals (§4.1, §4.3), e.g. 4 (pages). Partial
   * counts allowed; feeds the partial-completion roast (§6). Unset for plain
   * done/skip goals.
   */
  amount?: number;
};

export type Skip = {
  id: string;
  goalId: string;
  timestamp: string;
  /** Reason selected during the friction flow (§4.5). */
  reason: string;
};

/**
 * A goal's state for the current day (§4.7 home/agenda):
 * - `done`    — completed today.
 * - `skipped` — explicitly skipped today.
 * - `pending` — expected today (scheduled, or a weekly-target not yet met) and not acted on.
 * - `off`     — not expected today (no slot today, or weekly target already met).
 */
export type TodayStatus = 'done' | 'skipped' | 'pending' | 'off';

/**
 * Today's snapshot for one goal (§4.7). For weekly-target goals, `weekDone` /
 * `weekTarget` drive the "N/target this week" progress UI; `weekTarget` is unset
 * for fixed-schedule goals.
 */
export type GoalToday = {
  status: TodayStatus;
  weekDone: number;
  weekTarget?: number;
};

/** Derived per-goal stats (computed from completions/skips, §4.7). */
export type StreakStats = {
  current: number;
  longest: number;
  /** What a streak unit counts: calendar days, or weeks for weekly-target goals. */
  streakUnit: 'day' | 'week';
  completionRate7: number;
  completionRate30: number;
  completionRate90: number;
  ignoredCount: number;
};
