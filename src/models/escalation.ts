/** Escalation tactic ladder. See AGENTS.md §3.3. */

/**
 * Behavioral lever each wave applies (AGENTS.md §3.2–§3.3):
 * - `snark`  — Wave 1, light cue.
 * - `shrink` — Wave 2, shrink the task.
 * - `stakes` — Wave 3, stakes / social.
 * - `roast`  — Wave 4+, full theatrical roast.
 */
export type EscalationTactic = 'snark' | 'shrink' | 'stakes' | 'roast';

export type EscalationWave = {
  /** 1-based wave number. */
  wave: number;
  tactic: EscalationTactic;
  /** Minutes after the goal's scheduled time this wave fires. */
  offsetMinutes: number;
};
