/** App-wide feature flags (build-time env, EXPO_PUBLIC_*). AGENTS.md §12, §9.3.
 *
 *  Flags are read once at module load. Flip in .env + rebuild — no remote infra.
 */

import type { EscalationSpeed, RudenessLevel } from '@/models';

function on(v: string | undefined): boolean {
  return v === '1' || v === 'true';
}

/**
 * Launch decision: lock every goal to the spiciest settings — Unhinged rudeness
 * (level 4) + Unhinged escalation (fastest waves) — for maximum screenshot fuel,
 * and hide both pickers everywhere. Flip these off later to bring the choices
 * back; the pickers reappear automatically.
 */
export const RUDENESS_LOCKED = true;
export const LOCKED_RUDENESS: RudenessLevel = 4;
export const ESCALATION_LOCKED = true;
export const LOCKED_ESCALATION: EscalationSpeed = 'unhinged';

/**
 * Monetization master switch (§12). When OFF (default), every paid gate is open
 * — unlimited goals, Unhinged tier, buddy free for all — and the paywall is
 * never shown. We launch with this OFF and flip it on later via .env.
 *   EXPO_PUBLIC_MONETIZATION_ENABLED=true
 * Read statically (expo/no-dynamic-env-var) so the bundler can inline it.
 */
export const MONETIZATION_ENABLED = on(process.env.EXPO_PUBLIC_MONETIZATION_ENABLED);

/** Free-tier limits (§12), only enforced when MONETIZATION_ENABLED is on. */
export const FREE_TIER = {
  /** Max active goals on the free tier. */
  maxGoals: 1,
  /** Highest rudeness level free users may pick (Unhinged = 4 is paid). */
  maxRudeness: 3 as const,
  /** Accountability buddy is a paid feature (§4.6, §12). */
  buddyAllowed: false,
};
