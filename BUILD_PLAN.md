# RoastMode — Build Plan

Phased build plan for the MVP (v1.0). Depth-first on the core slice, breadth-first after.
Each phase ends with something runnable/testable. Section refs (§) point to `AGENTS.md` (the PRD).

**Build rule:** build depth-first once (prove the stack), breadth-first after (cheap copies).
**Critical-path spine:** Phase 1 → 2 → 3 unblocks everything. Phases 5–6 (notifications + roast)
are the riskiest subsystem and the real product — don't leave too late, don't start before the loop works.

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

## Phase 4 — Engagement mechanics — code-complete (buddy push deferred to Phase 5)

- [x] `SkipService` + `useSkip` + skip flow screen (friction: reason → 5s countdown → final roast, §4.5). Entry: "I can't today" on goal detail. Placeholder roasts (Phase 6 replaces).
- [x] `BuddyService` + `useBuddies` + Buddy manage screen (invite by contact / list / remove, §4.6). Reached via Settings. Buddy picker in goal form; `goal.buddyId` wired.
- [x] Completions carry `witnessed` when the goal has a buddy; detail shows a "buddy watching" indicator.
- [ ] **Buddy push notify on complete/skip** — needs FCM/push infra → **Phase 5**. (Link + witnessed flag stored now; delivery later.)
- **Done when:** skip recorded w/ friction; buddy link + witnessed flag persist. — ✅ `npm run db:smoke4` (skip + buddy + witnessed, RLS holds). tsc/lint green.

## Phase 5 — Notifications + escalation (own subsystem)

- [ ] `src/lib/notifications.ts` (expo-notifications) — schedule + deep-link tap.
- [ ] `EscalationService` — tactic ladder, wave→tactic map (§3.3).
- [ ] `NotificationService` — schedule per goal, handle tap → route to complete/skip.
- [ ] `fcm.ts` + Supabase cron Edge Function to trigger at goal times (§8.2).
- [ ] **Buddy push on complete/skip** (carried from Phase 4) — FCM to the buddy's device when a witnessed goal is completed or skipped (§4.6).
- [ ] Today's per-goal **status (done / pending / skipped)** on home + goal detail — needs scheduled-vs-acted tracking (same source that fills `StreakStats.ignoredCount`, stubbed in Phase 3).
- **Done when:** ignored goal escalates through waves; tap deep-links into app.

## Phase 6 — Roast content pipeline (§8.4)

- [ ] `ai/provider.ts` swappable interface (bake-off winner).
- [ ] Batch/cron job → fills `roast_lines` shared pool (cat × level × wave).
- [ ] `RoastService.getLine()` — read pool + string-interpolate cue/name/callback (NO live AI v1).
- [ ] Wire `goal.blockers` (user-declared excuses) as `{excuse}` callback slots in stakes/roast waves — **must pass the §9.3 safety filter first** (excuse OK, person/mental-health never). Captured in Phase 3.
- [ ] Post-generation safety filter (§9.3) + blocklist + kill switch.
- **Done when:** notifications pull real cached roast lines, filtered.

## Phase 7 — Share + monetization

- [ ] `ShareService` — watermarked card build + export (IG/TikTok/X/WhatsApp, §4.8).
- [ ] Share card screen.
- [ ] `BillingService` + paywall screen — free vs paid gating (§12): 5 goals / Unhinged / buddy.
- **Done when:** export a card; gating blocks paid features on free tier.

## Phase 8 — Onboarding + settings + compliance

- [ ] Onboarding flow (welcome → harsh-humor consent §9.1 → defaults → push permission → first goal).
- [ ] Global settings screen (§7.2).
- [ ] First-launch harsh-humor notice; rudeness hard-limits enforced in system prompt + filter.
- [ ] GDPR data export/delete (§10).
- **Done when:** cold-start onboarding works end-to-end.

## Phase 9 — Hardening + ship

- [ ] AI-cost-per-active-user metric (§8.4, §13).
- [ ] Analytics: notif open rate, tactic-wave conversion, D7 (§13).
- [ ] Store assets, App Store/Play compliance pass (§9), Carrot precedent framing.
- [ ] TestFlight / internal track beta.
- **Done when:** submittable build.
