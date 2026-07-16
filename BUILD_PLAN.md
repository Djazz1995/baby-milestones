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

### A4.5 — Subscription & paywall 💳 (ship at launch — revenue + margin from family #1)
*Storage + AI are the cost drivers, so both sit behind the paywall. A capped free tier hooks the habit; one paid plan monetizes. Not "later" — the paywall ships with the MVP so there's revenue signal + margin discipline from day one. (Print / gifts stay deferred until a user base exists.)*
- [ ] **IAP integration** — **RevenueCat** (recommended: cross-platform, free under ~$2.5k/mo tracked revenue, one SDK for Apple + Google) or `expo-in-app-purchases`. Needs a custom dev build (not Expo Go); verify vs Expo SDK 54.
- [ ] **Plans:** **Free (capped)** + **Premium €5.99/mo or €49/yr** (one **family** subscription covers all members).
- [ ] **`EntitlementService` / `useEntitlement`** — resolves the family's plan; gates features in the UI. **Server (Payload) is the source of truth** — a RevenueCat webhook writes subscription status onto the family; the app mirrors, never decides.
- [ ] **Free-tier caps — enforced server-side, mirrored in UI:**
  - Storage **~2–3GB (~500 photos)** hard cap (blocks upload past cap → upgrade prompt).
  - **5 AI stories / month** (A5 quota).
  - **Monthly recap only** — no weekly/yearly, no TTS, no translation (A7 gated).
  - Full core stays free: timeline, milestones, family view, like/comment (never paywall the core loop — that's the hook).
- [ ] **Paywall screen** + contextual upgrade prompts **at cap boundaries** (storage full, AI quota hit, "unlock weekly recaps") — soft, value-framed, never nag walls.
- [ ] **Restore purchases**, manage-subscription deep-link (App Store / Play), and subscription state included in GDPR export (A4.3).
- [ ] **CMS dep (new):** a subscription-status field on `families` (plan, renews-at, source) + a **RevenueCat webhook endpoint**. Server enforces every cap. Add to the CMS build plan.

**Done when:** a user can export + delete their data from Settings, the app runs in nl + en, report/flag exists, **a family can subscribe to Premium and the free-tier storage + AI caps are enforced server-side (restore + manage-subscription work)**, and the store punch-list is green.

---

## Phase A5 — AI Story Assist ✨ (first AI feature · Phase 2)

*Goal: a parent jots a few bullet notes on a single moment ("first steps, giggled, fell on his butt") and AI turns them into a warm, readable keepsake story they can edit and save.* **This is per-moment, on-demand, and parent-triggered — distinct from Phase-2 recaps (batch, multi-moment, server-side summaries). It is the headline differentiator vs BackThen/Tinybeans/Qeepsake, none of which narrate a single moment for you.**

**CMS dependency (new):** a server-side story endpoint — `POST /api/ai/story` `{ babyId, momentId?, bullets, tone, locale }` → `{ draft }`. Runs behind the swappable AI provider; **EU residency + no-train terms** (Anthropic API doesn't train on data — say this in the privacy copy). Generates on demand, returns draft text, **persists nothing** until the parent saves the moment. Must be built in the CMS repo first (add to CMS build plan).

**Architectural fit (the hot-path rule holds):** the capture path never *blocks* on AI. Story Assist is an **explicit, optional, async** action inside Add-moment / Moment-detail — the moment saves with or without it. Generation lives behind `ai/provider.ts` (`generateStory(context) → draft`); a thin `StoryService.draft(input) → string` wraps it. Same swappable-provider discipline as recaps.

### A5.1 — Story spine
- [ ] `ai/provider.ts` — add `generateStory({ bullets, babyName, ageLabel, milestone?, tone, locale, priorSamples? }) → string`. Provider = config choice; prompt lives here only.
- [ ] `StoryService.draft(input) → string` — calls the CMS `/api/ai/story` endpoint (server owns the vendor key + prompt), maps to a plain draft string, **throws** on error. On-demand only; no batch, no storage.
- [ ] `useStoryDraft` hook — holds `idle / generating / ready / error`; exposes `generate()`, `regenerate()`, the draft, and an editable buffer. Never auto-commits.

### A5.2 — Prompt + guardrails
- [ ] **Constrain to facts** — the prompt embellishes *style*, never invents events. Only what the parent typed (+ baby name, derived age, optional milestone) may appear. No fabricated details, names, places.
- [ ] **Tone options** — `sweet · funny · simple · poetic`. Parent picks; default `sweet`. Passed to the prompt.
- [ ] **Locale-native** — generate in the active locale (nl / en), not translated-after. Warm, human, non-listy phrasing (reuse the `humanizer` guidance).
- [ ] **Length** — short by default (a few sentences); a moment story, not an essay.

### A5.3 — UI (in Add-moment + Moment-detail)
- [ ] **Bullets → Story** control in Add-moment (SCREENS §7) — a "✨ Write my story" affordance under the caption field: parent types quick bullets, taps generate, sees a loading shimmer, gets the draft **in an editable field**. Accept / edit / regenerate / discard. The generated (and edited) text becomes the moment `body`.
- [ ] **Tone picker** — segmented control (sweet / funny / simple / poetic) beside the generate button.
- [ ] **Owner-only**, and **never auto-posts** — the parent always reviews + taps save. Viewer never sees the tool.
- [ ] **Graceful degrade** — AI down / offline / over quota → the field stays a normal editable caption; capture is never blocked. Friendly inline notice, not an error wall.
- [ ] States: idle / generating (shimmer) / ready-editable / error-retry / offline / over-quota.

### A5.4 — Cost + quota (ties to monetization, PRD §12)
- [ ] **Free-tier cap** (e.g. N stories / month), premium unlimited — each generation is a paid LLM call; model this into the pricing tiers. Show remaining quota near the control.
- [ ] Server enforces the cap (never trust the client); app mirrors it in the UI.

**Done when:** an owner types bullet notes on a moment, taps "Write my story", picks a tone, gets an editable AI draft in their language, edits it, and saves — with the moment fully saveable if they skip or the AI is unavailable, and the free-tier quota enforced server-side. (Phase-4 **AI tone personalisation** — `priorSamples` teaching the model the parent's own voice — extends this; already listed in A8.)

---

## Phase A6 — Frictionless Capture (gap-closers) 🪶 (Phase 2)

*Goal: kill the manual-logging friction that competitors beat us on. **Bebememo** auto-imports photos (AI); **Qeepsake** drives daily habit with text prompts. Our MVP makes parents do manual work — a retention + cold-start risk (PRD §11 activation metric). Three levers: prompts drive capture **without opening the app**; auto-import removes the blank-timeline chore; a **share target** lets a parent push a photo in from any other app.* **All opt-in and privacy-safe — nothing uploads or logs without explicit parent confirmation.**

> **Candidate to pull into Phase 1:** A6.1 (prompts) is cheap (content + push, no new AI) and directly lifts the "% of families posting ≥3 moments in week 1" metric. Consider shipping it with the MVP rather than Phase 2.

### A6.1 — Capture prompts (Qeepsake-style, push-native)
- [ ] **CMS dep (new):** a `prompts` collection — localized (nl/en) prompt copy, keyed to baby **phase + age bucket** (pregnancy / 0–3mo / 3–6mo / …). Add to the CMS build plan.
- [ ] `PromptService.today(babyId) → Prompt` — picks an age-appropriate, not-recently-used prompt; maps localized copy.
- [ ] Delivery via **push** (`expo-notifications`) on an owner-set schedule (daily / few-a-week / off) + quiet hours. **Not SMS** — SMS has higher open but adds cost + a vendor + phone-number PII; push fits the stack and is free. (Optional: fold into the Phase-2 email digest for a second channel.)
- [ ] **Tap prompt → deep-link into Add-moment** (SCREENS §7) with the prompt text pre-filled as a caption seed — and, if the parent then adds bullets, it feeds straight into **A5 AI Story Assist**. Prompt → moment in two taps.
- [ ] Settings: prompt frequency + quiet hours (extends the Notifications card, A4.1).
- [ ] States: no-prompt-today / prompt-ready / notifications-off (in-app prompt card fallback).

### A6.2 — Photo auto-import (bebememo-style)
- [ ] `expo-media-library` — read the camera roll, **permission-gated + explicit opt-in**; never silent, never background-scrape. Verify perms vs Expo SDK 54 docs.
- [ ] **On-device grouping** — cluster roll photos by `capturedAt` day → surface suggestion cards ("Add 6 photos from Saturday?"). Nothing leaves the device until the parent confirms (privacy + storage cost).
- [ ] `ImportService` — track already-imported asset ids locally (dedup); on confirm, upload only the chosen photos → create moment(s) (one multi-media moment per day-group, cover = first).
- [ ] **MVP scope = chronological suggestion + batch add.** AI baby-matching / milestone detection deferred to A6.3.
- [ ] Privacy copy: loud consent, "only photos you pick are uploaded, to our EU bucket." Mirrors PRD §9.
- [ ] States: permission-request / scanning / suggestions / empty (no new photos) / import-progress / offline.

### A6.3 — Share-to-app (OS share target) 📲
- [ ] **Register we moments as a system share destination** — iOS **Share Extension** + Android **share intent** (`ACTION_SEND` / `SEND_MULTIPLE`, image + video mime types). Now a photo shared from another app lists "we moments" in the OS share sheet.
- [ ] **Flow:** share photo/video → we moments opens a **quick-capture sheet** → (multi-baby) pick baby → caption, with the **A5 AI Story** bullets→story control right there → save as a moment. Two taps from anywhere.
- [ ] **Realistic sources** — Photos, WhatsApp, Messages, Files, Safari/Chrome share out fine. **Instagram / TikTok generally do *not* emit media to the share sheet** (they lock share-out) — so this is "share *into* us from the phone/other apps," not from IG/TikTok. Don't promise IG→app in copy.
- [ ] **Auth guard** — not signed in → the extension prompts to open the app + sign in, then resumes. Media limits + EU-bucket upload reuse A2.2.
- [ ] **Expo reality:** share extensions need a **config plugin + a custom dev build** (not Expo Go) — e.g. `expo-share-intent` or a native module. Verify against Expo SDK 54; this is the most native-heavy item in Phase 2 — budget for it.
- [ ] States: shared-media-received / pick-baby / caption(+AI) / not-authed / upload-progress / error.

### A6.4 — AI baby-match + milestone hints on import (P3, later)
- [ ] Vision suggests **which baby** a photo belongs to (multi-baby families) + flags likely **milestone** candidates → **parent confirms before anything logs** (mirrors the auto-milestone-detection rule, never silent). Ties into Phase-4 auto-milestone review (A9).

**Done when:** a parent receives an age-appropriate prompt, taps it, and lands in Add-moment pre-filled (optionally flowing into AI Story); can review camera-roll suggestions and batch-add a day's photos; **and can share a photo from Photos/WhatsApp/etc straight into we moments, caption it (with AI Story), and save** — all opt-in, nothing uploading or logging without explicit confirmation.

---

## Phase A7 — Recaps ✨ (weekly / monthly / yearly · Phase 2)

*Goal: the app narrates the archive on its own — a warm, readable **weekly**, **monthly**, and **yearly** story auto-generated from that period's moments. The yearly "Year in review" is the emotional payoff + a prime shareable + a retention anchor (families come back for it). This is the PRD §1.4 #1 differentiator — humanized recaps, not a photo grid.* **Distinct from A5 AI Story (one moment, parent-triggered): recaps are multi-moment, batch, automatic.**

**Architectural fit (hot-path rule holds):** recaps generate in a **server-side batch job** (Payload job / cron) → write `Recap` docs. `RecapService` only **reads** them. The capture + timeline paths never wait on AI. Generation shares `ai/provider.ts` (`generateRecap(context) → narrative`) with A5.

**Model / CMS change:** `Recap.period` extends **`week | month | year`** (ARCHITECTURE §3 currently lists `week | month` — update). **CMS dep (new):** a `recaps` collection + a scheduled job that, per baby, batches the period's moments → calls the provider → stores narrative + cover + highlights. Add to the CMS build plan.

### A7.1 — Recap spine
- [ ] `ai/provider.ts` — add `generateRecap({ period, babyName, ageLabel, moments[], milestonesHit[], locale }) → narrative`. Server-side/batch only; app never calls it live.
- [ ] `RecapService.list(babyId) → Recap[]`, `get(id) → Recap` — **read-only** over batch-generated docs. No live AI call, no generation trigger from the app.
- [ ] `useRecaps` hook — list + detail, loading/error/empty.
- [ ] `Recap` model: `period (week|month|year)`, `rangeStart/End`, `narrative`, `coverMomentId?`, `highlightMomentIds[]` (top picks), + derived `title` per locale.

### A7.2 — Generation (CMS batch, server-side)
- [ ] **CMS job** (Payload cron): weekly (e.g. Sun night), monthly (1st), yearly (birthday or Jan 1 — decide). Per baby with ≥N moments in range. Skips empty periods (no "boring" recap).
- [ ] Yearly rolls up: top moments, **milestones hit that year**, growth delta (from measurements), a longer narrative. Weekly/monthly = lighter.
- [ ] Provider = swappable; EU residency + no-train (PRD §9). Prompt = humanized, non-listy (reuse `humanizer`), locale-native.
- [ ] On ready → push notif + (Phase-2) email digest: "{name}'s week is ready."

### A7.3 — Recap UI (SCREENS — new)
- [ ] **Recaps screen** — browse past recaps (cards by period, cover image, title, date range). Tabs or filter: Weekly / Monthly / Yearly.
- [ ] **Recap detail** — cover, narrative, highlight moments (tap → moment detail), milestones-hit strip (yearly), growth delta (yearly). Viewer + owner both read.
- [ ] **Share** — hook into the Phase-3 social export studio (A8): a recap → beautiful shareable card / **year-in-review reel**. (Yearly recap is the strongest viral unit — wire export early if pulling A8 forward.)
- [ ] States: loading (skeleton) / empty ("first recap comes after a few moments") / error / offline (cached) / role.

### A7.4 — Settings
- [ ] Recap frequency toggles (weekly on/off, monthly on/off, yearly always) + notify-when-ready — extends the Notifications card (A4.1).

### A7.5 — Recap narration (TTS) 🔊
- [ ] **Audio version of each recap** — the narrative read aloud in a warm voice, delivered with the weekly/monthly/yearly recap. A bedtime-playback keepsake; the story becomes something you *hear*.
- [ ] Generated in the same **CMS batch job** (A7.2) — TTS runs server-side after the narrative, stores an audio asset on the `Recap`. App only plays it (reuse the voice-note player from A2.3). No live TTS on device.
- [ ] Locale-matched voice (nl / en); EU-residency + swappable vendor via `ai/provider.ts`.
- [ ] States: audio-ready (play control) / generating (text shows, audio pending) / unavailable (text-only fallback).

### A7.6 — Recap translation (multilingual family) 🌐
- [ ] **One recap, each member's language.** Oma reads Dutch, an uncle abroad reads English — same recap, per-viewer locale. Directly kills a Tinybeans/BackThen gap (English-only).
- [ ] Batch job stores the narrative in **each family locale in use** (derive from members' `user.locale`); `RecapService` serves the viewer's locale, falls back to the source. TTS (A7.5) follows the same per-locale set.
- [ ] Provider `translateRecap` (or generate-per-locale) behind `ai/provider.ts`; server-side only.

**Done when:** after a family logs moments across a week/month/year, the CMS batch job generates a humanized recap **with an audio narration and a version in each member's language**; it appears on the Recaps screen with cover + highlights (yearly adds milestones-hit + growth delta), each member reads/hears it in their own locale, family gets notified, and the capture path never blocks on it. Empty periods produce no recap.

---

## Phase A8 — Events & collaborative moments 🎉 (Phase 2)

*Goal: group moments under a named **event** (a birthday, a holiday, a first trip) and let the **whole family add their photos to it** — a shared album for one occasion. Doubles as a photo organizer (the timeline is chronological; events are thematic) and deepens the family moat (more contributors = more retention).*

**Model / CMS change (new):** an `events` collection — `baby→` (or `family→`), `title`, `date`, `coverMomentId?`. A `moment` gains an optional `event→`. Add to the CMS build plan. Collaboration reuses existing roles: any member who can post (owner; contributor in Phase 2) can add to an event.

### A8.1 — Event spine
- [ ] `Event` model (`id`, `babyId`, `title`, `date`, `coverMomentId?`, `momentCount`); `EventService.list/create/get`, and `MomentService.create` accepts an optional `eventId`.
- [ ] `useEvents`, `useEvent(id)`.

### A8.2 — Event UI
- [ ] **Events surface** — a tab or section: event cards (cover, title, date, count). Create event (owner).
- [ ] **Event detail** — grid of that event's moments (from any contributor), "Add to this event" → Add-moment with the event prefilled.
- [ ] **Contribute** — a viewer promoted to contributor (Phase-2 role) can add to an event pending approval; owners add directly. Reuses A3 roles + contributor approval.
- [ ] From **Add-moment**: optional "Add to an event" picker (alongside the milestone picker).
- [ ] States: loading / empty ("No events yet — make one for the birthday") / role (viewer can't create) / offline.

**Done when:** an owner creates an event, family members add their own photos to it, and the event shows a combined grid — moments still live on the timeline but are also grouped thematically.

---

## Phase A9 — Pregnancy delight 🤰 (Phase 2)

*Goal: give pregnancy users (who have little content yet) a reason to open the app weekly — a bump timelapse and a light "how big is baby this week" card. Small, self-contained delighters that reduce pre-birth churn.*

### A9.1 — Bump timelapse 📸
- [ ] **Weekly bump photo series** — a dedicated capture ("add this week's bump"), stored as a tagged series distinct from the normal timeline. Compile → a **timelapse video** of the belly across the pregnancy (BackThen does *face* timelapse post-birth; nobody does bump well — a clean gap).
- [ ] Reuses media upload (A2.2); the compile is a simple client or server montage of the ordered series. Shareable (ties to the Phase-3 export studio).
- [ ] States: no-photos-yet / building-series / timelapse-ready / born (series closes, becomes a keepsake).

### A9.2 — "Size of baby" weekly card 🍐
- [ ] **Localized weekly content** keyed to pregnancy week (e.g. "week 22 — about a papaya") + a short note. Derived from the existing pregnancy-week math (AgeService, A1.1) — no new tracking.
- [ ] **CMS dep (small):** a localized `pregnancyWeeks` content set (nl / en), or ship as a bundled static content table in-app (simpler, no backend). Recommend **in-app static** to start — pure content, no server.
- [ ] Surfaced on the timeline header / pregnancy empty state; updates automatically each week.

**Done when:** an expecting parent adds weekly bump photos that compile into a timelapse, and sees an auto-updating "how big is baby this week" card — both driven by the existing due-date math, no new tracking burden.

---

## Phase 2+ (product) — deferred

Maps to **CMS B5/B6**. Listed for sequence awareness; not built in Phase 1.

- **A5 — AI Story Assist (P2):** detailed above — per-moment, on-demand story generation. First AI feature; shares `ai/provider.ts` with recaps.
- **A6 — Frictionless Capture (P2):** detailed above — capture prompts (push) + photo auto-import + **OS share target**. Gap-closers vs Qeepsake / Bebememo. A6.1 is a Phase-1 pull candidate.
- **A7 — Recaps (P2):** detailed above — weekly / monthly / yearly batch narratives. `RecapService` read-only; shares `ai/provider.ts` with A5.
- **A8 — Events & collaborative moments (P2):** detailed above — event grouping + family contribution; a thematic photo organizer over the chronological timeline.
- **A9 — Pregnancy delight (P2):** detailed above — bump timelapse + "size of baby" weekly card.
- **A10 (P2):** **emoji reactions** (extends the `Reaction` model beyond a single like — small, high-frequency, easy early win) · memory search · grandparent **Simple mode** toggle · calendar · "on this day" · **child switcher** (multi-baby header) · **dark mode** · web app · weekly email digest · **contributor** role + approval.
- **A11 (P3):** **growth chart** (derived from moment measurements + birth stats — `GrowthService`) · social export studio + **year-in-review reel** · **voice → moment** (record → transcribe → caption / AI-Story bullets) · pregnancy journal · milestone prompts · map/location · tags · offline sync · **A6.4 AI baby-match on import**.
- **A12 (P4):** **annual interview / time-capsule** (friendbook-style yearly questions per birthday — priceless years later) · **letters to the future** (parent notes delivered on a set future date, e.g. 18th birthday) · **family poll** (could-have — a poll inside the family group) · custom milestones · advanced per-moment visibility · PDF/book export · fr/de · **AI tone personalisation** (extends A5 — `priorSamples`) · auto-milestone detection review.

**Parked — deliberately out of scope** (revisit only after the core product has real users):
- **Sharing beyond one family** — cross-family moment sharing / **shared circles** (post to a subset of family, or to friends on other accounts). This is the long-term *"we = any group"* vision from the original naming idea, but it breaks the single-family privacy boundary and adds heavy consent/GDPR/UGC complexity. **Skipped for now** — the app stays one-family-private until the wedge is proven.
- **Subscription (NOT deferred — ships in Phase 1, A4.5):** capped free tier + €5.99/mo · €49/yr Premium. Storage + AI gated. ~85–90% gross margin (Hetzner storage + gated AI). Break-even ~20 subs infra / ~820 subs founder salary.
- **Monetize — physical (deferred until a user base exists):** print photo book · wall art / canvas / calendar · gift cards · gift subscription. High-margin add-on revenue — build audience first (per product decision).

---

## Sequencing summary

```
A0  reskin (light-teal) + data spine (payload/auth/media lib, models, session) + app shell (gate + glass tabs + native stack)
A1  auth + onboarding + create-baby + baby profile + record-birth  (AgeIndicator, live age)
A2  the loop: timeline + add-moment (multi-media/voice/measurements) + moment detail + like/comment   ⭐ demoable
A3  milestone tracker + family/invite/roles + accept-invite   ← a real family can use it privately
A4  settings + i18n(nl/en) + GDPR export/delete + report + store punch-list + 💳 subscription/paywall (capped free + €5.99 premium)   ← launch-legal + revenue from day one
A5  AI Story Assist ✨  per-moment bullets → editable AI story (on-demand, tone options, quota)   ← first AI feature, headline differentiator
A6  Frictionless Capture 🪶  capture prompts (push) + photo auto-import + OS share target   ← gap-closers vs Qeepsake/Bebememo (A6.1 = Phase-1 pull candidate)
A7  Recaps ✨  weekly / monthly / yearly narratives + TTS narration + per-member translation (server-side)   ← PRD §1.4 #1 differentiator; yearly = viral + retention anchor
A8  Events 🎉  named events + whole-family photo contribution (thematic organizer over the timeline)
A9  Pregnancy delight 🤰  bump timelapse + "size of baby" weekly card (keeps pre-birth users engaged)
--- Phase 2 (CMS B5) --- emoji reactions, search, grandparent mode, calendar, child switcher, dark mode, web, contributor
--- Phase 3 (CMS B6) --- growth chart, export studio + year-in-review reel, voice→moment, journal, map, tags, offline
--- Phase 4 --- annual interview, letters to the future, family poll, custom milestones, per-moment privacy, fr/de, AI tone
--- Monetize (after user base) --- print book, wall art, gift cards, gift subscription
```

**Depth-first on A0–A2** (prove the stack + the loop once), **breadth-first after** (A3–A4 reuse the shared components). After **A2** it's demoable; after **A3** a real family can use it; **A4** makes it submittable.

_Companion to ARCHITECTURE.md + the design set — Baby Milestones app._
