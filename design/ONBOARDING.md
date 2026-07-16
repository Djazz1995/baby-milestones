# Onboarding — Baby Milestones (Phase 1)

Companion to [FLOWS.md](FLOWS.md), [SCREENS_P1.md](SCREENS_P1.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Defines the sign-up → baby-profile flow and the "do you have a baby yet?" gate. **Entry model: self sign-up** — owners register and start their own family.

---

## 1. The gate (what happens right after auth)

The root layout resolves a **destination** before rendering any app screen. Never show the timeline until this resolves.

```
App launch
  └─ token in secure-store?
       ├─ no  → Welcome → Sign in / Sign up
       └─ yes → GET /users/me  →  resolve destination ↓

Resolve destination (after login OR on relaunch with a token):
  fetch the caller's memberships
    ├─ 0 memberships            → NEW OWNER  → Create baby profile   (creates family + baby)
    └─ ≥1 membership
         fetch babies in those families
           ├─ ≥1 baby           → Timeline   (select most-recent baby)
           └─ 0 babies          → Create baby profile   (family exists, add baby only)
```

| State after auth | Meaning | Destination |
|---|---|---|
| No membership | Just signed up, no family | **Create baby profile** (owner path — also makes the family) |
| Member, no baby | Owner made a family but no baby, or edge case | **Create baby profile** (baby only) |
| Member, ≥1 baby | Returning / invited family member | **Timeline** |
| Invited via link | Accepted invite → already a member of a family with a baby | **Timeline** |

The gate re-runs on every cold start (token present) — so a user who abandons before creating a baby lands back on Create-baby, never a broken timeline.

---

## 2. Screen sequence

```
1 Welcome ──▶ 2 Sign up / Sign in ──▶ [GATE] ──▶ 3 Create baby profile ──▶ 4 Invite (skippable) ──▶ 5 Notifications (skippable) ──▶ Timeline
                                          └────────────────────────────────────────────────────────────────▶ Timeline (if baby already exists)
```

- **3–5 are the onboarding stack**, only shown to a user with no baby. Steps 4 + 5 are **skippable** and never block reaching the timeline.
- Progress shown as small dots (3 of 3) on steps 3–5 so the end is visible.

### 1. Welcome
Serif pitch + privacy line, "Get started" (→ sign up) + "I have an account" (→ sign in). Spec: [SCREENS_P1.md](SCREENS_P1.md) §1.

### 2. Sign up / Sign in
One screen, toggle. **Sign up** fields: email, password, your name (→ becomes an owner). **Sign in**: email, password. On success → store token → run the gate.

### 3. Create baby profile ⭐
The heart of onboarding. Owner path.
- **Segmented toggle: Expecting | Born** — branches the form + sets the initial AgeIndicator.
  - **Expecting** → due date only.
  - **Born** → birth date + weight (kg/g) + length (cm).
- Baby **name**, **parent name(s)** (add-row), **display format** (Weeks / Months / Years+months).
- (New-owner only, optional) **family name** — defaults to "{parent surname} family"; pre-filled, editable, hidden if the user already has a family.
- Primary **Create** → creates family (if none) + baby → gate resolves to Timeline (or Invite step).

### 4. Invite family (optional)
Email + role (Owner / Viewer), "Send invite", **Skip for now**. Spec: §4.

### 5. Notification permission (optional)
Benefit copy, "Enable" (native prompt) / "Not now". Spec: §5.

---

## 3. States (every onboarding screen)
`idle` · `validating` (inline field errors) · `submitting` (button spinner, inputs locked) · `error` (server 4xx → friendly message, form preserved) · `offline` (queue disabled, banner). Sign-up email-taken → 409 → "That email's already registered. Sign in instead." Create-baby needs name + (due date **or** birth date) before Create enables.

---

## 4. ✅ CMS endpoints this flow needs — implemented

Both endpoints now exist in the CMS repo (`baby-milestones-cms`) and are documented in [CMS_INTEGRATION.md](../CMS_INTEGRATION.md) §2 + §6:

1. **Register** — `POST /api/users/register` `{ email, password, displayName?, locale? }` → `{ token, user }` (201). Public (the only unauthenticated write); always non-admin; `409` on duplicate email. Rate limiting is infra-level — add before prod. → `src/endpoints/register.ts`.
2. **Onboarding (atomic)** — `POST /api/onboarding` `{ familyName, baby: {...} }` → `{ family, membership, baby }` (201). One transaction: family + owner membership + baby (+ auto-seeded 8 milestones). Role forced `owner`; baby's family forced to the new one; exactly one of `dueDate`/`birthDate`. → `src/endpoints/onboarding.ts`.
3. Existing-family owner adding a baby: plain `POST /api/babies { family, ... }` (standard CRUD) — no endpoint needed.

The app's `SessionService` (register/login) + a `BabyService.createFirst` / onboarding call target these. *Rejected alternative:* client doing `POST /families` → `POST /memberships` → `POST /babies` as 3 non-atomic writes — a mid-flow failure strands an orphan family; the atomic endpoint prevents it.

---

## 5. Route map (expo-router)

```
app/
  _layout.tsx        session gate → decides stack (auth | onboarding | tabs)
  welcome.tsx        → WelcomeScreen         (1)
  sign-in.tsx        → SignInScreen          (2, toggles sign-up)
  onboarding/
    baby.tsx         → CreateBabyScreen      (3)
    invite.tsx       → InviteScreen          (4)
    notifications.tsx→ NotificationsScreen   (5)
  (tabs)/index.tsx   → TimelineScreen
```

_Next after design sign-off: build A0 (Payload client + auth + secure-store) → A1 (baby model/service) → these screens._
