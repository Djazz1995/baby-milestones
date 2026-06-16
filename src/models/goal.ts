/** Goal and its value types. See AGENTS.md §4.1, §6, §15.2. */

export type GoalCategory = 'gym' | 'study' | 'chores' | 'diet' | 'sleep' | 'custom';

/** Rudeness tier (AGENTS.md §6). 1 = Mild Disappointment … 4 = Unhinged. */
export type RudenessLevel = 1 | 2 | 3 | 4;

/** How fast escalation waves fire (AGENTS.md §4.1). */
export type EscalationSpeed = 'slow' | 'normal' | 'unhinged';

/**
 * When a goal fires.
 * - `days`: ISO weekday numbers (1 = Mon … 7 = Sun) the goal is active.
 * - `timeOfDay`: local "HH:mm".
 * - `intervalHours`: optional "every X hours" mode (AGENTS.md §4.1).
 */
export type Schedule = {
  days: number[];
  timeOfDay: string;
  intervalHours?: number;
};

export type Goal = {
  id: string;
  userId: string;
  name: string;
  category: GoalCategory;
  /** Concrete trigger text used in Wave 1, e.g. "bag by the door" (§4.1). */
  cue?: string;
  schedule: Schedule;
  rudenessLevel: RudenessLevel;
  escalationSpeed: EscalationSpeed;
  /** Accountability buddy witnessing this goal (§4.6), if any. */
  buddyId?: string;
  /** Paused goals keep history but fire no notifications (§7.1). */
  paused: boolean;
  createdAt: string;
};
