# Build Plan — Baby Milestones (App)

Phased frontend plan for the RN/Expo client. Companion to [PRD.md](PRD.md), [ARCHITECTURE.md](ARCHITECTURE.md), [CMS_INTEGRATION.md](CMS_INTEGRATION.md), and the design set in [design/](design/) (DESIGN_SYSTEM · SCREENS_P1 · FLOWS · ONBOARDING). **Synced to the CMS build plan** (`baby-milestones-cms/docs/BUILD_PLAN.md`) — each app phase names the CMS phase (B0–B6) it consumes.

Legend: `[x]` done · `[~]` in progress · `[ ]` todo.

---

## Where we are

- **Design:** complete (tokens, 30+ mockups, flows, screen specs, onboarding).
- **CMS:** B0–B3 done + verified; **B4 GDPR endpoints (export + delete-account) built**; register + onboarding + record-birth endpoints live; multi-media / measurements / gender schema shipped (migration `20260716_182619` **pending apply**). The Phase-1 backend is **complete for app build**.
- **App:** still the **RoastMode scaffold** — dark-fire theme, Bricolage font, gluestack-ui v3 primitives present, `expo-router` + `expo-secure-store` + `expo-glass-effect` + `expo-notifications` installed. **No** services / lib(payload) / models / hooks yet; `src/models/index.ts` is an empty barrel; only 2 routes (`index`, `_layout`).

### Prerequisites before wiring live (one-time)
1. Commit design + CMS work (both repos on `main`, uncommitted).
2. CMS: `pnpm migrate` (apply `20260716_182619`) + `pnpm seed` on a clean DB.
3. CMS running: Docker (Postgres 5433 + MinIO) + `pnpm dev` on `:3000`.
4. App env: `EXPO_PUBLIC_PAYLOAD_API_URL` → `http://localhost:3000` (device/simulator → host **LAN IP**, not `localhost`).

### ✅ Doc drift resolved (2026-07-16)
- **ImageKit → Hetzner S3 signed proxy.** The CMS delivers media via **Hetzner Object Storage + a signed `/api/media/file/...` proxy** (302 → ~2h presigned URL; `CMS_INTEGRATION.md` §7). The app has **no ImageKit** dependency: `lib/media.ts` builds signed-proxy URLs + picks a `sizes` variant (thumbnail/card/full). Corrected across `ARCHITECTURE.md` (intro, §2, §4 `Media`, §4 services, §5 `media.ts`, §7, §9), `PRD.md`, `README.md`. Also fixed in PRD: auth = **Payload JWT** (was "Supabase auth"), recaps run on a **Payload job/cron** (was "Edge Function").

---

## Conventions

**Per-screen loop** (ARCHITECTURE §9, mirrors the CMS per-collection loop):

1. **Data spine** — `models → lib → services (+ mappers) → hook`. Build bottom-up, no UI yet.
2. **Design** — read the screen spec (SCREENS_P1) + mockup; confirm tokens/components.
3. **UI** — RN on gluestack v3 + NativeWind **tokens** (no hardcoded hex). Reuse shared components.
4. **States** — every screen handles all seven: `loading` (skeleton) · `empty` (warm prompt) · `error` (retry) · `offline` (cached + banner) · **role** (owner/viewer) · **phase** (pregnancy/born) · `403` (graceful).
5. **Verify** — run it; drive the flow against the live CMS; check every state.
6. **Security review** — anything touching auth / access / media / personal data.

**Rules that always hold** (ARCHITECTURE §10):
- Layered `screens → hooks → services → lib`; **models only** above the service layer (no Payload doc shapes / field names in screens).
- Services own all I/O + doc→model mapping and **throw**; hooks **catch** + hold loading/error.
- Payload access control is the boundary — never trust the client; scope every read; handle 403s.
- Tokens not hex; recolor = one swap. Age display **derived, never stored**.
- Auth: `Authorization: JWT <token>` (**not** Bearer); token in `expo-secure-store`.
- Media: upload → attach → deliver via signed `/api/media/file/...` (follow 302 redirects).

---

## Phase A0 — Reskin + foundation

*Goal: kill the RoastMode scaffold, stand up the light-teal design system + the data spine. No product screens yet.* **CMS: B0–B3 (done).**

