/** Roast content. See AGENTS.md §4.8, §8.4. */

import type { GoalCategory, RudenessLevel } from './goal';
import type { EscalationTactic } from './escalation';

/**
 * One line in the shared, pre-generated pool (§8.4). NOT per-user — keyed by
 * (category, level, wave) and reused across all users. `text` may contain
 * template slots (e.g. {cue}, {name}) filled at send time by string interp.
 */
export type RoastLine = {
  id: string;
  category: GoalCategory;
  level: RudenessLevel;
  wave: number;
  tactic: EscalationTactic;
  text: string;
};

/** A personalized, shareable card rendered from a roast line (§4.8). */
export type RoastCard = {
  id: string;
  goalId: string;
  text: string;
  wave: number;
  watermark: boolean;
  createdAt: string;
};
