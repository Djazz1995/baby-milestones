# Product Requirements Document

## Baby Milestones — Private Baby Timeline & Memory App

**Version:** 1.0
**Last Updated:** July 2026
**Status:** Pre-development
**Platform:** iOS & Android (React Native + Expo), plus a Web app (Phase 2)

---

## 1. Product Overview

### 1.1 Summary

Baby Milestones is a private, family-first app for capturing a child's life from pregnancy onward — photos, videos, voice notes, and text moments arranged on a beautiful timeline. It automatically tracks how far along a pregnancy is and, once the baby is born, switches to showing the baby's age. Parents invite family (grandparents, partners) to follow along, react, and comment. Media is delivered at full quality via ImageKit, stored under GDPR-native, encrypted infrastructure.

The core loop: **capture a moment → it lands on the timeline → family sees it, likes it, comments.** Everything else (AI recaps, grandparent mode, exports, growth tracking) builds on that loop.

### 1.2 Vision

To be the private, calm, European alternative to posting your child on public social media — the place a family keeps the real archive of a childhood, with the people who actually matter. Where competitors bolt AI on as a gimmick, Baby Milestones uses it to do the one thing a busy parent never has time for: turn a month of scattered moments into a warm, readable story, automatically.

### 1.3 Core Premise

- Parent creates a **baby profile** — name + due date (pregnancy) or birthdate (born).
- The app shows a live **pregnancy or age indicator** ("22 weeks pregnant" → "8 months old"), switching automatically at birth.
- Parent captures **moments** (photo / video / voice / text), optionally tagged to a **milestone**.
- Moments appear on a **timeline homepage**, newest first.
- **Family members** invited as Owner or Viewer react and comment.
- Over time the app **narrates** the archive (AI recaps), **resurfaces** memories, and **exports** it (social, print, PDF).

### 1.4 Differentiators (why this over European competitors)

1. **AI narrative recaps** — humanized weekly/monthly stories, not just a photo grid.
2. **Grandparent mode + web app** — the least tech-savvy family member is a first-class user, no app install required.
3. **Pregnancy-through-childhood continuity** — one timeline from due date to years old.
4. **Privacy & GDPR-native** — encrypted at rest and in transit, EU data residency, no public feed, no ad targeting.

---

## 2. Target Audience

**Primary:** New and expecting parents (25–40), privacy-conscious, European, who want to document their child but are uneasy about public social media.

**Secondary:** Grandparents and extended family who want to follow the child without learning a complex app — served by grandparent mode and the web app.

**Tertiary:** Gift buyers (baby shower gifts, gift cards — Phase 4).

---

## 3. Roles & Permissions

| Role | Phase | Can do |
| --- | --- | --- |
| **Owner** | 1 | Everything: edit baby profile, post/delete moments, invite & manage family, approve contributors, manage billing. |
| **Viewer** | 1 | See the timeline, like, comment. Cannot post or edit. |
| **Contributor** | 2 | Post moments **subject to owner approval** before they appear on the timeline. |

- Multiple Owners allowed (both parents).
- Every moment and profile is private to the invited family; there is no public surface.
- Per-moment visibility controls (advanced) deferred to Phase 4.

---

## 4. Core Data Concepts

- **Baby / Child profile** — the subject. name, dueDate?, birthDate?, birthWeight?, birthLength?, parents[], displayFormat, photo. A family can have multiple children (Phase 2).
- **Moment** — one timeline entry. type (photo | video | voice | text), media, caption/body, capturedAt, authorId, milestoneId?, reactions, comments, tags[] (Phase 3), location? (Phase 3).
- **Milestone** — a named developmental event (first smile, first tooth…). Attached to a moment when logged. Standard set in Phase 1; custom milestones in Phase 4.
- **Family / Membership** — the invited people and their roles.
- **Reaction** — a like on a moment.
- **Comment** — threaded text under a moment.
- **Recap** (Phase 2) — an AI-generated narrative over a time window.

---

## 5. Age & Pregnancy Display (load-bearing, Phase 1)

The single most-visible piece of state. Rules:

