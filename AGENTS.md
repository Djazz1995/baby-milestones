# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# Product Requirements Document

## RoastMode — AI-Powered Brutal Motivation App

**Version:** 2.0
**Last Updated:** June 2026
**Status:** Pre-development (pending content-validation gate — see Section 0)

---

## 0. Pre-Build Validation Gate (NEW — do this before writing app code)

The core thesis is "the comedy is the marketing." Test that directly, with zero app code, before committing build months.

- Run a faceless TikTok/IG account posting AI-generated roasts as standalone content.
- Run 2–3 niches in parallel (gym / study / chores) to find the wedge.
- Native format: lock-screen notification stacks + photo-verdict bits (highest-comedy moment).
- **Pass condition:** at least one niche shows organic share/save velocity (not just likes) within ~2 weeks.
- **If nothing travels as posts, it won't travel as an app — stop here.**

The winning niche becomes the launch wedge and paid-ad targeting seed. Reuse a simple `next/og`-style card renderer to mass-produce notification mockups.

### 0.1 Model Bake-Off (NEW — do before locking the AI provider)

The whole product is "is it actually funny." Don't pick the model by price; pick by funny-per-dollar, then confirm it won't refuse the tone. Run a head-to-head before writing generation code.

- **Candidates:** Kimi (Moonshot), DeepSeek, Claude Haiku — plus Claude Sonnet as the quality reference.
- **Test set:** the real prompts for each (category × rudeness level × wave), including the full Tier 4 / "Unhinged" prompts.
- **Score each model on:**
  1. **Funny** — is the roast actually sharp, or flat/generic?
  2. **Refusal / flattening** — does it produce mean-but-not-cruel, or refuse / sand the edge off?
  3. **Safety filter pass rate** — does output clear the Section 9.3 post-generation filter without constant regeneration?
  4. **Data residency** — non-EU hosting (e.g. Moonshot is China-hosted) flagged against GDPR (Section 10).
- **Pick:** the funniest model that does NOT refuse the rude tone. Cost differences are trivial at cached-pool volume (Section 8.4), so cost is a tiebreaker, not the driver.
- **Output feeds Section 8.3** — the winner becomes the default behind the swappable provider interface.

---

## 1. Product Overview

### 1.1 Summary

RoastMode is a mobile app (iOS & Android) that uses AI to motivate users through funny, harsh, relentless notifications **that escalate in tactic, not just volume**. Users set goals across categories like gym, studying, chores, or any custom habit. If they don't act, the AI shifts strategy — shrinking the task, invoking stakes, then going full theatrical roast. Completion is logged by tap (with optional social witness). The comedy is the product *and* the marketing; the behavioral nudges underneath are what actually move the user.

### 1.2 Vision

To be the app people screenshot and share before they've opened it twice — and keep because it actually gets them off the couch. Every notification should be postable on its own. Harsh-but-funny is the acquisition moat; real behavior change is the retention moat.

### 1.3 Core Premise

- User sets a goal (e.g. "Gym, Monday/Wednesday/Friday, 7am")
- They get a push notification at the scheduled time
- If ignored, notifications escalate **through behavioral tactics** (shrink the task → stakes/social → full roast), not merely louder repetition
- To complete: tap to mark done (optionally witnessed by an accountability buddy)
- Streaks, stats, and shareable roast cards track progress over time

---

## 2. Target Audience

**Primary:** 18–32 year olds who have tried (and failed with) polite reminder apps. People who respond better to being called out than coddled. Gym culture, study grind, productivity communities.

**Secondary:** People buying it as a gift for a lazy friend or partner.

**Psychographic:** Enjoys self-deprecating humor, shares memes about their own procrastination, uses apps socially.

---

## 3. Motivation Mechanism (NEW — the actual function)

This section governs Section 3.4's escalation. Rudeness alone does not reliably motivate — for many it triggers avoidance ("I'm failing, I'll mute it"). The app must wrap proven behavioral levers in comedy, not substitute comedy for them.

### 3.1 The Golden Rule (load-bearing)

**Roast the excuse and the behavior. Never roast the person.**
Behavior-roast → "do the thing." Person-roast → shame → avoidance. This is the line between motivating and harming, and between store-compliant and banned.

### 3.2 The Behavioral Levers

