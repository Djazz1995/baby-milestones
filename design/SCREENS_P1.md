# Screen Specs — Baby Milestones (Phase 1)

Per-screen layout, content, states. Companion to [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) + [FLOWS.md](FLOWS.md). One tight block per screen. Order follows the build sequence (ARCHITECTURE §9).

Legend: **R** = regions top→bottom · **S** = states · **role** notes owner/viewer differences.

---

## 1. Welcome
**R:** Warm full-bleed paper bg · serif `title` one-line pitch ("The private place your family keeps a childhood") · `meta` privacy line ("Encrypted. EU-hosted. No public feed.") · primary "Get started" · text "I have an account".
**S:** static.

## 2. Sign in / Sign up
**R:** Back · `title` · email field · password field · primary "Continue" · toggle sign-in⇄sign-up · error inline.
**S:** idle · submitting (button spinner) · error (401 → "Wrong email or password"). No social sign-in Phase 1.

## 3. Create baby profile
**R:** `title` "Tell us about your baby" · **segmented toggle Expecting | Born** (branches form) · Expecting → due date picker · Born → birth date + weight (g) + length (cm) · **name field** (Expecting: labelled "Name or nickname · optional", with nickname suggestions Peanut/Bean/Little one; **Born: required**) · **gender** (optional, neutral: Girl / Boy / Surprise) · parent name(s) (add row) · **display format** picker · primary "Create".
**S:** idle · validation (Born requires name + birth date; Expecting requires only due date) · submitting. Owner-only path (new family). Design → mockups.html "Create baby · expecting".

## 4. Invite family (onboarding, optional)
**R:** `title` "Invite family" · `body` why (grandparents follow along) · email field + role pick (Owner/Viewer) · "Send invite" · **"Skip for now"** text.
**S:** idle · sent (confirm chip) · skippable.

## 5. Notification permission
**R:** soft illustration · `title` "Stay in the loop" · `body` benefit · primary "Enable" (triggers native) · "Not now".
**S:** pre-grant · granted → continue · denied → continue anyway.

---

## 6. Timeline / Home  ⭐ core
**R:** **Header** — baby chip (avatar + name + **AgeIndicator**, `display` serif: pregnancy ring or age) · gear (→ settings). **Feed** — reverse-chron `MomentCard` list, slow calm scroll (multi-media cards = swipe carousel with page dots + `n/total` chip; voice note = small glass mic + duration chip). **FAB** bottom-right (owner only).
- **Child switcher (Phase 2):** with >1 baby the header chip gets a chevron and taps open a switcher (list of children + "All children" combined feed + "Add a baby", owner). Selected child scopes the age indicator + timeline. With one baby the chip is static and taps → Baby profile. Design → mockups.html "Child switcher".
**S:** `loading` skeleton cards · `empty` warm panel "Add your first moment" + button (owner) / "No moments yet" (viewer) · `error` retry · `offline` cached + banner · pregnancy vs born header.
**role:** viewer = no FAB.

## 7. Add moment  ⭐ core
**No type picker** — one sheet; the moment's `type` is **derived from what you add**, not chosen. **R:** **media strip** — multi-select photos + videos (mixed; drag to reorder, per-item remove, add-more tile, video badge, first = cover) · **body/caption** field ("Write something… (or just a caption)") · **"Add a voice note"** row (optional spoken caption; record → waveform + timer → attached play/delete) · **attach milestone** (optional) · **date** confirm (default now) · primary "Post".
- **Type derivation:** media added → `media` moment · else voice note added → `voice` · else text only → `text`. A pure text moment = write, add nothing. Voice-only = just the voice note.
**S:** empty (add-media tile prominent) · capturing · uploading (progress, optimistic) · error (retry, keeps draft) · size over limit (413 → friendly "Video too large, max 200MB") · nothing added → Post disabled. Owner (+contributor Phase 2). Voice note → CMS `moments.voiceNote`; see DESIGN_SYSTEM "VoiceNote".

## 8. Moment detail  ⭐ core
**R:** Back · full-quality **media carousel** (swipe · page dots · **`n/total` count top-right** · milestone badge top-left · chevrons · **thumbnail strip** below; videos play inline) · **age-at-moment chip above the caption** · caption `body` · **voice-note player** (if `voiceNote` present — play + waveform + duration under the caption) · author avatar+name + capturedAt + **age-at-moment** `meta` · action row: **like** (heart) + count, **comment** + count · **comments thread** · comment composer (viewer + owner).
- **Age-at-moment** = `AgeService.compute(baby, capturedAt)` — the baby's age (or pregnancy week) *when the moment happened*, distinct from the header's today-age. Pre-birth → "N weeks pregnant". See DESIGN_SYSTEM "AgeAtMoment".
**S:** loading · loaded · liking (optimistic pop) · commenting · own moment → overflow menu **Delete** (owner) · 403 → "You don't have access". Media loads via signed `/api/media/file/...`.

