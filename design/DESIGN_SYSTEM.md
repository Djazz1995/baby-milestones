# Design System — Baby Milestones

**Direction:** Calm minimal, **rounded & soft**. The private, unhurried opposite of a social feed. Crisp white cards floating on a soft light canvas, a single calm teal-green accent, big rounded corners, gentle shadows, generous whitespace, large legible type (grandparent-friendly is a Phase-1 constraint, not a Phase-2 mode). Clean and tender — like a well-made health/care app, not a busy feed.

> Reference: soft-rounded card UI (heavy corner radius, white cards on a light green-grey canvas, pill search fields, rounded primary + pale-tint secondary buttons, soft shadows).

> Tokens map to the **gluestack-ui v3 token scale** consumed via NativeWind classes. No hardcoded hex in components — recolor = one token swap. Hex below defines the token values only.

---

## 1. Color

Soft light green-grey canvas, white cards, dark green-charcoal text, a single calm teal-green accent. Nothing pure-black.

| Token | Light | Role |
|---|---|---|
| `background` | `#F1F5F4` | app canvas (soft green-grey, faint tint) |
| `surface` | `#FFFFFF` | cards, sheets |
| `surfaceMuted` | `#E8F0ED` | inset fields, empty states, secondary tint |
| `border` | `#E3EAE7` | hairlines, dividers |
| `textPrimary` | `#1C2B27` | headings, body (green-charcoal) |
| `textSecondary` | `#6B7B76` | meta, captions, timestamps |
| `accent` | `#0F766E` | teal-green — primary actions, FAB, active |
| `accentDark` | `#0B5C55` | pressed / active-dark |
| `accentSoft` | `#D3E6E1` | accent tint — secondary buttons, badges, selected chips |
| `success` | `#0F766E` | confirmations (same green family) |
| `danger` | `#C2564B` | destructive (delete, revoke) |
| `like` | `#E5735F` | filled heart (soft coral — pops off the green) |

**Dark mode** is Phase 2 — design light-first but keep every color a token so the dark set drops in later.

Accent is used with intent: primary action per screen, the FAB, active states, selected calendar days. The calm comes from whitespace + soft canvas, not from coloring everything green. **Secondary buttons** use `accentSoft` fill with accent text (the reference "View Details" style).

---

## 2. Typography

Two families. A warm humanist serif for identity moments (baby name, age indicator, recap headings), a clean sans for everything functional. Large sizes — comfortable for tired parents and older eyes.

| Token | Size / Line | Weight | Family | Use |
|---|---|---|---|---|
| `display` | 32 / 38 | 600 | serif | baby name, age indicator on Timeline header |
| `title` | 24 / 30 | 600 | serif | screen titles, welcome card |
| `heading` | 19 / 26 | 600 | sans | section headers, moment author |
| `body` | 17 / 25 | 400 | sans | captions, comments, body text |
| `label` | 15 / 20 | 500 | sans | buttons, chips, field labels |
| `meta` | 13 / 18 | 400 | sans | timestamps, counts, hints |

- **Serif:** a warm option (e.g. *Fraunces* / *Newsreader*) for name + age only — the emotional anchors.
- **Sans:** system-adjacent (*Inter* / SF) for legibility and zero-load.
- Body never below 17 — readability is a product value.

---

## 3. Spacing & shape

Rounding is a defining trait — everything is soft-cornered, matching the reference.

- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 32, 48. Screen gutter = 20. Card padding = 16–20.
- **Radius:** `sm` 12 (small chips, inner tiles), `md` 18 (buttons), `lg` 24 (cards), `xl` 28 (sheets, media, hero cards), `full` (avatars, FAB, search field, pills). Default to generous — when unsure, round more.
- **Search field:** fully rounded pill (`full`), `surface` fill, leading search icon, trailing filter icon.
- **Buttons:** rounded-rect `md` (18). Primary = `accent` fill; secondary = `accentSoft` fill + accent text (reference "View Details"). FAB + avatars = `full`.
- **Elevation:** soft, not flat. Cards float on `background` with a **gentle diffuse shadow** (low opacity, large blur, small y-offset — e.g. `0 8 24 rgba(28,43,39,0.06)`) + optional hairline `border`. Stronger soft shadow on FAB + bottom sheets. Never hard/dark drop shadows.
- **Density:** airy. One moment card fills most of the viewport width with breathing room; the timeline scrolls slow and calm, not dense.

