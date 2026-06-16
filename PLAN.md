# RoastMode MVP — Build Plan (React Native / Expo)

Target: v1.0 scope from [AGENTS.md](AGENTS.md) §11. This plan turns that scope into ordered, buildable phases.

> **Gate:** §0 content-validation + §0.1 model bake-off come BEFORE this plan. Do not start app build until a niche shows organic share velocity and a generation model is chosen. This doc assumes both passed.

---

## Architecture decisions (locked from prior discussion)

| Decision | Choice | Why |
|---|---|---|
| Identity | Supabase **anonymous auth**, UUID in `expo-secure-store` | zero-friction install funnel; no login wall |
| Login | Optional email/OAuth **upgrade**, only for buddy / cross-device | not a gate |
| AI generation | **Server-side** (Supabase Edge Function), behind swappable `generateRoast()` interface | phone can't run AI in background; provider not locked |
| Notification copy | **Pre-generated cached pool**, baked into notification at schedule time | OS fires notifications offline/backgrounded; can't call API at fire moment |
| Personalization | **Template string** (cue/name/callback), not a live API call in v1 | cost + offline |
| Escalation timing | **Local scheduled notifications** (`scheduleNotificationAsync`), all waves queued at goal time, cancel rest on Done | reliable +15min cadence; works offline; no per-push server cost |
| Build type | **Dev build** (`expo-dev-client`), NOT Expo Go | remote push unavailable in Expo Go since SDK 53 |

**Verified against v56 docs:** `scheduleNotificationAsync`, `cancelScheduledNotificationAsync`, `cancelAllScheduledNotificationsAsync`, `addNotificationResponseReceivedListener`, `DEFAULT_ACTION_IDENTIFIER`, trigger types `DATE` / `DAILY` / `TIME_INTERVAL`. iOS OS-level cap ~64 pending notifications (5 goals × 4 waves = 20, safe).

---

## Phase 0 — Project setup (½–1 day)

- `npx create-expo-app` (SDK v56), TypeScript.
- Add `expo-dev-client`; build dev client for iOS + Android (EAS Build). **Test push on a real device, not simulator/Expo Go.**
- Deps: `expo-notifications`, `expo-secure-store`, `@supabase/supabase-js`, navigation (`expo-router`), state (Zustand or React Query), `react-native-view-shot` + `expo-sharing`.
- Set up Supabase project; create EAS + env config (Supabase URL, anon key). **No AI keys in app** — server only.
- Read v56 docs for each module before wiring (AGENTS.md rule).

## Phase 1 — Identity + data layer (1–2 days)

- Supabase client with `ExpoSecureStoreAdapter`, `persistSession: true`, `autoRefreshToken: true`.
- Silent `signInAnonymously()` on first launch → UUID persisted.
- Schema + Row Level Security (every table keyed to `auth.uid()`):
  - `goals` (name, category, cue, schedule, rudeness, escalation_speed, buddy_id, enabled)
  - `completions` (goal_id, status: done|skip|ignored, wave_reached, ts)
  - `streaks` (goal_id, current, longest)
  - `devices` (user_id, fcm_token, platform)
  - `roast_pool` (category, level, wave, text) — shared, not per-user
  - `buddy_links` (user_id, buddy_user_id, status)
- RLS policies + test with two anon users.

## Phase 2 — Goal CRUD + settings (2–3 days)

- Goal create/edit/list/delete UI (cap 5). Fields per §4.1 incl. cue.
- Per-goal: rudeness override, escalation speed, pause toggle.
- Global settings (§7.2): default rudeness, escalation speed, quiet hours, notification sound, sharing prefs.
- Persist to Supabase, optimistic local cache.

## Phase 3 — Notification engine (THE core, 3–5 days)

This is the risky, load-bearing piece. Build + test in isolation first.