## 9. Milestone tracker
**R:** `title` "Milestones" · checklist of 8 standard `MilestoneRow` (first smile → first word). Unlogged = outline + "not yet"; logged = sage check + linked date (→ that moment).
**S:** loading · list · logging → routes to Add moment with milestone prefilled · viewer = read-only (no log action).
**role:** viewer sees status, can't log. Design → mockups.html "Milestone tracker".

## 10. Baby profile
**R:** photo · name (or nickname / "Baby on the way" if unnamed) · **AgeIndicator** large · birth stats (weight/length, if born) · gender (if set) · parents · display-format quick switch. **Owner:** Edit · **"Baby has arrived"** button (if Expecting → record-birth sheet, which **captures the name** — required at birth). Unnamed pregnancy → avatar shows a **sprout glyph** instead of an initial.
**S:** pregnancy (shows due date + ring, arrival button) · born (shows age + stats) · editing · viewer = read-only, no edit/arrival. Design → mockups.html "Baby profile", "Record birth", "Pregnancy-state timeline", "Empty timeline", "Loading skeleton".

## 11. Family / members
**R:** `heading` "Family" · member rows (avatar + name + role pill) · pending invites section (`meta` "invited") · **Invite** button (owner). Row overflow (owner): change role · revoke (danger).
**S:** loading · list · empty (just you) · owner vs viewer (viewer = no invite/manage) · revoke confirm.

## 12. Comments
Surfaced inside Moment detail (§8). Standalone screen only if thread deep-linked. **R:** moment mini-header · thread · composer. **S:** loading · empty ("Be the first to comment") · posting · delete own (owner of comment).

## 13. Settings
Grouped list of white rounded cards, each group titled with a muted uppercase label. Design → mockups.html "Settings".
**R (groups):**
- **Baby** — Liam's profile → (edit baby, §10) · **Add a baby** (owner → Create-baby screen). _Multiple babies + child switcher: Phase 2._
- **Account** — name, email/change password, **Language NL|EN**, default display format, **Sign out**.
- **Notifications** — master push toggle · comments & likes toggle (per-type granularity).
- **Display** — **Simple mode (grandparent)** — **P1: row shows "soon" (disabled).** Legibility (large type + tap targets) is already baseline (see DESIGN_SYSTEM §6), so P1 needs no mode. **P2: manual toggle** (per device/user) → scales type ~1.3×, enlarges targets, simplifies the timeline to big photo cards + one large ♥, hides FAB/milestones/settings depth. _Dark mode: Phase 2._
- **Family** — **Members & roles** → §11 management (count shown).
- **Privacy & data** (GDPR, **P1 must-ship**) — Export all data · Delete account + baby (danger, double-confirm).
- **About** — About Baby Milestones · Privacy & terms · Support/contact · Version `meta`.
**role:** viewer sees a reduced set — no Family-manage, no Privacy delete/export of the family (own-account export only), no baby edit.
**S:** idle · saving toggle · export (in-progress → done) · delete = double-confirm irreversible · language switch re-renders copy live.

### 11b. Members management (owner)
Reached from Settings → Family (and the Family tab, §11). **R:** back · title · Members list (avatar + name + role + `⋮`) · a clear **"Invite member" button** below the list (owner-only, label not a bare `+`) · Pending invites (email + role + "pending", cancel). `⋮` on a member (owner only) → **Change role** · **Remove member** (danger confirm). Own row shows "you", no remove. Design → mockups.html "Members". Also reachable: Settings → Family group.
**S:** loading · list · owner (⋮ actions) vs viewer (read-only) · remove/role-change confirm · can't remove the last owner (guard).

---

## State checklist (all screens)
`loading` skeleton · `empty` warm prompt · `error` retry · `offline` banner · **role** affordances · **phase** pregnancy/born · `403` graceful.

## Build order (ARCHITECTURE §9)
A1 §3,10 → A2 §6,7 → A3 §8,12 → A4 §9 → A5 §4,11 → A6 §13 + i18n. Onboarding §1,2,5 wrap A1–A2.

_Foundation docs: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) · [FLOWS.md](FLOWS.md)._