---

## 4. Core components

| Component | Spec |
|---|---|
| **AgeIndicator** | The signature element. `display` serif, `textPrimary`. **Pregnancy** = a merged header block: "Baby on the way" (or name) / "22 weeks pregnant" / "Due 3 December 2026" + soft teal progress ring around the avatar (no separate countdown card — 40 weeks is understood). **Born** = "8 months old". Sits in Timeline header (= **today's** age) + Baby profile. Derived via `AgeService.compute(baby, today)`. |
| **AgeAtMoment** | Every moment shows the age **at the time it was captured** — `AgeService.compute(baby, moment.capturedAt)`, same function, different date. Pre-birth capturedAt → "22 weeks pregnant"; after → "3 months old" (respects `displayFormat`). **Always an `accentSoft` chip above the caption** — same spot for media and text moments (consistent). The media's **top-right corner holds the multi-media `n/total` count** instead; milestone badge stays top-left. Derived, never stored. |
| **SearchField** | `full` pill, `surface` fill, soft shadow, leading search icon + trailing filter icon. Reference style. |
| **MomentCard** | `surface`, radius `lg` (24), soft shadow. Media edge-to-edge top (a **MediaCarousel** when >1); caption `body`; footer row = author avatar + name (`meta`) + relative date + **AgeAtMoment** + like + comment count. Milestone → `accentSoft` badge pill top-left over media; **`n/total` count chip top-right**; **AgeAtMoment chip above the caption**; multi-media → page dots; voice → mic chip. |
| **MediaCarousel** | A moment holds an **ordered `media[]`** (images + videos, mixed). Swipeable horizontally **on the card and in detail** — page dots (bottom-center), a glass `n/total` count chip, videos show a play badge. Detail adds faint left/right chevrons + a **thumbnail strip** below (active = teal ring). First item = cover. Calm: no auto-advance. |
| **VoiceNote** | A spoken caption that can pair with a **photo/video** moment (CMS `moments.voiceNote`), or stand alone as a Voice moment. **Recorder** (Add-moment): `accentSoft` bordered row "Add a voice note" → tap to record → live waveform + timer → **stop** → attached state = play button + waveform + duration + delete. **Player** (Moment detail): teal play button + waveform + `mm:ss` in an `accentSoft` bar under the caption. **Card indicator:** small glass mic + duration chip on the media (bottom-left). Audio via `expo-audio`. |
| **Measurements / GrowthChip** | A moment can carry optional **weight + length** (`moments.weightGrams` / `lengthCm`). **Input** (Add-moment): `accentSoft` bordered "Add measurements" row → two small fields (weight, length). **GrowthChip** (card/detail): `accentSoft`-outline pill "6.2 kg · 64 cm" with a ruler icon, next to the age chip. Feeds the **GrowthChart** (Phase 3): a teal line chart derived from all moments with measurements + birth stats — toggle weight/length. |
| **FAB** | `accent` circle, `full` radius, soft shadow, `+`. Bottom-right, floats **above the glass tab bar**. Opens Add-moment type picker. (iOS-purists may prefer a nav-bar `+`; FAB kept for thumb-reach — see §5b.) |
| **TabBar** | **Liquid-glass** floating bar (see §5b), 3 tabs: Timeline / Milestones / Family. Active = `accent` icon+label, inactive = muted. Rounded, translucent, blurred. |
| **NavBar (pushed)** | Native iOS stack nav bar: **back = chevron + previous-screen title in `accent` tint** (left), centered title, optional right action. Translucent/blurred. Tab bar hidden while pushed. |
| **Button** | Primary: `accent` fill, white text, radius `md` (18), `label`. Secondary: `accentSoft` fill + accent text (reference "View Details"). Text-only: accent label, no fill. Min height 52 (thumb-friendly). |
| **Chip** | Pill (`full`), `surfaceMuted` default → `accentSoft` + accent text when selected. Used for milestone select, filters, role/format toggles. (No moment **type picker** — moment `type` is derived from content: media → `media`, else voice note → `voice`, else `text`. See Add-moment, SCREENS §7.) |
| **Avatar** | `full` circle. Fallback = initials on `accentSoft`. **Unnamed pregnancy** (no name/nickname yet) → a **sprout glyph** on `accentSoft` instead of an initial. Never gendered — no pink/blue, no boy/girl imagery; gender (if recorded) changes nothing visually. |
| **MilestoneRow** | Checklist item. Unlogged: outline circle + label + `meta` "not yet". Logged: filled `accent` check + label + linked date. |
| **Comment** | Avatar + name `label` + `meta` time on one line, `body` text below. Threaded indent 32. |
| **EmptyState** | `surfaceMuted` panel, soft line illustration, `title` prompt + one primary button. Warm, never a dead grey box. |
| **BottomSheet** | Radius `lg` top corners, `surface`, drag handle, soft backdrop. Used for add-moment, type pick, confirm dialogs. |

---

## 5b. iOS-native chrome (platform target: iOS-first)

Lean on native iOS as much as possible — the custom design lives *inside* the screens; the chrome is Apple's.

- **Tab bar = liquid glass.** Use **`expo-glass-effect`** (`GlassView`) for the bottom tab bar — real iOS translucency/blur, not a faux panel. Floating rounded bar, `background` shows through. 3 tabs: Timeline / Milestones / Family. Active tint = `accent`. (Settings + Baby profile reached from the Timeline header, not a tab; Add = FAB.)
- **Navigation = native stack.** Use expo-router's **native stack** so pushed screens get the real iOS nav bar + **native back button** (chevron + previous-screen title, `accent` tint) and the **interactive swipe-back** gesture for free — don't hand-roll a back chevron.
- **Tab bar hides on push.** Pushed screens (Moment detail, Settings, Members, Add/Create) hide the tab bar, iOS-standard.
- **Large titles** where they fit (Settings, Milestones) — native large-title nav that collapses on scroll.
- **Sheets** = native sheet presentation (detents, grabber) for Add-moment / pickers.
- **FAB caveat:** a FAB is more Material than iOS. Kept for one-thumb capture reach; if we want stricter iOS, move Add to a nav-bar `+`. Open to either — flagged, not locked.
- **Android later:** the same RN components fall back to Material chrome (elevation tab bar, Material back). iOS is the P1 design target; Android inherits.

Design reference: mockups.html "Timeline · liquid-glass tab bar" + the native-back pushed screens.

---

## 5. Motion & tone

- Transitions **gentle** — 200–260ms ease-out. Screen pushes slide, sheets rise, likes do a small scale-pop. No bounce, no flash.
- Copy is **warm and plain**, in the active locale (nl/en). "Welcome to the world, Liam." not "Birth event recorded." Never clinical.
- Loading = soft skeleton cards on the paper background, not spinners.

---

## 6. Accessibility (Phase-1 requirement)

- Min tap target 44×44; buttons 52 tall.
- Body ≥ 17; supports OS dynamic type scaling.
- Text/background contrast ≥ 4.5:1 (`textPrimary` on `background` passes; `textSecondary` reserved for non-essential meta).
- Every icon-only control has an accessibility label. Media has `alt`.

**Grandparent legibility is baseline, not a mode.** The large-type scale + tap targets + dynamic-type support above make the app readable for older eyes in P1 without any toggle. A dedicated **Simple mode** (type ~1.3×, simplified timeline, hidden depth) is a **Phase-2 manual toggle** in Settings — see SCREENS_P1 §13. P1 ships the row as "soon".

_Companion: [FLOWS.md](FLOWS.md), [SCREENS_P1.md](SCREENS_P1.md). Foundation for both._
