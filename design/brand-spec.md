# brute — brand spec

Bold, punchy, mean-but-funny habit tracker. Dark mode only. Screenshottable.

## Color tokens

```css
:root {
  --bg:        #17131c; /* app canvas */
  --surface:   #241d2b; /* card level 1 */
  --surface-2: #2e2539; /* card level 2 / nested / chips */
  --rim:       #3d3348; /* 1px hairline border on cards */

  --fg:        #ffffff; /* primary text */
  --muted:     #9a94a6; /* secondary text */

  --accent-1:  #FFB020; /* fire gradient start */
  --accent-2:  #F5371F; /* fire gradient end */
  --accent-gradient: linear-gradient(135deg, var(--accent-1), var(--accent-2));

  /* semantic — status only, used at low-opacity tints */
  --success:   #3ddc84; /* Done */
  --info:      #4d8dff; /* Due today */
  --danger:    #ff5a5f; /* Skipped */
  --off:       #6b6478; /* Off / rest day */
}
```

Accent usage — keep it a scalpel:
- **Buttons / CTAs → solid `--accent-solid` (#FB5A1E)** with dark text. No gradient on buttons.
- **Gradient (`--accent-gradient`) is reserved for two things only:** the flame/logo icon, and live progress-bar fills. Never on buttons, never as text (`background-clip: text` is banned).
- Everything else that needs the accent (streak numbers, active nav label, highlighted words) → **solid `--accent-1`**.

Display/wordmark font: **Bricolage Grotesque** (600/700/800). Not Space Grotesk (an overused AI-UI default). Body/UI stays system sans.

## Type

- Display / wordmark / section headers: `'Space Grotesk', -apple-system, 'Segoe UI', sans-serif` — weight 600–700, tight tracking (-0.02em at 28px+).
- Body / UI: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif` — weight 400 body, 510 labels, 600 emphasis.
- Category chip / status badge labels: uppercase, 11px, `letter-spacing: 0.08em`.

## Shape

- Card radius: 20px. Chip/badge radius: full (pill). Button radius: 16px (pill for primary CTA).
- Card border: 1px solid `--rim`.
- No shadows on cards (flat dark UI) — depth comes from surface-level steps (bg → surface → surface-2), not elevation blur.

## Logo mark

Speech bubble outline, flame shape inside, fire-gradient fill. "The roast IS a notification."

## Component mapping (gluestack-ui v3 / NativeWind)

- `.vstack` → `<VStack>` (flex column)
- `.hstack` → `<HStack>` (flex row, align-center)
- `.box` → `<Box>`
- `.pressable` → `<Pressable>`
- `.text` variants → `<Text>` with token-driven className (`text-fg`, `text-muted`, `text-accent`)

Tailwind/NativeWind token names should map 1:1 to the CSS custom properties above (e.g. `bg-surface`, `border-rim`, `text-muted`, `bg-gradient-accent`).
