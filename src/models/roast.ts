/** Roast content. See AGENTS.md §4.8, §8.4. */

import type { GoalCategory, RudenessLevel } from './goal';
import type { EscalationTactic } from './escalation';

/** What surface a pooled line is for (§4.2, §4.3, §4.5). */
export type RoastKind = 'wave' | 'skip' | 'digest' | 'partial';

/** Completion-ratio band for `partial` lines (§4.3): <25% / ~half / almost. */
export type PartialBucket = 'low' | 'half' | 'almost';

/**
 * One line in the shared, pre-generated pool (§8.4). NOT per-user — reused
 * across all users and keyed by `kind`:
 * - `wave`    → (category, level, wave, tactic)
 * - `skip`    → (level) [category optional]
 * - `digest`  → (level) [cross-category, so category is null]
 * - `partial` → (category, level, bucket)
 * `text` may contain template slots (e.g. {cue}, {name}, {excuse}, {count},
 * {done}/{target}/{unit}) filled at send time by string interpolation — never
 * a live AI call (§8.4).
 */
export type RoastLine = {
  id: string;
  kind: RoastKind;
  category?: GoalCategory;
  level: RudenessLevel;
  wave?: number;
  tactic?: EscalationTactic;
  bucket?: PartialBucket;
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