### A0.1 — Theme reskin (dark-fire → light-teal)
- [ ] `src/theme/tokens.js` — replace fire palette with DESIGN_SYSTEM §1 tokens: `background #F1F5F4`, `surface #FFFFFF`, `surfaceMuted #E8F0ED`, `border #E3EAE7`, `textPrimary #1C2B27`, `textSecondary #6B7B76`, `accent #0F766E`, `accentDark #0B5C55`, `accentSoft #D3E6E1`, `danger #C2564B`, `like #E5735F`. Keep `tint()` helper.
- [ ] `tailwind.config.js` — remap NativeWind color keys to the new token names (`bg`, `surface`, `accent`, `accent-soft`, `like`…). Radius scale: sm 12 / md 18 / lg 24 / xl 28 / full.
- [ ] `src/theme/fonts.ts` — **Bricolage → Fraunces (serif, display/title only) + Inter (sans, everything else)**. Add `.ttf`s to `assets/fonts`; register in root layout. Type scale = DESIGN_SYSTEM §2 (`display` 32 serif, `title` 24 serif, `heading` 19 sans, `body` 17 sans, `label` 15, `meta` 13). Body never < 17.
- [ ] gluestack config (`components/ui/gluestack-ui-provider/config.ts`) → light token set.
- [ ] `src/app/_layout.tsx` — drop `mode="dark"`, `navTheme.dark:false`, light nav colors, serif title font.
- [ ] `app.json` — splash bg `#F1F5F4` (set), `userInterfaceStyle: light` (set). Verify.
- [ ] Strip RoastMode leftovers (`constants/theme.ts` fire refs, `use-color-scheme` dark assumptions, demo copy in `index.tsx`).

### A0.2 — Data spine (lib + models + session)
- [ ] `src/lib/payload.ts` — typed `fetch` wrapper: base from `EXPO_PUBLIC_PAYLOAD_API_URL`, attaches `Authorization: JWT <token>`, GET/POST/PATCH/DELETE, multipart for uploads, follows redirects, maps `{errors}` → thrown error. The **only** module that knows the API shape.
- [ ] `src/lib/auth.ts` — login / me / refresh; token persisted via `expo-secure-store`.
- [ ] `src/lib/media.ts` — signed-proxy URL builder (`/api/media/file/:filename` + size variants). **No ImageKit.**
- [ ] `src/models/` — all Phase-1 models (ARCHITECTURE §3): `Baby`, `AgeDisplay`, `DisplayFormat`, `Moment`, `MomentType`, `Media`, `Milestone`, `Family`, `Membership`, `Reaction`, `Comment`, `User`, `Paginated<T>`, `NotificationPayload`. Pure types, no I/O.
- [ ] `src/services/mappers/` — base pure translators: `toUser`, `toBaby`, `toMedia` (resolve signed URLs + pick `sizes`). Payload generated types live **inside** mappers only.
- [ ] `src/services/session-service.ts` — `register`, `signIn`, `signOut`, `ensureSession` (register + login → CMS `register`/`login`).
- [ ] `scoped()` read helper (defense-in-depth family filter).

### A0.3 — App shell: session gate + navigation (the "footers")
- [ ] `src/app/_layout.tsx` root **session gate** (ONBOARDING §1): token? → `GET /users/me` → resolve destination (0 memberships → onboarding; member + baby → tabs; member no baby → onboarding). Three stacks: **auth** / **onboarding** / **tabs**.
- [ ] **Tab bar** — liquid-glass (`expo-glass-effect` `GlassView`), 3 tabs: **Timeline · Milestones · Family** (DESIGN_SYSTEM §5b). Active tint `accent`. Floating rounded, tab bar **hides on push**.
- [ ] **Native stack** nav bars for pushed screens (chevron + prev title, `accent` tint, swipe-back) — don't hand-roll back.
- [ ] Placeholder tab screens so nav is walkable end-to-end.
- [ ] `useSession` / `useUser` hooks.

**Done when:** app boots light-teal, the session gate routes correctly (no token → Welcome placeholder; token → tabs), the glass tab bar + native back work, and `lib/payload` round-trips an authed `GET /users/me` against the live CMS.

---

## Phase A1 — Auth, onboarding & baby profile

*Goal: a family can sign up, create a baby (pregnancy or born), see the live age indicator, and record birth.* **CMS: `register`, `login`, `onboarding`, `babies`, `record-birth`.**

### A1.1 — Baby + age spine
- [ ] `AgeService.compute(baby, atDate) → AgeDisplay` — **pure**, no I/O. Pregnancy weeks (40 − weeks-to-due) pre-birth; age (weeks/months/years+months per `displayFormat`) after. Timezone-safe (calendar dates). Fed `today` for the header, `capturedAt` for age-at-moment.
- [ ] `BabyService` — `get`, `create` (via `onboarding` for first baby, `POST /babies` for additional), `update`, `recordBirth(id,{date,name?,weight,length}) → Baby` (custom endpoint; server creates the welcome moment).
- [ ] `useBaby`, hooks over the above.
- [ ] **AgeIndicator** component (DESIGN_SYSTEM §4) — pregnancy merged block ("Baby on the way / 22 weeks pregnant / Due …" + progress ring) vs born ("8 months old"). Serif `display`.

