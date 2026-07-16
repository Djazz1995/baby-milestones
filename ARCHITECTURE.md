# Architecture — Baby Milestones

**Companion to [PRD.md](PRD.md).** Defines the layered, service-based frontend architecture for the Baby Milestones app. Same architectural pattern as the Shoply AI app — strict **model + service** separation, the UI decoupled from the backend schema — with Shoply's **Payload CMS + Postgres** backend, consumed here by a **React Native + NativeWind + Expo** mobile client.

**App:** React Native (Expo SDK 54) + expo-router + NativeWind (Tailwind), gluestack-ui v3 primitives.
**Backend:** **Payload CMS** (collections, auth, access control) on **Postgres**. The mobile app talks to Payload over its **REST/GraphQL API** (the Payload Local API is server-only and not used from the app).
**Media delivery:** Hetzner Object Storage (S3-compatible, EU) via a **signed `/api/media/file/...` proxy** — the CMS 302-redirects to a ~2h presigned URL, access-gated by family scope. No keys client-side. (Supersedes an earlier ImageKit plan.)
**AI:** batch/server-side (Payload jobs / a companion service) behind a swappable provider interface.

---

## 1. Guiding principle (from Shoply)

**The application never touches backend response shapes directly.** Data flows through layers, and only **models** cross into the UI:

```
Data (Payload API / signed media / AI)  →  Service  →  Model  →  Application (screens / components)
```

- **Models** are the *only* data shapes screens and components import. No Payload document shapes, no collection field names, no `createdAt`/`_status`/relationship-id internals above the service layer.
- **Services** own **all** I/O (Payload REST/GraphQL calls, media upload, signed media-URL resolution, AI triggers), map raw Payload docs → models, and **throw on error**. Services are plain, framework-agnostic TypeScript — testable without React.
- **Hooks** are thin React wrappers over services: hold loading/error state, **catch**, expose models to screens.
- **Screens/components** call **hooks only** — never services, never `lib`, never the Payload client.

Why: schema changes ripple only into mappers; the frontend contract stays clean, typed, and testable; and the backend stays swappable.

---

## 2. Layers

```
src/
  models/       pure data shapes (TS types/interfaces) — no logic, no I/O
  services/     business logic + all I/O; return models; throw on error
    mappers/    pure doc→model translators (Payload doc → model, resolve media URLs)
  hooks/        thin React wrappers (useTimeline, useBaby, useFamily…); state + catch
  lib/          thin SDK clients (payload API client, media signed-URL builder, notifications, ai provider)
  screens/      UI (PRD §6 pages) — call hooks only
  components/    shared UI (gluestack v3 + NativeWind), reused across screens
  theme/        design tokens (NativeWind / gluestack token scale)
  app/          expo-router route files → mount screens
```

**Flow:** `screens → hooks → services → lib`. Models flow back up.

**Rules:**

- Screens import **models** (for typing) and call **hooks**. They never import `services` or `lib`.
- Services are plain TS. They return the model directly and **throw** on error.
- Hooks (`useTimeline`, `useMoment(id)`, `useBaby`, `useFamily`, `useMilestones`, `useComments`, `useReactions`, `useSession`, `useUser`, `useRecaps`, `useSearch`, and Phase-2 `useStoryDraft`, `usePrompts`, `useImport`, `useEvents`, `useEntitlement`) wrap services, hold loading/error, and catch.
- `lib` wraps the Payload API client + vendor SDKs so providers stay swappable.
- Style with **NativeWind classes on the gluestack v3 token scale** — no hardcoded hex. Recolor = single token swap.

---

## 3. Models (`src/models`)

Only what the UI needs — no Payload doc internals, no relationship ids, no `_status`.

