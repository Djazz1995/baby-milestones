# CMS Integration — the backend this app talks to

> **This app is a pure client.** The backend (Payload CMS + Postgres) lives in a **separate repo** (`baby-milestones-cms`). This app holds no backend logic and enforces no access rules — it calls the CMS over REST/GraphQL and renders the result. **Payload access control is the real security boundary**; the app mirrors permissions in the UI but the server is the final word. This file is the API contract; keep it in sync if the CMS changes.

---

## 1. What the CMS is

Payload 3.86 + Postgres. Single source of truth + API for the whole product: the family archive (babies, moments, media, milestones, social) plus auth.

- **Local dev:** `http://localhost:3000` — REST at `/api`, GraphQL at `/api/graphql`. (On a device/simulator use the host LAN IP, not `localhost`.)
- **Prod:** an EU-hosted HTTPS domain (not deployed yet).
- No public/anonymous reads. Unauthenticated or cross-family requests return **403**.

---

## 2. Auth

Payload JWT auth on the `users` collection.

| Action | Request |
|---|---|
| Register | `POST /api/users/register` `{ email, password, displayName?, locale? }` → `{ token, user }` (201). Public self-signup — the only unauthenticated write. Always non-admin; `409` if email taken. |
| Login | `POST /api/users/login` `{ email, password }` → `{ token, user }` |
| Current user | `GET /api/users/me` |
| Logout | `POST /api/users/logout` |
| Refresh | `POST /api/users/refresh-token` |

