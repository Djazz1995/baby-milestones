# Flows & Navigation — Baby Milestones (Phase 1)

Companion to [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [SCREENS_P1.md](SCREENS_P1.md). Maps how the Phase-1 screens connect. Routes mirror ARCHITECTURE §8 (expo-router).

---

## 1. Navigation model

**Session gate** at root: no token → Auth stack. Token → App (tab) stack.

**Bottom tab bar** — **liquid-glass** (iOS, via `expo-glass-effect`), 3 tabs, calm icons + label:

```
[ Timeline ]   [ Milestones ]   [ Family ]
```

- **Native stack navigation** (expo-router native stack): pushed screens get the real iOS **back button** (chevron + previous title, accent tint) + swipe-back, and **hide the tab bar** while pushed. iOS-first; Android inherits Material chrome. See DESIGN_SYSTEM §5b.
- **Baby profile** + **Settings** reached from the Timeline header (avatar/chip tap → profile, gear → settings), not a tab — keeps the bar to 3.
- **Add moment** is the FAB on Timeline, not a tab — it's an action, not a place.
- **Child switcher** (multi-baby) is Phase 2 → for Phase 1 the header shows the single active baby.

```
Root (_layout: session gate)
├─ Auth stack (no token)
│   Welcome → Sign in / Sign up → [Onboarding if no baby]
└─ App tabs (token present)
    ├─ Timeline (index)        ── FAB → Add moment ── card → Moment detail
    │     header: avatar → Baby profile · gear → Settings
    ├─ Milestones              ── log → Add moment (milestone prefilled)
    └─ Family                  ── invite → Invite sheet
```

---

## 2. First-run flow (onboarding)

```
Welcome ─(value prop, privacy line)→ Sign up / Sign in
   │
   ├─ existing member (invited) → token → has baby via family → Timeline
   └─ new owner, no baby → Create baby profile
                                │  toggle: Expecting | Born
                                │  Expecting → dueDate
                                │  Born → birthDate + weight + length
                                │  + parent name(s) + display format
                                ▼
                         Invite family (optional, skippable)
                                ▼
                         Notification permission (native, skippable)
                                ▼
                            Timeline (empty state → "Add first moment")
```

Decision points: **Expecting vs Born** branches the profile form and sets the initial AgeIndicator (pregnancy ring vs age). Invite + notifications both **skippable** — never block reaching the timeline.

---

## 3. Core loop — capture → timeline → react

The product's whole reason to exist. Must feel fast.

```
Timeline ─FAB→ Type picker (Photo · Video · Voice · Text)
   │
   ├ Photo/Video → camera or library → preview
   ├ Voice       → record → playback
   └ Text        → write
        │
        ▼
   Add moment: caption + (optional) attach milestone + confirm date
        │  Post
        ▼   [upload media → create moment]   (optimistic card + skeleton while uploading)
   Timeline (new card on top)
        │ tap
        ▼
   Moment detail: full media, caption, author, milestone badge
        ├ like (heart pop, count++)
        └ comment → thread updates
```

Roles: **Owner** sees FAB + can delete own moments. **Viewer** — no FAB; can like + comment only. Affordances hidden by role, but server is the boundary (handle 403 gracefully).

---

## 4. Birth transition flow (pregnancy → born)

The signature moment. Owner-only. Uses the custom `record-birth` endpoint (atomic: sets fields **and** creates the welcome moment).

**Two entry points to the record-birth sheet** (owner, pregnancy only):
1. **Baby profile → "Baby has arrived" button** (primary, always available) — reach the profile by tapping the header baby chip on the pregnancy timeline.
2. **Pregnancy timeline → "Baby has arrived? · Record the birth" shortcut** (an accentSoft row below the header; surfaced as the due date nears so it isn't nagging at 22 weeks).

```
Pregnancy timeline ──tap baby chip──▶ Baby profile (Expecting, pregnancy ring)
        │  "Baby has arrived?" shortcut          │  "Baby has arrived" button
        └──────────────┬─────────────────────────┘
                       ▼
   Record birth sheet: name (required if unnamed) + birthDate + weight + length
                       │ Confirm  → POST /babies/:id/record-birth
                       ▼
   Timeline: auto "Welcome to the world, {name}." card at top (celebratory)
   Header AgeIndicator flips pregnancy ring → age ("0 weeks old")
```

Never a plain profile edit — always the endpoint, so the welcome card is created server-side in the caller's locale.

---

## 5. Family & invite flow

```
Family / members (tab, or Settings → Family): members list (avatar + name + role) · pending invites
   │ (owner) taps the "Invite member" button below the list  ← explicit label, not a bare +
   ▼
Invite sheet: email + role (Owner | Viewer)  → creates invite
   ▼
Invitee receives link → opens app → Sign in → accept (token) → becomes member → Timeline

Owner also: ⋮ on a member → change role · remove (danger confirm; can't remove the last owner)
Viewer: read-only member list, no invite button
```

---

## 5b. Multiple babies (Phase 2)

A family can hold several children (CMS `babies` is already 1-family→many). One timeline is shown at a time, scoped to the **active baby**.

```
Timeline header baby chip (chevron) → Child switcher
   ├ pick a child        → age indicator + timeline follow that child
   ├ "All children"      → combined feed, each card tagged with the baby (optional view)
   └ (owner) "Add a baby" → Create-baby screen (onboarding step 3, minus family create) → new baby, switch to it

Add a baby also from: Settings → Baby → "Add a baby" (owner).
```

Phase 1 ships single-baby: the header chip is static (tap → Baby profile), no switcher. The switcher + "All children" + add-baby land in Phase 2 with the child-switcher feature.

---

## 6. Settings / GDPR flow

```
Timeline header gear → Settings
   ├ Account (email, sign out)
   ├ Language: NL | EN
   ├ Default display format: weeks | months | years+months
   ├ Notifications toggle
   └ Privacy & data
        ├ Export all data   (GDPR — server fulfills)
        └ Delete account + child   (danger, double-confirm)
```

---

## 7. Deep links (notification taps → destination)

| Notification | Lands on |
|---|---|
| New comment / like on your moment | Moment detail (scrolled to thread) |
| New moment posted | Moment detail |
| Family invite accepted | Family tab |

Root layout routes the deep link **after** the session gate — unauthenticated taps go through sign-in first, then continue to target.

---

## 8. State coverage (every screen must handle)

`loading` (skeletons) · `empty` (warm prompt) · `error` (retry) · `offline` (cached + banner) · **role** (owner vs viewer affordances) · **phase** (pregnancy vs born) · `403` (graceful, not a crash).

_Next: [SCREENS_P1.md](SCREENS_P1.md) — per-screen layout + states._