- **Implementation intention** — tie the goal to a concrete cue (when/where/trigger): "Mon 7am, bag by the door."
- **Tiny first step** — when ignored, shrink the ask ("just put your shoes on"), don't raise the volume. Lowering activation energy is the single strongest anti-procrastination lever.
- **Stakes / loss aversion** — optional commitment mode (money or reputation on the line). Loss aversion beats nagging.
- **Social accountability** — a real person sees the proof. Shame works when witnessed.
- **Identity reinforcement** — "You showed up 4 times. That's just who you are now." Roast can build identity, not only mock.
- **Variable reward** — unpredictable comedic verdicts keep the dopamine loop alive.

### 3.3 Escalation = Tactic Ladder, Not Volume Ladder

When a goal is ignored, the app **changes strategy each wave** rather than just getting louder:

- **Wave 1 (0 min) — Snark / cue.** Light, points at the concrete trigger.
- **Wave 2 (+15 min) — Shrink the task.** "Forget the workout. Put the shoes on. That's the whole assignment."
- **Wave 3 (+30 min) — Stakes / social.** "Want me to tell your accountability buddy you bailed? Last chance."
- **Wave 4+ — Full roast / lore.** The theatrical, maximally shareable payoff.

Each wave maps to a lever in 3.2. The harshness is *functional* — a nudge ladder that happens to be funny, not a comedy generator that happens to nag.

---

## 4. Core Features

### 4.1 Goal Setup

Each goal has:

- **Name** — e.g. "Gym", "Study Session", "Clean the Bathroom"
- **Category** — Gym / Study / Chores / Diet / Sleep / Custom
- **Cue** (NEW) — optional concrete trigger text ("bag by the door") used in Wave 1
- **Schedule** — specific days, time of day, or interval (every X hours)
- **Rudeness level** — per goal (see Section 6)
- **Escalation speed** — Slow / Normal / Unhinged
- **Accountability buddy** (NEW, optional) — a contact who witnesses completions/skips

### 4.2 Push Notifications & Escalation

Driven by the Section 3.3 tactic ladder. All copy AI-generated (Claude API) with goal name, category, cue, rudeness level, escalation wave, day of week, and recent history as context. No two notifications identical.

**Sample escalation — gym goal, 9am, ignored (tactic ladder):**

- 9:00am (snark/cue): _"Your gym shoes are by the door. They're just sitting there. Staring at you."_
- 9:15am (shrink task): _"New deal: forget the workout. Just put the shoes on and stand up. That's the entire assignment. Go."_
- 9:30am (stakes/social): _"Third skip this week. Want me to let Marco know, or are you going to handle this yourself?"_
- 9:45am (full roast/lore): _"The Council of Goals has reviewed your case. Verdict: the couch wins again. Appeal available by actually standing up."_

### 4.3 Completion & Self-Report

- One-tap "Done" from notification or app marks the goal complete, updates streak.
- If an accountability buddy is set, completion (and skips) are shared to them.
- **Photo verification is NOT in v0** — see Section 4.4 and Section 10.

### 4.4 Photo Verification (DEFERRED to v1.1 — rationale)

Originally v1.0. Moved out because:
- Vision judging "is this a gym?" misfires both ways: false FAIL → rage-uninstall ("I DID go"); false PASS → feature is pointless.
- Adds vision-API cost to every completion.
- The highest-comedy moment is also the highest-frustration moment; ship the core loop first.

When added: Claude Vision returns PASS / WEAK / FAIL with a roast verdict. The failed-photo verdict remains the single highest-comedy surface and gets the most copy investment. Ship behind a flag, measure false-rejection complaints before defaulting on.

### 4.5 Skip / Silence Mechanic

Silencing a goal for the day is possible but not frictionless.

**Skip flow:** tap "I can't today" → confirm → select reason → confirm with a short countdown → final roast → skip granted, recorded, counts against streak. Frequent skippers get called out in the weekly summary.

**Sample skip roast:** _"Got it. Skipping the gym today because of 'plans.' Logged. Judged. Moving on."_

### 4.6 Social Accountability (PULLED FORWARD into MVP)

A real human witness is the strongest retention lever, so a minimal version ships in v1.0:

- Optional accountability buddy per goal (invite by link/contact).
- Buddy receives a notification on the user's completion and skip.
- v1.1 expands to "friend sets a goal for you" and "friend judges your proof photo."

This is the retention engine, not a nice-to-have. Comedy gets users in; a watching friend keeps them past day 14.

### 4.7 Progress Tracking