### A1.2 — Onboarding + auth screens (SCREENS §1–5, FLOWS §2, ONBOARDING)
- [ ] **Welcome** (§1) — serif pitch + privacy line, "Get started" / "I have an account".
- [ ] **Sign in / Sign up** (§2) — one screen, toggle. Sign-up: email + password + name. `409` → "already registered". Store token → run gate.
- [ ] **Create baby profile** (§3) ⭐ — segmented **Expecting | Born** branch; Expecting → due date (name optional, nickname suggestions); Born → birth date + weight + length + name **required**; **gender** (Girl/Boy/Surprise, neutral); parent name(s); display format; (new-owner) family name prefilled. → `POST /onboarding`.
- [ ] **Invite family** (§4) — email + role, "Send invite", **Skip for now** (skippable).
- [ ] **Notification permission** (§5) — native prompt, "Enable" / "Not now" (skippable).
- [ ] Onboarding dots (3 of 3); gate re-runs on cold start.

### A1.3 — Baby profile + birth transition (SCREENS §10, FLOWS §4)
- [ ] **Baby profile** (§10) — photo, name (or "Baby on the way" + sprout avatar if unnamed), large AgeIndicator, birth stats, gender, parents, display-format quick switch. Owner: Edit + **"Baby has arrived"**.
- [ ] **Record-birth sheet** — name (required if unnamed) + birthDate + weight + length → `record-birth` endpoint → welcome card appears + header flips pregnancy→age. Two entry points (profile button + pregnancy-timeline shortcut).

**Done when:** sign-up → create baby → profile with live age works end-to-end against the CMS; record-birth flips pregnancy→born and creates the welcome moment. Covers loading/validation/submitting/error/offline + pregnancy-vs-born.

---

## Phase A2 — The core loop ⭐

*Goal: capture → timeline → react/comment. The product exists.* **CMS: `moments` (multi-media/voice/measurements), `media`, `reactions`, `comments`.**

### A2.1 — Timeline (SCREENS §6, FLOWS §3)
- [ ] `MomentService.list(babyId, cursor) → Paginated<Moment>` (`sort=-capturedAt`, counts from join `totalDocs`), `get`, `delete`. `toMoment` mapper (derive type, resolve media, milestoneId reverse-lookup, reaction/comment counts).
- [ ] `useTimeline`, `useMoment`.
- [ ] **Timeline / Home** — header (baby chip + AgeIndicator, gear→settings), reverse-chron feed, FAB (owner). **FAB vs empty CTA mutually exclusive**: populated → FAB only; empty → CTA only. Pregnancy empty = countdown + "Start the story early"; born empty = "Start {name}'s story".
- [ ] **MomentCard** + **MediaCarousel** (swipe, page dots, `n/total` chip, video badge) + **AgeAtMoment** chip (above caption) + **VoiceNote** mic indicator + **GrowthChip**.
- [ ] States: skeleton / empty / error / offline / role (viewer no FAB) / pregnancy-vs-born.

### A2.2 — Add moment (SCREENS §7)
- [ ] `MediaService.upload(file) → Media` (multipart `POST /api/media`; progress; 413 friendly). `expo-image-picker` / `expo-camera` / `expo-audio` (verify vs Expo SDK 54 docs; confirm the perm strings fire).
- [ ] `MomentService.create(input)` — upload media → collect ids → create moment with ordered `media[]` (+ optional `voiceNote`, `weightGrams`/`lengthCm`, milestone). **Don't send `type`** (derived server-side).
- [ ] **Add moment** — **no type picker**; media strip (multi-select, reorder, cover) + caption + "Add a voice note" (record→waveform) + "Add measurements" (inline weight/length) + attach milestone + date. Post disabled until something added. Optimistic card + upload progress.

### A2.3 — Moment detail + social (SCREENS §8, §12)
- [ ] `ReactionService.like/unlike` (unlike = delete row), `CommentService.list/add/delete`. `useReactions`, `useComments`.
- [ ] **Moment detail** — full media carousel (chevrons + thumbnail strip, inline video), age-at-moment + growth chip above caption, voice-note player, author/date meta, like (optimistic pop) + count, comments thread + composer (viewer + owner). Own moment → overflow Delete (owner); others' → overflow **Report** (UGC 1.2). 403 graceful.

**Done when:** an owner captures a multi-media/voice/text moment (optionally with measurements), it lands on the timeline, and family can like + comment — all live against the CMS. This is the demoable slice.

---

## Phase A3 — Milestones + family

*Goal: a real family can use it privately.* **CMS: `milestones`, `invites`, `memberships`, `accept-invite`.**

### A3.1 — Milestone tracker (SCREENS §9)
- [ ] `MilestoneService.list(babyId) → Milestone[]`, `log(babyId, key, moment)`. `useMilestones`.
- [ ] **Milestone tracker** — 8 standard `MilestoneRow` (unlogged outline / logged sage-check + linked date). Log → routes to Add moment with milestone prefilled. Viewer read-only.

