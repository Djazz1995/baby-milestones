# RoastMode — Build Plan

Phased build plan for the MVP (v1.0). Depth-first on the core slice, breadth-first after.
Each phase ends with something runnable/testable. Section refs (§) point to `AGENTS.md` (the PRD).

**Build rule:** build depth-first once (prove the stack), breadth-first after (cheap copies).
**Critical-path spine:** Phase 1 → 2 → 3 unblocks everything. Phases 5–6 (notifications + roast)
are the riskiest subsystem and the real product — don't leave too late, don't start before the loop works.

### Positioning (read before prioritizing)

**Underneath, this is a habit tracker.** Streaks + schedules + completion logging + day/week views = the substrate that actually moves people to their goals. Build it to stand alone (competent tracker first); roast is the layer on top, not a substitute for solid tracking.

**Roast = trojan horse, not the cargo.** Comedy sells the install; it does NOT retain. Treat it as acquisition, never as the whole product.

- **Acquisition (roast):** screenshottable notifications = free marketing. Real, proven (Carrot, Duolingo owl). But "AI roast" is cheap to clone — not a moat.
- **Retention (the moat, currently undersold in this build):** in priority order —
  1. **It works** — behavior change retains (§3 levers). Outcome > joke.
  2. **Social witness** (§4.6) — a human watching beats any AI line. *This is the moat — protect its priority; do not let it slip to "nice-to-have."*
  3. **It learns you** (§5.3) — callbacks to the user's own excuses = switching cost.
- **Failure mode to design against:** building a comedy-generator that nags, when the winner is a behavior-engine that happens to be funny (PRD §3).
- **Non-negotiable:** Phase 0 content gate. If roast posts don't travel organically, the acquisition thesis is dead before code — do not skip to coding.

---

## ▶ What to do next (live checklist — June 2026)

Core build (Phases 1–8 + Phase 5 server logic) is code-complete and DB-verified via smokes. Ordered next steps:

1. [x] **Commit the work** — Phases 5(server)–8 checkpointed before live testing.
2. [~] **Run in iOS simulator** — ✅ app builds + launches on the iOS 26.5 sim (iPhone 17 Pro) via `npx expo run:ios`; onboarding → Home verified rendering clean, no crashes. Fixed en route: removed unused `@expo/ui` (incompatible with SDK 54, broke the iOS build); web-crash guard on the notification hook. **Still to walk:** create goal → Done → skip → share → agenda/stats → settings. (Notifications won't fire in sim — needs a dev build.)
3. [ ] **EAS dev build** — required before notifications work at all (`eas build --profile development`). Gives real push tokens + lets the cron reach the device.
4. [ ] **Go live on notifications** — `supabase functions deploy escalation-cron`; schedule every ~5 min (pg_cron / dashboard); add Expo Push creds (FCM + APNs); verify on device (ignore a goal → Wave 2/3/4 land; morning digest arrives).
5. [ ] **AI content pass** — run the Phase 0.1 bake-off (pick funniest non-refusing model); wire `anthropicProvider.generate()`, set `ANTHROPIC_API_KEY` + `ROAST_PROVIDER=anthropic`; `npm run roast:generate` → real-model pool (~50 lines per cat×level×wave) through the §9.3 filter.
6. [ ] **Phase 9 — hardening + ship** — analytics (open rate, tactic-wave conversion, D7), AI-cost-per-user metric, store-compliance pass (§9, Carrot framing), TestFlight/internal beta.

**Deferred (not now):** buddy push (needs buddy↔profile linking, v1.1), home-screen widgets (Phase 8.5, v1.1), per-user timezone for the cron.

### Remaining stubs (prototype) — audited Jun 2026

The app runs end-to-end on the sim. What's still not "real":

- [x] ~~CompletionScreen (`goal/[id]/complete`)~~ — **deleted** (was an unreachable placeholder; completion is inline on goal detail). Last placeholder screen gone — no stub screens remain.
- [ ] **Real AI roasts** — `src/lib/ai/provider.ts` `anthropicProvider` throws "not wired"; the pool is the offline **seed corpus**. Making roasts real = the AI content pass (bake-off → wire provider → regenerate pool). *This is the product-defining gap.*
- [ ] **`completionService.ignoredCount`** — hardcoded `0`; needs the notification engine to know scheduled-but-ignored. Minor; surfaces in stats later.
- [~] **BillingService.purchase()** — stub tier-flip, no real IAP. **Intentional** (monetization off for launch); real IAP only when the toggle flips.
- [~] **escalation-cron** — code complete, **not deployed** (needs Supabase Edge deploy + push creds + a real device). Hardware-gated.

**To "finish the prototype":** resolve CompletionScreen (delete or build) → then the **AI content pass** so roasts are real. Everything else is intentional-deferred or hardware-gated.

---

## Phase 0 — Gates (before any app code, per PRD §0)

- [ ] Content-validation gate (§0) — faceless TikTok/IG roast posts, 2–3 niches. **Go/no-go.**
- [ ] Model bake-off (§0.1) — Kimi / DeepSeek / Haiku vs Sonnet reference. Pick funniest non-refusing. Feeds §8.3.

> Skip only if already decided to build regardless. These are product gates, not code.

## Phase 1 — Project foundation ✅ DONE

- [x] Expo app init (SDK 54 — RN 0.81, React 19.1, expo-router 6).
- [x] TS strict, folder skeleton: `src/{models,services,hooks,lib,screens}`.
- [x] Lint/format, path aliases (`@/`). — `expo lint` + prettier (`.prettierrc.json`, `format` script, `eslint-config-prettier`).
- [x] Nav skeleton — root Stack + `(tabs)` group, stubs for all 11 §14 pages (routing in `src/app`, UI in `src/screens` via `ScreenPlaceholder`).
- **Done when:** app boots, navigate between blank screens. — verified: tsc clean, lint exit 0, web + iOS bundles export.

## Phase 2 — Data layer ✅ DONE (round-trip verified)

- [x] `src/models` — all §15.2 shapes (one file per model + barrel `index.ts`).
- [x] Schema: `profiles, goals, completions, skips, buddies, roast_lines` — `supabase/migrations/0001_init.sql` (idempotent). Applied to cloud project.
- [x] RLS policies (owner-only CRUD; `roast_lines` read-only to authenticated). In the migration.
- [x] `src/lib/supabase.ts` client — web-safe chunked SecureStore adapter, `persistSession`, `autoRefreshToken`.
- [x] Auth — `src/lib/auth.ts` `ensureSession()` anon sign-in + profile auto-create trigger. Anonymous sign-ins enabled in dashboard.
- [x] `.env` wired (gitignored) — real project URL + publishable key.
- **Done when:** can read/write a goal row. — ✅ `npm run db:smoke` passes: anon sign-in → insert → read → delete.

## Phase 3 — Core vertical slice (the proof) — code-complete (UI sim run pending)

Loop: **create goal → home list → tap Done → streak updates.**

- [x] `GoalService` (list/get/create/update/setPaused/remove) — `src/services/goalService.ts`, snake↔camel mapper.
- [x] `CompletionService` (complete + streak math → `StreakStats`) — `src/services/completionService.ts`. Streaks from distinct completion days; rates = completions/(completions+skips) per window; `ignoredCount` TODO Phase 5.
- [x] Hooks `useGoals`, `useGoal`, `useComplete`, `useStreak` (+ `useSession` session gate in root layout).
- [x] Screens: Home (list + new), Goal create/edit (form, prefill on edit), Goal detail (stats + Done/Pause/Edit/Delete). Shared `Button` component.
- **Done when:** real round-trip, no mocks. — data path ✅ verified: `npm run db:smoke3` (goal → completion → read → cascade, RLS holds). tsc/lint/web-export green.
  - [x] Visual run in iOS simulator — exercised on device (drove keyboard, tab-bar, time-picker, scheduling fixes).

### Phase 3 polish (UI, no new deps)

- [x] Goal-detail hierarchy: **Done** as hero (taller primary), **Edit** → header-right button, **Delete** demoted to a small red text link, Pause secondary.
- [x] "**Next reminder**" card on goal detail — soonest upcoming slot from `schedule.slots` (pure date math; shows "Paused — next would be" when paused).

## Phase 4 — Engagement mechanics ✅ DONE

- [x] `SkipService` + `useSkip` + skip flow screen (friction: reason → 5s countdown → final roast, §4.5). Entry: "I can't today" on goal detail. Placeholder roasts (Phase 6 replaces).
- [x] `BuddyService` + `useBuddies` + Buddy manage screen (invite by contact / list / remove, §4.6). Reached via Settings. Buddy picker in goal form; `goal.buddyId` wired.
- [x] Completions carry `witnessed` when the goal has a buddy; detail shows a "buddy watching" indicator.
- **Done when:** skip recorded w/ friction; buddy link + witnessed flag persist. — ✅ `npm run db:smoke4` (skip + buddy + witnessed, RLS holds). tsc/lint green.

> Buddy **push delivery** on complete/skip needs FCM infra → tracked in Phase 5. Data (link + witnessed flag) already persists here.

## Phase 4.5 — Goal collections (user grouping) ✅ DONE

User-named ambitions that group goals (e.g. "Getting fit", "Run a marathon", "Build a side project"). Distinct from §4.1 `category` (gym/study/… — sets roast tone). A goal has one category + an optional collection.

- [x] `Collection` model + `collectionId?` on `Goal` (`src/models`); wired through `goalService` (row map + input).
- [x] Schema: `collections` table + `goals.collection_id` FK (nullable, `on delete set null`) — `supabase/migrations/0003_add_collections.sql`, owner-only RLS. Applied to cloud.
- [x] `CollectionService` (list/create/rename/remove) + `useCollections`. Delete = ungroup goals (FK set null), not delete them.
- [x] UI: pick/create collection in goal form; Home groups goals by collection (SectionList); Collections manage screen reached from Settings.
- [ ] Collection filter on stats + agenda — deferred to Phase 5 (those screens don't exist yet).
- **Done when:** create a collection, assign goals, Home shows goals grouped under it. — ✅ code + tsc/lint green; `npm run db:smoke4_5` passes (create + group + rename + ungroup-on-delete, RLS holds).

## Phase 4.6 — Habit-tracker depth ✅ DONE (migrations applied; UI sim run pending)

The tracker fundamentals standard habit apps have, and that give the roast better fuel. Extends existing `Goal` / `Schedule` / `CompletionService` (Phases 2–3).

- [x] **Flexible-frequency goals** — "N times per week, any day" via `Schedule.weeklyTarget`; cadence toggle in goal form. `completionService` computes **week-based** streaks (Mon-anchored hit weeks) when set, else day-based. `StreakStats.streakUnit` labels day/week.
- [x] **Quantified habits** — `targetValue` + `unit` on `Goal`; `Completion.amount`. Goal form takes target+unit; goal detail logs amount on Done (validates a number). Partial counts allowed. Roast fuel wired in Phase 6.
- [x] **Schedule-aware streaks (replaced standalone rest day)** — day-streak math bridges any **non-scheduled** weekday: the goal's picked days define what counts, every other day is implicitly a rest day. Fixes multi-day goals (Mon/Wed/Fri no longer stuck at streak 1) and makes a separate rest-day field redundant. `Goal.restDay` removed; dropped in migration `0005_drop_rest_day.sql`. (Optional explicit freezes / free-tier cap → Phase 7 billing if wanted.)
- [x] **Archive / completed-goal history** — `Goal.archived`; `goalService.list()` excludes archived, `listArchived()` + `setArchived()` added; archive/unarchive button on goal detail. Delete still removes history; archive keeps it.
- [x] Migration `supabase/migrations/0004_habit_depth.sql` (goals: target_value/unit/rest_day/archived; completions: amount; partial active index). Applied to cloud.
- [x] **Per-category soft prefill** — `CATEGORY_CONFIG` in the goal form pre-selects schedule mode, measure on/off + default unit/target, default days/time, and copy per category (all still editable; `custom` = no prefill). Chores hides the measure field. Foreshadows Phase 8 habit templates.
- [x] **Diet split → new `water` category** — Diet = meal timing (binary slots); Water = daily quantity (L), measure-on by default. Migration `0006_add_water_category.sql` (updates goals + roast_lines category check constraints). Applied to cloud.
- [x] Migration `0005_drop_rest_day.sql` — drops the unused column (code already schedule-aware). Applied to cloud.
- [x] **Goal form refactor** — extracted into descriptor-driven field-blocks (`src/screens/goal-form/{config,fields,blocks}.tsx`); adding a goal type = a `GOAL_TYPES` entry (+ a block component only for a genuinely new field). Gym + Chores omit the measure block (no stable per-session number).
- **Done when:** a weekly-target goal tracks correctly; a quantified goal logs a partial amount; a streak survives a rest day; an archived goal leaves history intact. — ✅ code + tsc/lint green; `npm run db:smoke4_6` passes (quantified amount + weekly-target + rest_day + archive filtering, RLS holds). Streak-math correctness (week mode, rest-day bridge) is pure-function logic in `completionService` — UI sim run still pending.

## Phase 5 — Notifications + escalation — local + server logic DONE (cron deploy + device verify pending)

**Local (on-device) — built, tsc/lint/web-export green:**

- [x] `src/lib/notifications.ts` (expo-notifications, SDK 54) — perms, Android channel, weekly local schedule (ISO→expo weekday convert), cancel, tap listener, `registerPushToken`. Web-guarded.
- [x] `EscalationService` — pure tactic ladder + offsets per speed (slow/normal/unhinged), wave→tactic map (§3.3).
- [x] `NotificationService` — schedule Wave-1 per goal slot, cancel-by-goal (tagged via notif data), reschedule on create/update/pause/archive, cancel on delete. Wired into goal mutations.
- [x] Notification **tap → deep link** — `useNotificationRouting` in root layout (warm + cold start).
- [x] Today's per-goal **status (done/pending/skipped/off)** — `statusService` + `useTodayStatuses`; badges on **home**, **agenda**, **goal detail** (weekly-aware: pending until weekly target met).
- [x] **Agenda / calendar screen** — week strip → pick a day → goals due that day (fixed slots on the weekday, weekly goals any day) + today's status. Off Home header.
- [x] **Stats screen + week overview** — `statsService`; 7-day done/due grid + per-goal current streak (day/week-aware). Off Home header.

**Server (remote push) — logic implemented; deploy + device verify pending:**

- [x] `supabase/functions/escalation-cron/index.ts` — real logic: **conditional escalation** (highest due Wave 2+ only if the occurrence was ignored, spaced by `OFFSETS[speed]`, deduped via `notification_log`), pulls a wave line from the pool + interpolates `{name}/{cue}`, pushes to the owner's `push_token`, respects quiet hours. **Daily digest** (one/user/day at/after `DIGEST_HOUR_UTC`, counts due goals incl. weekly-under-target). Sends via Expo Push (batched ≤100).
- [x] Migration `0012_notification_log.sql` — escalation-state log (partial unique: one row per goal/day/wave, one digest per user/day), owner-select RLS, service-role writes.
- [x] Migration `0007_add_push_token.sql` — applied (smoke5 writes it).
- [x] Client token sync — `notificationService.syncPushToken()` persists the Expo token to `profiles.push_token`; called from `_layout` `RootNav` on app start (post-onboarding).
- [~] **Buddy push (§4.6) — NOT built:** `buddies.contact` is free text with no link to an app user/token, so there's nothing to target. Needs a buddy↔profile invite-linking flow → deferred to v1.1.
- **Done when (local):** ✅ goal schedules local reminders; tap deep-links in; agenda lists the day; stats shows week grid + streak. **Server:** logic done + `npm run db:smoke5` passes (push_token + notification_log + Wave-2 pool). **Remaining to go live (infra, not code):** (1) deploy `supabase functions deploy escalation-cron`; (2) schedule it every ~5 min (pg_cron / dashboard); (3) Expo Push creds (FCM/APNs) + an EAS **dev build** so devices yield real push tokens; (4) verify on device. Timezone caveat: cron treats `HH:mm` as UTC (no per-user tz column yet).

## Phase 6 — Roast content pipeline (§8.4) ✅ DONE (data path verified; UI sim run pending)

- [x] `src/lib/ai/provider.ts` swappable interface (`RoastProvider`/`generate`) — Anthropic impl stubbed (pending §0.1 bake-off); v1 default = **offline seed corpus** (no spend, user-chosen).
- [x] Batch job → fills `roast_lines` shared pool — `scripts/generate-roasts.mjs` (`npm run roast:generate`): hand-authored corpus (cat × level × wave + skip + digest + partial), every line cleared by the §9.3 mirror, emits idempotent `0009_seed_roast_lines.sql` (247 lines). No service-role key needed — applied via the normal migration flow.
- [x] `RoastService.getLine()` / `lineText` / `getSkip` / `getDigest` / `getPartial` — read pool + **slot-eligibility filter** + string-interpolate `{name}/{cue}/{excuse}/{count}/{done}/{target}/{unit}` (NO live AI v1). `src/services/roastService.ts` + `useRoast` hook.
- [x] Wire `goal.blockers` as `{excuse}` slots — `safeExcuse()` picks the first blocker that clears `isSafeExcuse` (§9.3); lines needing `{excuse}` are only chosen when a safe one exists.
- [x] **Daily-digest roast lines** — `kind='digest'` pool (slot `{count}`), `roastService.getDigest()`. Feeds the Phase 5 digest push (cron wiring still deferred). Through §9.3.
- [x] **Partial-completion roast lines** — `kind='partial'`, keyed by ratio bucket (`low`/`half`/`almost`), slots `{done}/{target}/{unit}`. `getPartial()` wired into goal-detail Done verdict for quantified goals. Through §9.3.
- [x] Post-generation safety filter (§9.3) — `src/lib/safety.ts` (blocklist: body/identity/mental-health/self-harm/person-worth) + **kill switch** (`EXPO_PUBLIC_ROAST_KILL_SWITCH` → neutral copy). Mirrored in the generator + smoke.
- [x] Replaced placeholders — SkipScreen (`getSkip`), notificationService Wave-1 body (`lineText`), goal-detail completion verdict (`getPartial`).
- [x] Migration `0008_roast_pool_variants.sql` — `kind`/`bucket` cols, nullable wave/tactic/category, constraints + indexes.
- [x] **Roast-only + Opus 4.8** — bake-off winner wired: `anthropicProvider` (real Opus Messages-API call, Part A system prompt) in `ai/provider.ts`; `generate-roasts.mjs` rewritten to roast-only seed (texting voice) + Opus mode (`ROAST_PROVIDER=anthropic` + key); app collapsed to roast-only (`roastService.lineText` + escalation-cron pull `tactic='roast'`). `0009` regenerated (80 lines). smoke5/smoke6 pass against the live roast-only pool.
- [x] **Weekly auto-refresh (scaffolded, not scheduled)** — `supabase/functions/roast-refresh/index.ts`: regenerates the whole pool via Opus + §9.3 filter, writes via service-role, guards against wiping on a failed/empty gen. No-ops without `ANTHROPIC_API_KEY`. To turn on: set the key secret, `supabase functions deploy roast-refresh`, schedule weekly via pg_cron (see file header).
- **Done when:** notifications pull real cached roast lines, filtered. — ✅ `0008`+`0009` applied; roast-only pool live; `npm run db:smoke6`/`smoke5` pass. **Pending (tomorrow):** add `ANTHROPIC_API_KEY` → run real-Opus generation; deploy + schedule `roast-refresh` for weekly freshness. tsc/lint/web-export green.

## Phase 7 — Share + monetization ✅ DONE (data path verified; UI sim run pending)

- [x] `ShareService` — `buildCard` (in-memory RoastCard) + `exportImage` (expo-sharing; web/text fallback). Deps added: `react-native-view-shot`, `expo-sharing`.
- [x] Share card screen — `ShareCardScreen` renders a watermarked card, captured via `react-native-view-shot` → system share sheet (IG/TikTok/X/WhatsApp). Reached from skip-done + completion-verdict via `/share/[cardId]` (text/goalName as params; cards not persisted in v1).
- [x] `UserService` (profile/defaults/tier) + `BillingService` (`canAddGoal`/`canUseRudeness`/`canUseBuddy`/`purchase` stub/`restoreFree`) + `useBilling` hook.
- [x] **Monetization toggle (launch = OFF)** — `src/lib/config.ts` `MONETIZATION_ENABLED` (env `EXPO_PUBLIC_MONETIZATION_ENABLED`, default false). When off, every gate resolves allowed and the paywall never shows. `FREE_TIER` limits (1 goal / max rudeness 3 / no buddy) apply only when on.
- [x] Paywall screen + gates wired into goal create/edit (`canAddGoal` on create, `canUseRudeness`, `canUseBuddy` → push `/paywall` with reason). Stub purchase flips `profiles.tier`.
- **Done when:** export a card; gating blocks paid features on free tier. — ✅ tsc/lint/web-export green; `npm run db:smoke7` passes (tier round-trip under RLS). Real IAP + UI sim run pending. Flip on later: set `EXPO_PUBLIC_MONETIZATION_ENABLED=true`.

## Phase 8 — Onboarding + settings + compliance ✅ DONE (data path verified; UI sim run pending)

- [x] Onboarding flow — `OnboardingScreen` 5 steps: welcome (sample roast) → harsh-humor consent (§9.1) → default rudeness/escalation (`updateDefaults`) → push permission (`notificationService.init`) → first goal. Cold-start gate in `_layout` `RootNav`: not-onboarded user → `/onboarding`; finishing flips `profiles.onboarded` + lands on Home.
- [x] **Habit templates** — Gym / Drink water / Read / Tidy up on the first-goal step; one tap builds a real goal from `GOAL_TYPES` defaults (schedule + quantified target) and schedules its reminders. "I'll set one up later" skips.
- [x] Global settings screen (§7.2) — default rudeness/escalation/sound/quiet-hours/watermark, each persisted via `userService.updateDefaults`; plus Manage (buddies/collections/archived) + Privacy section.
- [x] First-launch harsh-humor notice (consent step) + golden-rule/hard-limits copy. Generation-side limits already enforced by `src/lib/safety.ts` (§9.3) from Phase 6.
- [x] GDPR data export/delete (§10) — `dataService.exportData()` (bundles all user rows → share sheet) + `deleteAccount()` (erase content + profile, sign out, fresh anon user). Migration `0011` adds the profiles DELETE policy. Wired into Settings → Privacy.
- [x] `User.onboarded` model + `userService.completeOnboarding()` + `useUser` hook. Migration `0010` (profiles.onboarded).
- **Done when:** cold-start onboarding works end-to-end. — ✅ `0010` + `0011` applied; `npm run db:smoke8` passes (onboarded flag + defaults + GDPR export/delete, profile DELETE under RLS). tsc/lint/web-export green. UI sim run still pending.

## Phase 8.5 — Home-screen widgets (v1.1, high retention value)

Glanceable habit lever — a streak you see on every unlock drives loss-aversion with zero app-open friction. Native (not pure JS), so post-v1.0-core, but prioritized early in v1.1 (not buried with wearables).

- [ ] Expo config plugin for native widget targets (iOS WidgetKit + Android App Widget) — verify against SDK 54 docs before building.
- [ ] Today's-tasks + current-streak widget; optional day's roast line. Reads same scheduled-vs-acted status source as agenda/stats (Phase 5).
- [ ] Shared data bridge (App Group / shared store) so the widget reads goal status without launching the app.
- **Done when:** widget on home screen shows today's goals + streak, updates on completion.

## Phase 9 — Hardening + ship

- [ ] AI-cost-per-active-user metric (§8.4, §13).
- [ ] Analytics: notif open rate, tactic-wave conversion, D7 (§13).
- [ ] Store assets, App Store/Play compliance pass (§9), Carrot precedent framing.
- [ ] TestFlight / internal track beta.
- **Done when:** submittable build.

## Phase 10 — Live accountability agent (post-v1, the end goal)

The vision: a conversational AI the user can talk to that holds them accountable, calls back their *specific* logged excuses, and roasts in real time. This is the "it learns you" retention moat (§5.3) — but it's a different workload from the cached pool and must be architected for cost.

**Two workloads, two models (the key principle):**
- **Batch pool (today)** — Claude Opus 4.8, generated ~weekly, shared across all users → cost trivial regardless of tier. Buy the funniest. ([[roast-model-choice]])
- **Live chat (Phase 10)** — per-user, real-time API call per message → scales with usage. Opus too expensive here. Use **Haiku 4.5** (or Sonnet 4.6 for more wit). The `ai/provider.ts` interface already abstracts the model: configure a `batch` model + a `chat` model, swap is config not a refactor.

**Cost controls for live chat (§8.4 mindset):**
- [ ] **Prompt caching** on the static system prompt (Part A voice + rules) → ~90% cheaper per follow-up message.
- [ ] **Short outputs** (1–2 sentence replies) → tiny output-token cost.
- [ ] **Inject context, don't retrain** — feed goals, streaks, and the user's logged `blockers`/excuse history so the agent calls back *their* excuses (the moat). Cheap model + rich context > expensive model + none.
- [ ] **Free-tier message caps + rate limits** — N messages/day free, more on paid.
- [ ] **Tiered escalation** — Haiku for ~95% of chat; bump to Sonnet/Opus only for rare big moments (weekly verdict, roast of the week).

**Endgame:** once thousands of Opus-quality roasts exist, they're a training set → distill/fine-tune a small cheap model on that voice → Opus-level funny at Haiku cost for the live agent at scale.

- **Done when:** user can hold a short accountability conversation that references their real goal data, at a sustainable per-user cost.