Per goal: current/longest streak, completion rate (7/30/90d), completions vs skips vs ignored, "roasts received" badge, timeline.
Overall: all goals at a glance (done/pending/skipped), weekly summary notification (v1.1).

### 4.8 Social Sharing

Every notification and verdict generates a shareable, watermarked card. One-tap to Instagram Stories, TikTok, X, WhatsApp. Sharing is opt-in per card; no performance data shared unless the user adds it. "Roast of the Week" surfaces the funniest line (v1.1).

---

## 5. Retention Strategy (NEW — beating the day-14 novelty cliff)

The known failure mode: install → screenshot → share → delete in two weeks. Defenses, in order of power:

1. **It actually works.** Behavioral levers (Section 3) drive real completions; users keep the app that gets results. Outcome retention > joke retention.
2. **Social witness (Section 4.6).** A human watching is stickier than any AI line.
3. **It learns you.** Callbacks to the user's *specific* excuses sharpen over weeks → becomes "your" roaster; generic clones can't replace it. This is the switching cost.
4. **Freshness engine.** Rotate personas, unlock new "characters"/lore over time, seasonal events — so the comedy never feels on loop.
5. **Variable reward + streak loss-aversion.** Unpredictable verdicts + visible streak you don't want to break.
6. **Identity.** Reinforce "you're becoming someone who shows up."

Retention target stays D7 40%+ but is explicitly treated as the primary product risk, validated with the stripped MVP before scaling spend.

---

## 6. Rudeness Levels

Global default with per-goal override. Four tiers:

| Level | Name | Tone |
|---|---|---|
| 1 | Mild Disappointment | Sarcastic but gentle. Disapproving parent. |
| 2 | Drill Sergeant | Loud, direct, no excuses entertained. |
| 3 | Full Roast | Comedic and brutal. Jokes at your expense. |
| 4 | Unhinged | Absurdist, theatrical. Maximum chaos. |

Every generation call is briefed on the current level. Tier 4 may include fake lore ("The Council of Goals"), running gags, callbacks.

**Hard limits at all levels:** No comments on body, weight, appearance, identity, or mental health. Roast the excuse and the behavior, never the person's worth. Keeps it funny, store-compliant, and not harmful. (See Section 9 for moderation.)

---

## 7. Settings

### 7.1 Per-Goal
Name, category, cue, schedule, rudeness override, escalation speed, accountability buddy, notifications on/off (pause without deleting).

### 7.2 Global
Default rudeness, default escalation speed, quiet hours, weekly summary on/off (v1.1), sharing preferences (always watermark / never share location metadata), notification sound (standard / drill whistle / foghorn / silent).

---

## 8. Tech Stack

### 8.1 Mobile
- **React Native (Expo)** — single codebase iOS + Android. Handles local notification scheduling and deep links from notification tap.

### 8.2 Backend
- **Supabase** — accounts, goals, completion history, streaks, buddy links.
- **Firebase Cloud Messaging (FCM)** — push delivery both platforms.
- **Scheduled jobs** — Supabase Edge Functions / cron to trigger generation at goal times.

### 8.3 AI (provider-swappable — NOT locked to one vendor)
- **Generation goes behind a thin provider interface**, not hardcoded to one vendor. A single `generateRoast(context)` abstraction wraps whichever model wins the bake-off (Section 0.1). Swapping providers must be a config change, not a refactor.
- **Default candidate: Anthropic Claude (claude-sonnet-4-6)** for comedy quality and reliable handling of the rude-but-not-cruel tone; **vision verdicts (claude-sonnet-4-6)** when 4.4 ships. But the choice is decided by the bake-off, not assumed.
- **Cost-tier candidates for batch generation:** Kimi (Moonshot), DeepSeek, Gemini Flash, Claude Haiku. At cached-pool volume (Section 8.4) per-token price is near-irrelevant — pick on comedy + refusal behavior, not headline price.
- **Two non-price selection criteria that matter more than cost:**
  - **Refusal / flattening** — the model must do mean-but-not-cruel (Tier 4) without refusing or sanding the edge off. Test exact Tier 4 prompts before committing.
  - **Data residency / GDPR (Section 10)** — some cheap providers are non-EU-hosted (e.g. Moonshot is China-hosted). Confirm where prompts + logs go before using for EU users.
- Prompt context: goal name, category, cue, rudeness level, escalation wave + mapped tactic, recent history, day of week.

