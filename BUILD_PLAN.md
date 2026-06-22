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

## Phase 5 — Notifications + escalation — local slice DONE; server cron scaffolded (deploy pending)

**Local (on-device) — built, tsc/lint/web-export green:**

- [x] `src/lib/notifications.ts` (expo-notifications, SDK 54) — perms, Android channel, weekly local schedule (ISO→expo weekday convert), cancel, tap listener, `registerPushToken`. Web-guarded.
- [x] `EscalationService` — pure tactic ladder + offsets per speed (slow/normal/unhinged), wave→tactic map (§3.3).
- [x] `NotificationService` — schedule Wave-1 per goal slot, cancel-by-goal (tagged via notif data), reschedule on create/update/pause/archive, cancel on delete. Wired into goal mutations.
- [x] Notification **tap → deep link** — `useNotificationRouting` in root layout (warm + cold start).
- [x] Today's per-goal **status (done/pending/skipped/off)** — `statusService` + `useTodayStatuses`; badges on **home**, **agenda**, **goal detail** (weekly-aware: pending until weekly target met).
- [x] **Agenda / calendar screen** — week strip → pick a day → goals due that day (fixed slots on the weekday, weekly goals any day) + today's status. Off Home header.
- [x] **Stats screen + week overview** — `statsService`; 7-day done/due grid + per-goal current streak (day/week-aware). Off Home header.

**Server (remote push) — scaffolded, NOT deployed/verified (needs Supabase Edge deploy + push creds + dev build):**

- [~] `supabase/functions/escalation-cron/index.ts` — Deno scaffold: conditional escalation (Wave 2+ only if ignored), **buddy push on complete/skip**, **daily digest** at day-start. Real Expo-Push send + query structure; escalation-state (`notification_log`) + per-section logic are TODO. Replaces raw `fcm.ts` (Expo Push abstracts FCM).
- [x] Migration `0007_add_push_token.sql` (profiles.push_token for cron targeting). **Pending apply.**
- **Done when (local):** ✅ goal schedules local reminders; tap deep-links in; agenda lists the day; stats shows week grid + streak. **Server escalation/digest/buddy-push:** deferred to a deploy pass (cron + Expo Push creds + dev build for real device tokens). UI sim run still pending.

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
- **Done when:** notifications pull real cached roast lines, filtered. — ✅ `0008` + `0009` applied to cloud; `npm run db:smoke6` passes (247 lines, all 4 kinds, all pass §9.3, wave line interpolates). tsc/lint/web-export green. UI sim run still pending.

## Phase 7 — Share + monetization

- [ ] `ShareService` — watermarked card build + export (IG/TikTok/X/WhatsApp, §4.8).
- [ ] Share card screen.
- [ ] `BillingService` + paywall screen — free vs paid gating (§12): 5 goals / Unhinged / buddy.
- **Done when:** export a card; gating blocks paid features on free tier.

## Phase 8 — Onboarding + settings + compliance

- [ ] Onboarding flow (welcome → harsh-humor consent §9.1 → defaults → push permission → first goal).
- [ ] **Habit templates** — preset starter goals (gym / water / read / study) on the first-goal step. One tap pre-fills name/category/schedule/quantified target → less setup friction → higher activation. Reduces drop-off at the weakest funnel step.
- [ ] Global settings screen (§7.2).
- [ ] First-launch harsh-humor notice; rudeness hard-limits enforced in system prompt + filter.
- [ ] GDPR data export/delete (§10).
- **Done when:** cold-start onboarding works end-to-end.

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
