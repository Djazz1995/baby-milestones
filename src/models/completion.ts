/** Completion + skip records and derived streak stats. See AGENTS.md §4.3, §4.5, §4.7. */

export type CompletionSource = 'tap' | 'notification';

export type Completion = {
  id: string;
  goalId: string;
  timestamp: string;
  source: CompletionSource;
  /** Whether an accountability buddy was notified (§4.6). */
  witnessed: boolean;
};

export type Skip = {
  id: string;
  goalId: string;
  timestamp: string;
  /** Reason selected during the friction flow (§4.5). */
  reason: string;
};

/** Derived per-goal stats (computed from completions/skips, §4.7). */
export type StreakStats = {
  current: number;
  longest: number;
  completionRate7: number;
  completionRate30: number;
  completionRate90: number;
  ignoredCount: number;
};
