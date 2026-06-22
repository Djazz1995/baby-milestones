/** Post-generation safety filter + kill switch (AGENTS.md §9.3, §3.1, §6).
 *
 * The golden rule (§3.1): roast the excuse and the behavior, NEVER the person.
 * Hard limits (§6): no comments on body, weight, appearance, identity, or
 * mental-health/self-harm. This module is the single gate every roast line and
 * every user-supplied excuse passes before it reaches a notification.
 *
 * Pure — no I/O, no React, no SDK. Used by:
 *   • the batch generator (post-generation rejection of model output, §9.3), and
 *   • RoastService at send time (rejecting an unsafe user `blocker` before it is
 *     interpolated into a {excuse} slot, §4.1).
 *
 * IMPORTANT: scripts/generate-roasts.mjs mirrors BLOCKED_PATTERNS — keep both in
 * sync (it can't import this TS module under plain node).
 */

/**
 * Disjoint categories of disallowed content. Each pattern targets a §6 hard
 * limit. Word-boundary anchored to avoid false hits inside longer words
 * (e.g. "fattening" must not trip on "fat" the body-shaming sense — but a bare
 * "fat" as an insult should). We err toward rejection: a flagged line is
 * regenerated/dropped, never sent.
 */
const BLOCKED_PATTERNS: { reason: string; re: RegExp }[] = [
  // Body / weight / appearance (§6).
  { reason: 'body/weight', re: /\b(fat|fatso|obese|chubby|skinny|ugly|hideous|disgusting)\b/i },
  { reason: 'appearance', re: /\b(your (face|body|weight|looks|teeth|skin))\b/i },
  // Identity / protected groups (§9.1) — no targeting; conservative net.
  { reason: 'identity', re: /\b(retard|retarded|tranny|fag|faggot|slut|whore)\b/i },
  // Mental health / self-harm (§6, §9.3) — the brightest line.
  {
    reason: 'self-harm',
    re: /\b(kill yourself|kys|hang yourself|end it all|suicide|cut yourself|worthless human|you should die)\b/i,
  },
  { reason: 'mental-health', re: /\b(depress(ed|ion)|bipolar|psycho|schizo|mentally ill)\b/i },
  // Person-worth attacks (§3.1) — "you're a loser/failure/waste" roasts the person, not the act.
  {
    reason: 'person-worth',
    re: /\byou(?:'?re| are)\s+(a\s+)?(loser|failure|waste|worthless|pathetic|nobody|garbage|trash)\b/i,
  },
];

export type SafetyResult = { safe: true } | { safe: false; reason: string };

/** Check one piece of generated/derived text against the §9.3 hard limits. */
export function checkText(text: string): SafetyResult {
  for (const { reason, re } of BLOCKED_PATTERNS) {
    if (re.test(text)) return { safe: false, reason };
  }
  return { safe: true };
}

/** True if a roast line is safe to send (§9.3). */
export function isSafeLine(text: string): boolean {
  return checkText(text).safe;
}

/**
 * A user-declared excuse/blocker is interpolated into {excuse} slots (§4.1).
 * The excuse is fair game, the person never (§3.1) — but the user could type
 * something that turns the line into a self-harm/identity attack, so it must
 * clear the same gate before use. Empty/whitespace excuses are unsafe (no slot
 * fill). Also caps length so a pasted essay can't blow up a notification.
 */
export function isSafeExcuse(excuse: string): boolean {
  const trimmed = excuse.trim();
  if (!trimmed || trimmed.length > 60) return false;
  return checkText(trimmed).safe;
}

/**
 * Kill switch (§9.3): flips all roast output to neutral copy without a deploy.
 * Reads `EXPO_PUBLIC_ROAST_KILL_SWITCH` (1/true). When on, RoastService skips
 * the pool entirely and returns a plain, safe reminder.
 */
export function roastKillSwitchOn(): boolean {
  const v = process.env.EXPO_PUBLIC_ROAST_KILL_SWITCH;
  return v === '1' || v === 'true';
}