- **Before birth** (only `dueDate` set): show pregnancy progress derived from due date — e.g. "22 weeks pregnant". Standard obstetric math: 40 weeks from LMP; weeks along = 40 − weeks-until-due.
- **At birth**: parent enters `birthDate`, `birthWeight`, `birthLength`. A **transition moment** is created automatically — a celebratory card: *"Welcome to the world, {name}."*
- **After birth** (`birthDate` set): show age, computed from birthdate to today.
- **User-chosen display format**, applied consistently everywhere age is shown:
  - **Weeks** — "34 weeks old"
  - **Months** — "8 months old"
  - **Years & months** — "1 year, 2 months old"
- Display recomputes on every app open (no stored stale age); timezone-safe (compute on calendar dates, not raw timestamps).

---

## 6. Screen / Page Inventory

Grouped by flow. Phase tag = when it ships. Deferred screens are listed but not built earlier.

### 6.1 Onboarding & Auth (Phase 1)

1. **Welcome / value prop** — one-line pitch, privacy promise.
2. **Sign up / sign in** — email (Supabase auth).
3. **Create baby profile** — name; toggle *expecting* vs *born*; due date **or** birthdate + weight + length; parent name(s); choose display format.
4. **Invite family (optional)** — send first invite link, pick role.
5. **Notification permission** — native push grant.

### 6.2 Core Loop (Phase 1)

6. **Timeline / Home** — reverse-chronological feed of moments; header shows baby name + live pregnancy/age indicator; FAB to add a moment. Empty state prompts first capture.
7. **Add moment** — pick type (photo / video / voice note / text); capture or select; add caption; optionally attach a milestone; set/confirm date.
8. **Moment detail** — full media, caption, author, date, milestone badge, likes, comments thread.
9. **Milestone tracker** — checklist of standard milestones (first smile, first laugh, first tooth, first solid food, first sitting, first crawl, first steps, first word); logging one creates/links a moment.
10. **Baby profile view/edit** — profile fields, birth stats, the pregnancy→age transition entry point.

### 6.3 Family & Social (Phase 1)

11. **Family / members** — list members + roles, invite, revoke, pending invites.
12. **Comments** — thread under a moment (surfaced in Moment detail; may be its own screen on mobile).

### 6.4 Settings & System (Phase 1)

13. **Settings** — account, language (NL/EN), display-format default, notifications, privacy/data (export & delete — GDPR), sign out.
14. **Notification + deep-link targets** — push taps route into the relevant moment / comment / invite.

### 6.5 Phase 2 additions

15. **Recaps** — weekly/monthly AI narrative cards; browse past recaps.
16. **Memory search** — conversational search ("show me her first steps", "beach photos") over the archive.
17. **Grandparent mode** — simplified, large-text timeline variant; togglable per device/user.
18. **Calendar view** — moments arranged by date; jump to a day.
19. **"On this day"** — resurfaced memories from prior years on the same date.
20. **Child switcher** — multiple child profiles under one family.
21. **Web app** — full timeline + view/comment in the browser (grandparent-friendly; no install).

### 6.6 Phase 3 additions

22. **Social export studio** — IG Stories/Reels & TikTok templates, AI captions, standard share (WhatsApp / download).
23. **Pregnancy journal** — dedicated pre-birth capture space.
24. **Growth tracker** — height/weight charts over time.
25. **Milestone prompts** — age-driven "what to look for" nudges.
26. **Map view** — moments plotted by location; per-moment location tagging.
27. **Photo book / yearbook export** — print-ready layout.

### 6.7 Phase 4 additions

28. **Custom milestones** — user-defined milestone types.
29. **Gift card flow** — buy/redeem a gift (baby shower).
30. **Advanced privacy controls** — per-moment visibility.
31. **PDF/digital baby book export**.
32. Settings gains **FR/DE language**, **AI tone personalisation**, **auto-milestone detection** review surface.

---

## 7. Phased Scope

### Phase 1 — Foundation (MVP)

*Goal: core product in the hands of first families; prove the capture→timeline→react loop.*

- Photo & video uploads (full quality, delivered via **ImageKit**)
- Text entries
- Voice notes
- Timeline homepage (photo/video/text/voice moments, reverse-chronological)
- Baby profile: name; due date **or** birthdate; birth weight & length; parent name(s); **automatic pregnancy display**; **automatic age display**; **user-chosen format** (weeks / months / years+months); **birth transition moment**
- Family invite — **Owner** and **Viewer** roles
- Like & comment on moments
- iOS & Android apps
- **Dutch & English** localization
- **Encryption at rest and in transit**
- **GDPR-native** data storage (EU residency, export & delete)
- **Basic milestone tracker** (8 standard milestones listed in §6.2)