### 8.4 AI Unit Economics (NEW — decided, not open)
Per-user generation cost is a real constraint on a free tier. Controls:
- **Pre-generate + cache** a pool of wave-appropriate lines per (category, level, wave); personalize only the top layer (cue, name, callback) at send time.
- **Caching makes per-token price near-irrelevant.** Lines are a *shared* pool reused across all users, not per-user. Rough volume: 6 cat × 4 level × 4 wave × ~50 lines ≈ 4,800 lines, generated once and refreshed (e.g. weekly) — pennies on any candidate model. → optimize comedy quality, not headline token price.
- **Personalization layer = template string, not an API call, in v1.** Inserting cue/name/callback into a cached line is string interpolation. Live inference at send time is avoided entirely for v1 unless a feature provably needs it.
- **Batch** generation off-peak; avoid a live API call per push where a cached variant works.
- **Free tier caps** generation volume; **Unhinged tier + multi-goal are paid** (covers cost and creates the upgrade reason).
- Track **AI cost per active user** from day 1 as a first-class metric.

### 8.5 Media
- Verification photos (v1.1) to Supabase Storage; processed by Anthropic API, not stored long-term without opt-in.
- Shareable cards generated client-side or via a light image service.

---

## 9. App Store Compliance & Moderation

### 9.1 iOS
- Framed as opt-in tough-love; rudeness is user-controlled → content is self-directed.
- No slurs, no targeting protected groups, no body shaming.
- Precedent: Carrot Fitness (similar harsh/sarcastic tone, years on store).
- Category: Health & Fitness or Productivity.
- First-launch notice: "This app uses harsh humor. Content is opt-in and user-controlled."

### 9.2 Google Play
More lenient; same content rules, lower review risk.

### 9.3 Generation Guardrails (NEW)
AI generating "brutal" content is a brand/store gun, especially Tier 4. Controls:
- System prompt enforces the golden rule + hard limits on every call.
- **Post-generation safety filter** (classifier or rules) rejects/regenerates lines crossing body/identity/mental-health/self-harm lines before send.
- Server-side logging of prompts + completions for abuse review (de-identified).
- Kill switch + line-level blocklist for anything that slips through.

---

## 10. Privacy & Data

- Verification photos (when shipped) processed by Anthropic API, not stored beyond session unless user opts into a "proof history" feature.
- Goal data private by default; sharing always opt-in, per-card.
- No data selling, no ad targeting.
- GDPR compliant (EU users can request/delete all data).
- Generation logs de-identified.

---

## 11. MVP Scope (v1.0)

**Include:**
- Goal creation (up to 5 goals) with cue field
- Push notifications with AI-generated copy
- **Tactic-ladder escalation (3–4 waves, Section 3.3)**
- Self-report completion (tap)
- **Minimal social accountability buddy (Section 4.6)**
- Rudeness levels (all 4) with post-generation safety filter
- Basic streak tracking
- Skip mechanic with friction
- Shareable notification cards
- Onboarding flow
- AI cost controls: cached line pool + free-tier caps (Section 8.4)

**Defer to v1.1+:**
- Photo verification + verdicts (Section 4.4)
- Weekly summary notifications
- "Friend sets/judges your goal" multiplayer
- Custom escalation intervals
- "Roast of the Week"
- Detailed analytics dashboard
- Wearables / widgets

---

## 12. Open Questions

- **Monetization:** Free = 1 goal + Levels 1–3, capped generation. Paid ($2.99/mo or $14.99/yr) = up to 5 goals + Unhinged + accountability buddy. One-time vs sub still to confirm — but gating decided enough to model.
- **Ignored vs skipped:** Treat a silently-ignored goal differently from an explicit skip in streak math? (Lean: ignored = harsher streak penalty, since explicit skip at least engages.)
- **Proof wall:** Optional opt-in gallery of completion photos when 4.4 ships.

---

## 13. Success Metrics

- **Content-gate (Section 0):** organic shares/saves per post on the validation account — the go/no-go before build.
- **D7 retention** — target 40%+; treated as the primary risk metric.
- **Notification open rate** — target 30%+ (vs ~10% industry).
- **Tactic-wave conversion** (NEW) — at which wave do completions actually happen? Tells you whether "shrink the task" / "stakes" beats "full roast" at driving action. Tune the ladder on this.
- **Organic shares/week** — growth metric, via UTM on cards.
- **Streak length distribution** — habit formation vs novelty.
- **AI cost per active user** (NEW) — unit economics guardrail.

---

_End of PRD v2.0_