- Permission request flow (iOS provisional/explicit).
- On goal save / app foreground: compute next goal fire time from schedule.
- **Schedule all waves at once** using `DATE` triggers:
  - Wave 1 @ T+0, Wave 2 @ T+15, Wave 3 @ T+30, Wave 4 @ T+45 (× escalation speed multiplier).
  - Each carries **pre-baked copy** pulled from cached pool + template-personalized (cue/name).
  - Store returned identifiers per (goal, wave).
- **On Done / Skip:** `cancelScheduledNotificationAsync` for remaining waves of that goal.
- Re-sync schedule on app foreground (re-pull fresh pool lines, reschedule next occurrence).
- Tap handling: `addNotificationResponseReceivedListener` + `DEFAULT_ACTION_IDENTIFIER` → deep link to goal, mark done.
- Respect quiet hours + per-goal pause.
- **Test matrix on real devices:** app foreground / background / force-quit; airplane mode; iOS + Android Doze; verify cancellation actually stops later waves.

## Phase 4 — Completion, skip, streaks (2 days)

- One-tap Done (from notification action + in-app). Updates `completions` + `streaks`.
- Skip flow with friction (§4.5): "I can't today" → reason → countdown → final roast → log skip (counts against streak).
- Streak math. **Decide ignored-vs-skip penalty** (§12 open q — lean: ignored harsher).
- Basic progress view: current/longest streak, done/skip/ignored counts.

## Phase 5 — Server-side generation + cost controls (2–3 days)

- Supabase Edge Function `generateRoast` behind swappable provider interface (§8.3).
- **Batch job (cron):** refresh `roast_pool` weekly per (category × level × wave). Shared pool, ~4,800 lines.
- **Post-generation safety filter** (§9.3): reject/regenerate lines crossing body/identity/mental-health/self-harm before they enter pool. De-identified prompt+completion logging. Kill switch + blocklist.
- App pulls pool lines on foreground; never calls the model directly.
- Free-tier generation caps (§8.4) — enforce server-side.

## Phase 6 — Social accountability buddy (2–3 days)

- Invite buddy by link/contact → `buddy_links`. Triggers email/OAuth upgrade prompt (need durable identity for the link).
- FCM setup: register token → `devices`. Edge Function sends buddy a push on user's completion AND skip.
- Buddy-side minimal view: "X completed / bailed on Gym."

## Phase 7 — Shareable cards (2 days)

- `react-native-view-shot` snapshots a styled roast card (watermarked) → image.
- `expo-sharing` one-tap to IG/TikTok/X/WhatsApp.
- Opt-in per card; strip location metadata; no perf data unless user adds it.

## Phase 8 — Onboarding (1–2 days)

- First-run: harsh-humor opt-in notice (§9.1), create first goal, set rudeness, request notification permission at the right moment (after value shown, not cold).

## Phase 9 — Hardening + ship (3–5 days)

- AI cost-per-active-user metric wired (§13). Tactic-wave conversion logging (which wave drives completion).
- GDPR delete/export path (§10).
- Real-device QA across the Phase 3 matrix.
- App Store / Play submission: framing, content notice, category Health & Fitness or Productivity.

---

## Risk register

| Risk | Mitigation |
|---|---|
| iOS kills background execution | Don't rely on it — local-scheduled + pre-baked copy. Live gen is server-only. |
| Notification timing drift / Doze | Real-device test matrix in Phase 3; local notifs survive Doze, verify. |
| Model refuses rude tone / flat comedy | Settled by §0.1 bake-off before build. |
| Anon-user orphan rows pile up | Post-v1 cleanup job (delete anon inactive 30d). Note, not a blocker. |
| Safety filter false-misses | §9.3 kill switch + blocklist + de-identified review logs. |

## Rough sequencing

Phases 0→1→2→3 are the critical path (the core loop). 5 (server gen) can run in parallel with 2 once schema exists. 6/7/8 layer on after the loop works. Estimate ~4–6 focused weeks solo for a shippable MVP, notification engine (Phase 3) being the variance.