| Model | Core fields | PRD |
| --- | --- | --- |
| `Baby` | id, familyId, **name?** (optional in pregnancy — may be a bump nickname or empty; **required at birth**), **gender?** (girl \| boy \| surprise — optional, neutral, no gendered UI), dueDate?, birthDate?, birthWeight?, birthLength?, parents[], displayFormat, photo? | §4, §5 |
| `AgeDisplay` | phase (pregnancy \| born), value, unit, label (e.g. "8 months old") | §5 |
| `DisplayFormat` | enum: weeks \| months \| yearsMonths | §5 |
| `Moment` | id, babyId, type, **media[] (ordered, images+videos mixed)**, voiceNote?, caption?, body?, capturedAt, authorId, milestoneId?, **eventId?** (Phase 2 — groups under a shared Event), **weightGrams?**, **lengthCm?** (optional measurements captured with the moment → feed the growth chart), reactionCount, commentCount, tags[]?, location? | §4, §6.2 |
| `MomentType` | enum: media \| voice \| text — **derived from content, not user-chosen**: media[] non-empty → `media`; else voiceNote → `voice`; else `text`. (`media` = 1+ images/videos, mixed; a single photo = `media` with one item.) | §4 |
| `Media` | id, kind (image\|video\|audio), url, thumbUrl?, width?, height?, durationSec? — `url`/`thumbUrl` are **signed proxy paths** built from the CMS `sizes` (thumbnail/card/full) | §4 (Payload media, signed delivery) |
| `Milestone` | id, key, label, loggedMomentId?, loggedAt? | §4, §6.2 |
| `Family` | id, name, memberCount | §3 |
| `Membership` | id, familyId, userId, role (owner\|viewer\|contributor), inviteStatus | §3 |
| `Reaction` | id, momentId, userId, **emoji?** (Phase 2 — beyond a single like), createdAt | §4 |
| `Comment` | id, momentId, authorId, body, createdAt | §4 |
| `Recap` | id, babyId, period (week\|month\|**year**), rangeStart, rangeEnd, narrative, **narrationAudioUrl?** (TTS), **translations?** (per-locale narrative), **highlightMomentIds[]**, coverMomentId? | §8 (Phase 2) |
| `Event` | id, babyId, title, date, coverMomentId?, momentCount — **a named occasion grouping moments**; family members contribute | §6.2 (Phase 2) |
| `Prompt` | id, key, text (localized), phase/ageBucket — an age-keyed capture nudge | §6.2 (Phase 2) |
| `Entitlement` | plan (free\|premium), status, renewsAt, caps (storageBytes, aiStoriesPerMonth) — the family's subscription state | §12 (Phase 1) |
| `SearchResult` | momentId, snippet, score | §8 (Phase 2) |
| `GrowthPoint` | momentId, measuredAt, weightGrams?, lengthCm? — **derived from moments** that carry a measurement (+ the birth stats as the first point); no separate stored entity | §6.6 (Phase 3) |
| `User` | id, email, displayName, locale, defaults (displayFormat, darkMode) | §7 |
| `NotificationPayload` | type, targetId, deepLink | §6.4 |
| `Paginated<T>` | items[], nextCursor? | timeline paging |

`AgeDisplay` is **derived**, not stored — the age/pregnancy mapper computes it from `Baby` + today's date at read time (§5: never store stale age).

---

## 4. Services (`src/services`)

Each service calls `lib` (the Payload API client, media signed-URL builder, AI), applies the current user's family scope, **maps docs → models**, and returns models only. Throw on error.

| Service | Responsibility | Key methods → returns |
| --- | --- | --- |
| `BabyService` | baby profile CRUD, birth transition | `get(id)→Baby`, `create/update`, `recordBirth(id, {date,weight,length})→Baby` (also creates the transition Moment) |
| `AgeService` | pregnancy/age computation | `compute(baby, atDate)→AgeDisplay` (pure; no I/O). Fed `today` for the header's live age; fed `moment.capturedAt` for a moment's **age-at-capture** (pre-birth → pregnancy weeks). Same fn, different date. |
| `MomentService` | timeline CRUD + media | `list(babyId, cursor)→Paginated<Moment>`, `get(id)→Moment`, `create(input)→Moment`, `delete(id)` |
| `MediaService` | upload + signed URLs | `upload(file)→Media` (multipart to Payload `media`), `urlFor(filename, size)→string` (signed `/api/media/file/...` proxy; picks a `sizes` variant) |
| `MilestoneService` | standard + logging | `list(babyId)→Milestone[]`, `log(babyId, key, moment)→Milestone` |
| `FamilyService` | family + invites + roles | `members(familyId)→Membership[]`, `invite(contact, role)→Membership`, `setRole`, `revoke`, `approveContribution(momentId)` (Phase 2) |
| `ReactionService` | likes | `like(momentId)→Reaction`, `unlike(momentId)` |
| `CommentService` | comments | `list(momentId)→Comment[]`, `add(momentId, body)→Comment`, `delete(id)` |
| `RecapService` | read AI recaps | `list(babyId)→Recap[]`, `get(id)→Recap` (reads batch-generated docs — weekly/monthly/yearly, incl. narration audio + per-locale translation; **no live AI call**) |
| `StoryService` | on-demand AI story | `draft(input)→string` — per-moment bullets → warm prose; **user-triggered, async, optional**; server owns the vendor via the CMS `/api/ai/story` endpoint. **Not on the capture hot path** — the moment saves without it (Phase 2). |
| `PromptService` | capture prompts | `today(babyId)→Prompt` — localized, age-keyed nudge; delivered via push (Phase 2). |
| `ImportService` | photo auto-import | on-device camera-roll grouping (`expo-media-library`); confirmed day-groups → moments. **Opt-in; nothing uploads without confirm** (Phase 2). |
| `EventService` | events | `list/create/get`; `MomentService.create` accepts an `eventId` to group a moment under an Event (Phase 2). |
| `EntitlementService` | subscription gating | `get()→Entitlement`; the UI gates features on plan + caps. **Payload is the source of truth** — a RevenueCat webhook writes plan status onto the family; the app mirrors, never decides (§12, Phase 1). |
| `SearchService` | memory search | `query(babyId, text)→SearchResult[]` (Phase 2) |
| `GrowthService` | growth chart data | `points(babyId)→GrowthPoint[]` — reads moments with `weightGrams`/`lengthCm` (+ birth stats), maps to points; measurements are written via `MomentService` on the moment, not a separate `add` (Phase 3) |
| `ShareService` | export cards / social | `buildCard(momentOrRecap)→Media`, `export(target)` (Phase 3) |
| `UserService` | profile, defaults, locale | `getUser()→User`, `updateDefaults()` |
| `SessionService` | auth (Payload) | `ensureSession()`, `signIn`, `signOut` |

