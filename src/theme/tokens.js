/**
 * brute design tokens — the ONE source of truth for color.
 *
 * Consumed two ways so a value is never written twice:
 *   1. tailwind.config.js `require()`s this and maps each key to a NativeWind
 *      color, so screens use classes like `bg-bg`, `text-muted`, `bg-accent-solid`.
 *   2. Shared components (`src/components`) import it for the handful of places
 *      that need a raw hex or an rgba tint (gradients, low-opacity status tints)
 *      that Tailwind classes can't express.
 *
 * Screens must never hardcode a hex — reference a token by name.
 */

const tokens = {
  bg: '#17131c', // app canvas
  surface: '#241d2b', // card level 1
  surface2: '#2e2539', // card level 2 / nested / chips
  rim: '#3d3348', // 1px hairline border on cards

  fg: '#ffffff', // primary text
  muted: '#9a94a6', // secondary text

  accent1: '#FFB020', // fire gradient start / streak numbers / active labels
  accent2: '#F5371F', // fire gradient end
  accentSolid: '#FB5A1E', // solid fire — buttons/CTAs (never a gradient button)
  accentText: '#1a1006', // dark text that sits on the solid-accent button

  // semantic — status only, rendered as solid label + low-opacity tint bg
  success: '#3ddc84', // Done
  info: '#4d8dff', // Due
  danger: '#ff5a5f', // Skipped
  off: '#6b6478', // Off / rest day
};

/** rgba() helper so status tints are defined from the same hex, once. */
function tint(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

module.exports = { tokens, tint };