### A3.2 — Family & invites (SCREENS §11/11b, FLOWS §5)
- [ ] `FamilyService.members / invite / setRole / revoke`. `useFamily`.
- [ ] **Family / members** — member rows + role pills, pending invites, **Invite member** button (owner, explicit label). Owner ⋮ → change role / remove (danger; can't remove last owner).
- [ ] **Invite sheet** — email + role (Owner/Viewer) → creates invite.
- [ ] **Accept invite** — deep link → sign-in → `POST /invites/accept {token}` → member → Timeline. Handle `409`/`403`.

**Done when:** an owner invites a viewer, the viewer accepts and sees the timeline (read + like + comment, no post), and milestones log/link to moments. Role affordances verified both sides.

---

## Phase A4 — Settings, i18n & compliance (launch-legal)

*Goal: App Store / Play submittable.* **CMS: B4 (`export`, `delete-account`), localization.**

### A4.1 — Settings (SCREENS §13)
- [ ] `UserService.getUser / updateDefaults`. `useUser`.
- [ ] **Settings** — grouped cards: Baby (profile, add-baby) · Account (name, email/password, Language, default display format, Sign out) · Notifications (master + per-type) · Display (Simple mode row = "soon", disabled — P1) · Family (Members & roles) · About.

### A4.2 — i18n (nl/en)
- [ ] i18n framework + nl/en string tables for **all** copy, dates, age/pregnancy strings. Language picker screen (Nederlands / English). `?locale=` on CMS reads (milestone labels). Live re-render on switch.

### A4.3 — Privacy & data + UGC (GDPR + App Store, must-ship)
- [ ] **Privacy & data screen** — **Export my data** (`GET /users/export` → save/share) · **Delete account** (danger zone, role-aware double-confirm sheet + checkbox: sole-owner "erases the whole archive" vs co-owner "your content stays, anonymized") → `POST /users/delete-account`. Privacy policy + Terms links.
- [ ] **Report content** flow (moment/comment overflow → reason → owner + support) — UGC 1.2.
- [ ] Notification deep-link routing (`notifications.ts` → moment/comment/invite; FLOWS §7).

### A4.4 — Store punch-list (APP_STORE_READINESS.md)
- [ ] Wire Delete + Export (A4.3). [ ] Write + host privacy policy; link it. [ ] Fill App Privacy / Play Data Safety. [ ] Confirm media-lib permission prompts. [ ] Replace icon/splash with light-teal brand; screenshots. [ ] Verify privacy manifest at build; set age rating. [ ] Prod HTTPS + matching `NEXT_PUBLIC_SERVER_URL`.

**Done when:** a user can export + delete their data from Settings, the app runs in nl + en, report/flag exists, and the store punch-list is green.

---

## Phase 2+ (product) — deferred

Maps to **CMS B5/B6**. Listed for sequence awareness; not built in Phase 1.

- **A5 (P2):** recaps (batch, `RecapService` read-only) · memory search · grandparent **Simple mode** toggle · calendar · "on this day" · **child switcher** (multi-baby header) · **dark mode** · web app · weekly email digest · **contributor** role + approval.
- **A6 (P3):** **growth chart** (derived from moment measurements + birth stats — `GrowthService`) · social export studio · pregnancy journal · milestone prompts · map/location · tags · offline sync.
- **A7 (P4):** custom milestones · gift cards · advanced per-moment visibility · PDF/book export · fr/de · AI tone personalisation · auto-milestone detection review.

---

## Sequencing summary

```
A0  reskin (light-teal) + data spine (payload/auth/media lib, models, session) + app shell (gate + glass tabs + native stack)
A1  auth + onboarding + create-baby + baby profile + record-birth  (AgeIndicator, live age)
A2  the loop: timeline + add-moment (multi-media/voice/measurements) + moment detail + like/comment   ⭐ demoable
A3  milestone tracker + family/invite/roles + accept-invite   ← a real family can use it privately
A4  settings + i18n(nl/en) + GDPR export/delete + report + store punch-list   ← launch-legal
--- Phase 2 (CMS B5) --- recaps, search, grandparent mode, calendar, child switcher, dark mode, web, contributor
--- Phase 3 (CMS B6) --- growth chart, export studio, journal, map, tags, offline
--- Phase 4 --- custom milestones, gift cards, per-moment privacy, fr/de, AI tone
```

**Depth-first on A0–A2** (prove the stack + the loop once), **breadth-first after** (A3–A4 reuse the shared components). After **A2** it's demoable; after **A3** a real family can use it; **A4** makes it submittable.

_Companion to ARCHITECTURE.md + the design set — Baby Milestones app._