- Send on every request: **`Authorization: JWT <token>`** (Payload's scheme — not `Bearer`).
- Persist the token in **`expo-secure-store`**.
- **Prod gotcha:** Payload sets a `Secure` auth cookie → login silently fails over plain HTTP. Prod must be HTTPS, and the CMS's `NEXT_PUBLIC_SERVER_URL` must exactly match the origin or CORS/CSRF reject mutations.

---

## 3. Access model to assume

Two axes:
- **CMS role** (`users.isAdmin`) — operator/support only. Never relevant to the app.
- **Family role** (`memberships.role`) — **owner** / **viewer** / (contributor, later).

Server-enforced behavior (mirror in UI, never trust the client):
- **Owner** — post/edit/delete moments, add/edit babies, manage family + members, invite, record birth.
- **Viewer** — read timeline, **like, comment**. No posting/editing.
- **Non-member** — 403 on everything in that family.

Read the caller's memberships to decide which affordances to show; expect the API to be the enforcement (a hidden button is not security).

---

## 4. Collections (shapes to map to app models)

Field names are the **CMS truth**; map docs → app models in the service layer. Relationships return an id at `depth: 0`, or a populated object at higher `depth` (default 2).

- **`users`** — `email`, `displayName`, `locale` (`nl`/`en`), `isAdmin`.
- **`families`** — `name`. The privacy boundary.
- **`memberships`** — `family→`, `user→`, `role` (owner/viewer/contributor), `inviteStatus`. How the app learns the user's families + roles.
- **`babies`** — `family→`, `name?` (**optional in pregnancy** — nickname or empty; **required at birth**), `gender?` (`girl`/`boy`/`surprise` — optional, neutral; unset = unspecified), `dueDate?`, `birthDate?`, `birthWeightGrams?`, `birthLengthCm?`, `parents[]` (`{name}`), `displayFormat` (`weeks`/`months`/`yearsMonths`), `photo→media`. **Age derived in-app**, never stored. A family can have **multiple babies** → child switcher.
- **`milestones`** — `baby→`, `key` (8 standard), `label` (localized), `loggedMoment→?`, `loggedAt?`. 8 auto-created per baby. "Log" = update with `loggedMoment` + `loggedAt`.
- **`moments`** — `baby→`, `type` (`media`/`voice`/`text` — **derived server-side, read-only**), `media[]→` (**hasMany, ordered** — 1+ images/videos, mixed; first = cover), `voiceNote→?` (single optional audio narration — pair media with a spoken voice-over instead of a text caption), `caption?`, `body?`, `weightGrams?` / `lengthCm?` (optional growth measurements → feed the growth chart), `capturedAt`, `author→`, + join fields `reactions`/`comments`. `author` + `capturedAt` + `type` auto-set on create. To create: send `media: [id, ...]` (+ optional `voiceNote`); **don't send `type`**.
  - ✅ **Multi-media implemented** in the CMS repo (Moments `media` → hasMany ordered; `type` derived in a beforeChange hook; access + seeds updated). Also implemented: **`babies.name` optional + `babies.gender`** (record-birth/onboarding enforce name at birth), and **`moments.weightGrams` / `moments.lengthCm`** (optional growth measurements). ⏳ **One DB migration pending generation** (covers all of these) — needs `pnpm migrate:create` against Postgres (dev uses schema `push`, so dev already works; prod isn't deployed yet).
- **`reactions`** — `moment→`, `user→`. A like. One per user per moment; **unlike = delete**.
- **`comments`** — `moment→`, `author→`, `body`. Author auto-set; edit/delete your own only.
- **`invites`** — `family→`, `email`, `role`, `token`, `status`. Owner-created; accept by token.
- **`media`** — `alt`, `uploadedBy→`, `filename`, `mimeType`, `filesize`, `url`, `sizes` (`thumbnail`/`card`/`full` → `url`/`width`/`height`). Private, signed delivery.

Standard milestone keys: `first_smile, first_laugh, first_tooth, first_solid_food, first_sitting, first_crawl, first_steps, first_word`.

---

## 5. Reaction / comment counts

Each `moment` carries `reactions` + `comments` as **join fields**. Map `reactionCount = moment.reactions.totalDocs` and `commentCount = moment.comments.totalDocs`.

---

## 6. Custom endpoints

- **Record birth** — `POST /api/babies/:id/record-birth` `{ birthDate, name?, birthWeightGrams?, birthLengthCm? }`. **Owner only.** Atomically sets birth fields **and** creates the "Welcome to the world, {name}." moment (copy per caller `locale`). Pass `name` to name a baby that had a pregnancy nickname / no name; `400` if still nameless. Use for the pregnancy→born transition, not a plain update.
- **Accept invite** — `POST /api/invites/accept` `{ token }`. Authenticated user (email must match invite) → becomes a member; invite marked accepted. Idempotent; `409` if not pending, `403` on email mismatch.
- **Delete account** — `POST /api/users/delete-account`. Authenticated; deletes **the caller's own** account (GDPR + App Store 5.1.1(v)). Families where the caller is the **sole owner** → full cascade delete (babies, moments, media/files, milestones, reactions, comments, invites, memberships); families with other owners → caller's membership + likes removed, their authored moments/comments **kept but anonymized** ("Removed member"). Irreversible — double-confirm in UI. Returns `{ deleted: true }`.
- **Export my data** — `GET /api/users/export`. Authenticated. Returns a JSON bundle (as a downloadable attachment) of the caller's profile, memberships, and every family archive they belong to (babies, moments incl. measurements, milestones, comments, reactions). Media as filenames + delivery URLs. GDPR data portability.
- **Onboarding (new owner)** — `POST /api/onboarding` `{ familyName, baby: { name?, gender?, dueDate?|birthDate?, birthWeightGrams?, birthLengthCm?, parents?, displayFormat? } }` → `{ family, membership, baby }` (201). Authenticated. **Atomically** creates family + caller's **owner** membership + first baby (auto-seeds 8 milestones) in one transaction — no orphan family on failure. Role forced `owner`, baby's family forced to the new one. Exactly one of `baby.dueDate` (pregnancy) / `baby.birthDate` (born), else `400`. `baby.name` **optional for pregnancy, required for born** (`400` if missing). Use for the new-owner sign-up path; an existing-family owner adding a baby uses plain `POST /api/babies`.

Everything else is standard Payload REST/GraphQL CRUD, access-controlled.

---

## 7. Media (photos / videos / voice)

- **Upload:** `POST /api/media` **multipart** — a `file` part + a `_payload` part with JSON (`_payload={"alt":"..."}`). Response = media doc with `id`, `url`, `sizes`.
- **Attach:** create a `moment` with `type: 'photo'` (etc.) and `media: <mediaId>`. Flow = upload → get id → create moment.
- **Delivery:** `GET /api/media/file/:filename` (or a size, e.g. `:filename-320x320.jpg`) **with the auth header**. Server checks access, **302-redirects to a ~2h presigned URL** — follow redirects. Files are never public.
- **Sizes:** images get `thumbnail` (320²), `card` (768w), `full` (1600w) auto-generated. Pick per surface.
- **Limits:** image 15MB / video 200MB / audio 30MB → `413`.

---

## 8. Pagination, sorting, locale, errors

- **Pagination:** `?limit=&page=&sort=` (e.g. `sort=-capturedAt`) → `docs`, `totalDocs`, `hasNextPage`, `page`. Map to `Paginated<T>`.
- **Locale:** `?locale=nl|en` selects localized field values (milestone `label`). Default `nl`, fallback on.
- **Query:** Payload `where` syntax (`?where[baby][equals]=3`). Usually unneeded — scoping already filters to your families.
- **Errors:** `{ errors: [{ message }] }` + status: `400` validation, `401` unauthed, `403` forbidden/cross-family, `404`, `409`, `413`.

---

## 9. Dev environment + seed logins

CMS runs locally via Docker (Postgres 5433, MinIO for media) + `pnpm dev` on `:3000`; `pnpm seed` provisions data. All passwords `test1234`:

| Email | Role |
|---|---|
| `anna@devries.test` | De Vries **owner** |
| `mark@devries.test` | De Vries owner |
| `oma@devries.test` | De Vries **viewer** (grandparent) |
| `james@smith.test` | Smith owner (other family) |
| `stranger@test.dev` | **non-member** (403 on De Vries) |
| `info@babymilestones.com` | CMS admin |

Babies: **Liam** (born) + **Sofie** (pregnancy) in De Vries; **Oliver** in Smith.

---

## 10. Rules of thumb

- API is the source of truth for **shapes + permissions**. Don't reimplement access; handle 403s gracefully.
- JWT in secure storage; `Authorization: JWT <token>`.
- Derive age, role-based UI, and display counts locally; never store server-derived values as truth.
- Timeline = `moments` scoped to the selected baby, `sort=-capturedAt`, counts from join `totalDocs`.
- Media = upload → attach → deliver via signed `/api/media/file/...`.
- All data reads/writes go through the app's **service layer** → Payload API (per ARCHITECTURE.md), never direct from screens.

> Full backend spec lives in the CMS repo: `PRD.md`, `BUILD_PLAN.md`, `DEPLOYMENT.md` (there). This file is the app-facing summary — update it when the CMS contract changes.