**Shared read helper** (mirrors Shoply's `getPublished`): an internal `scoped(collection, query)` wrapper that always adds the current user's family filter, so no service can request another family's data. Payload **access control** enforces the same rule server-side — the helper is defense-in-depth, not the only guard.

**Mappers** (`src/services/mappers/`): pure `toBaby(doc)`, `toMoment(doc)`, `toMedia(doc)`, `toRecap(doc)`… — Payload doc → model, resolve media/upload docs → signed proxy URLs, compute derived fields, strip internal fields. Payload's generated `payload-types` live **inside** mappers as input only — never above the service layer.

---

## 5. Lib (`src/lib`) — swappable SDK wrappers

| Module | Wraps | Notes |
| --- | --- | --- |
| `payload.ts` | Payload REST/GraphQL client | typed `fetch` wrapper: base URL from `EXPO_PUBLIC_PAYLOAD_API_URL`, attaches the auth token, GET/POST/PATCH/DELETE. The **only** module that knows the API shape. |
| `auth.ts` | Payload auth endpoints | login / me / refresh; token persisted via `expo-secure-store`. |
| `media.ts` | signed media proxy | builds `/api/media/file/:filename` URLs + picks a `sizes` variant (thumbnail 320² / card 768w / full 1600w). Delivery is a 302 → ~2h presigned URL (follow redirects); access-gated by Payload family scope. No secret keys in the client. |
| `notifications.ts` | `expo-notifications` | local + push scheduling, tap deep-link routing (+ capture prompts, Phase 2). |
| `ai/provider.ts` | `generateStory` / `generateRecap` / `translateRecap` / TTS / `searchMemories` interface | **swappable vendor.** `generateStory` is **on-demand** (user-triggered, via the CMS `/api/ai/story` endpoint); recaps + translation + TTS are **server-side/batch** — the app never calls them live. EU residency + no-train per §9. |
| `mediaLibrary.ts` | `expo-media-library` | read the camera roll for auto-import; permission-gated, opt-in, on-device grouping (Phase 2). |
| `shareIntent.ts` | share extension / `expo-share-intent` | receive media shared **into** the app from the OS share sheet → quick-capture. Needs a custom dev build (Phase 2). |
| `billing.ts` | RevenueCat / `expo-in-app-purchases` | subscriptions; entitlement resolved from a Payload field written by the RevenueCat webhook (§12). Needs a custom dev build (Phase 1). |

---

## 6. Where AI lives (Phase 2+)

Mirrors Shoply's "no live inference on the hot path" discipline — with **one deliberate, contained exception** (AI Story Assist):

- **AI Story Assist** (Phase 2) is the **only user-triggered** generation. It's **explicit, async, and optional**: the parent taps "Write my story", the call runs behind a loading state via the CMS `/api/ai/story` endpoint, and **the moment always saves without it** (AI down / offline / over-quota → plain editable caption). `StoryService` never blocks capture. This is an *assist*, not a step in the hot path.
- **Recaps** generate in a **batch job** (a Payload job / cron or companion service) → write `Recap` docs (weekly/monthly/yearly, incl. **TTS narration audio** + **per-locale translations**). `RecapService` only **reads** them. The capture and timeline paths never wait on AI.
- **Memory search** runs server-side (a Payload endpoint) against the family's own data; `SearchService` calls that endpoint, maps results to `SearchResult`.
- `ai/provider.ts` is the **only** place a vendor SDK is named; swapping providers is a config change, not a refactor. Prompts + data residency are validated against PRD §9 for EU users.
- **Auto-milestone detection** (Phase 4) suggests; the parent confirms before `MilestoneService.log` writes anything.

---

## 7. Data & security posture (maps to PRD §9)

- **Payload access control is the real access boundary** — every collection read/write is scoped to the requesting user's family and role, enforced server-side in Payload. Services + the `scoped()` helper are defense-in-depth, not the primary guard.
- **Roles**: `owner` full; `viewer` read + react + comment; `contributor` (Phase 2) writes land in a pending state until an owner approves (`FamilyService.approveContribution`).
- **Encryption**: TLS in transit; Postgres + media storage encrypted at rest (§9). Secrets never shipped in the client bundle.
- **GDPR**: `UserService` / a dedicated `DataService` exposes **export all** and **delete all** (account + child), fulfilled server-side by Payload. EU data residency for Postgres, media storage, and any AI provider.
- **Media privacy**: delivered via the signed `/api/media/file/...` proxy (Payload access-gated → 302 presigned, ~2h); private bucket, no public listing.

---

## 8. Routing (expo-router, `src/app`)

Route files are thin — they mount a screen and pass params. Screens hold no I/O.

```
app/
  _layout.tsx            root: session gate, theme, nav
  index.tsx              → TimelineScreen            (PRD §6.2 #6)
  (later, per phase:)
  milestones.tsx         → MilestoneTrackerScreen     (#9)
  family.tsx             → FamilyScreen               (#11)
  settings.tsx           → SettingsScreen             (#13)
  moment/[id].tsx        → MomentDetailScreen         (#8)
  moment/new.tsx         → AddMomentScreen            (#7)
  baby/index.tsx         → BabyProfileScreen          (#10)
  onboarding.tsx         → OnboardingScreen           (§6.1)
  recaps/…               → RecapsScreen               (Phase 2)
  calendar.tsx           → CalendarScreen             (Phase 2)
```

Notification taps deep-link into `moment/[id]`, a comment, or an invite (PRD §6.4).

---

## 9. Build sequencing (frontend-first, like Shoply)

Each phase ships something usable end-to-end. Depth-first on the core slice (prove the stack once), breadth-first after (reuse shared components).

```
A0  foundation: models + services + lib + Payload API client + auth + tokens
A1  baby profile + age/pregnancy display  ← core atomic output
A2  timeline home + add moment (photo/video/text/voice via signed media proxy)  ← the loop
A3  moment detail + likes + comments
A4  milestone tracker
A5  family invite (owner/viewer) + roles (Payload access control)
A6  settings + i18n (nl/en) + GDPR export/delete
--- Phase 2 ---
A7  recaps (batch) + memory search + calendar + "on this day"
A8  grandparent mode + web app + email digest + contributor approval + multi-child + dark mode
--- Phase 3 / 4 per PRD §7 ---
```

After **A2** the capture→timeline loop is demoable; after **A5** a real family can use it privately; **A6** makes it launch-legal (encryption, GDPR, localization).

**Per-screen loop:** read PRD → build the data spine (`models → lib → services → hook`) → design → build RN UI on gluestack v3 + NativeWind tokens → verify it runs (every state: loading/empty/error/offline + pregnancy-vs-born + pending-invite + contributor-pending) → security review for anything touching auth / access control / media / AI / personal data → tick the box.

---

## 10. Rules that always hold

- **Layered:** `screens → hooks → services → lib`; models flow up; UI never in services/hooks/lib; services throw, hooks catch.
- **Models only above the service layer** — no Payload doc shapes, no collection field names in screens/components.
- **Mappers are pure** — doc→model translation, media URL resolution, derived fields.
- **No live AI on the hot path** — recaps/search/translation/TTS are batch/server-side behind `ai/provider.ts`. The one **user-triggered** generation (AI Story Assist) is explicit, async, and optional — the moment always saves without it.
- **Payload access control is the access boundary** — never trust the client; scope every query to family + role.
- **Tokens, not hardcoded values** — NativeWind + gluestack v3 token scale; recolor = one swap.
- **Privacy is a Phase-1 feature, not a Phase-4 cleanup** — encryption, GDPR export/delete, EU residency ship in the MVP.
- **Age display is derived, never stored** — recompute from birthdate/due date on every read.

---

_Companion to PRD.md — Baby Milestones v1.0_