### Phase 2 — AI & Grandparent Differentiation

*Goal: activate the features that separate this from every European competitor.*

- Weekly & monthly **AI narrative recaps** (humanized)
- **Conversational memory search**
- **Grandparent mode** — simplified UI, large text
- **Web app** — grandparents need no app
- **Weekly email digest** to family, automatic
- **Contributor role** with owner-approval flow
- **Calendar view**
- **"On this day"** memory resurfacing
- **Multiple child profiles**
- **Dark mode**

### Phase 3 — Social & Depth

*Goal: drive sharing, retention, word-of-mouth.*

- Instagram Stories/Reels & TikTok export with milestone templates
- AI-generated social captions
- Standard share (WhatsApp, download)
- Pregnancy journal (pre-birth capture)
- Growth tracker (height/weight chart)
- Milestone prompts ("your baby is 3 months — here's what to look for")
- Map view of memories
- Location tagging on moments
- Tags (first smile, funny moments, …)
- Physical photo book / yearbook export
- Offline mode, syncs when reconnected

### Phase 4 — Scale

*Goal: expand market, deepen the product.*

- French & German language support
- Auto-detection of milestones from photos (AI)
- PDF / digital baby book export
- Gift card (baby shower gift)
- Custom milestones
- Advanced visibility controls (per-moment privacy)
- AI tone personalisation — recaps adapt to how you write over time

---

## 8. AI Features (Phase 2+)

- **Recaps** — batch job summarizes a week/month of moments into a warm narrative. Runs server-side (Edge Function / cron), never blocking the capture path. Humanized tone; avoids listy, robotic phrasing.
- **Memory search** — natural-language query over the family's own archive (captions, milestones, dates, later tags/location). Scoped strictly to that family's data.
- **Social captions** (Phase 3) — draft captions for export.
- **Auto milestone detection** (Phase 4) — vision suggests a milestone from a photo; **always parent-confirmed before it's logged** (no silent auto-tagging).
- **Provider-swappable** — generation lives behind a thin interface; the vendor is a config choice, and prompts/data residency are checked against §10 for EU users.
- **AI tone personalisation** (Phase 4) — recaps adapt to the owner's own writing style over time.

---

## 9. Privacy, Security & Compliance

- **Encryption in transit** (TLS) and **at rest** (storage + database) — Phase 1, non-negotiable.
- **GDPR-native**: EU data residency; user can **export all data** and **delete all data** (account + child) from Settings.
- **Private by default** — no public feed, no discovery, no ad targeting, no data selling.
- **Media**: originals stored under EU residency; delivered/transformed via ImageKit. AI processing (Phase 2+) is scoped to the family's own data and checked for provider residency.
- **Roles enforce access** — Viewers/Contributors never exceed their permission; enforced server-side (RLS), not just in UI.
- **Children's data** — treat with heightened care; no third-party analytics on media content.

---

## 10. Localization

- **Phase 1:** Dutch (nl) + English (en). nl and en at parity.
- **Phase 4:** French (fr) + German (de).
- All user-facing copy, dates, age/pregnancy strings, and AI output respect the active locale.

---

## 11. Success Metrics

- **Activation** — % of new families that post ≥3 moments in week 1.
- **Family graph** — invites sent per owner; % of invites accepted (the retention moat is a watching grandparent).
- **Capture cadence** — moments per active family per week.
- **Phase-2 recap engagement** — recap open + digest email open rates.
- **Retention** — D30 / M3 family retention (a baby archive is a long-horizon product).
- **Media reliability** — upload success rate, delivery latency via ImageKit.

---

## 12. Open Questions

- **Monetization** — free tier limits (children, storage, AI recaps?) vs paid; gift cards (Phase 4) imply a purchasable SKU. To confirm.
- **Storage economics** — full-quality photo+video per family is the main cost driver; caps/tiers to be modeled.
- **Video length limits** — max duration/size per moment for Phase 1.
- **Auth model** — email-only vs social sign-in for Phase 1.
- **Email digest provider** (Phase 2) — transactional email vendor + EU residency.
- **Auto-milestone detection UX** (Phase 4) — how aggressively to suggest without feeling creepy.

---

_End of PRD v1.0_
