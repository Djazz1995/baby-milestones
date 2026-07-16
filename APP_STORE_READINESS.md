# App Store & Play Store readiness

Compliance checklist for Baby Milestones (iOS-first, Android inherits). Status as of the pre-build audit. Legend: ✅ done · 🟡 partial · ⬜ to do · ➖ N/A.

## Mandatory / blocking

| Requirement | Status | Where / notes |
|---|---|---|
| **In-app account deletion** (Apple 5.1.1(v); Play policy) | ✅ **built + designed** | CMS `POST /api/users/delete-account` (sole-owner cascade; co-owner anonymize). Confirm flow mocked (role-aware wording + checkbox, mockups.html "Privacy & compliance flows"). ⬜ **wire Settings → Delete account** in the app. |
| **Data export** (GDPR portability) | ✅ **built + designed** | CMS `GET /api/users/export` → JSON bundle. Flow mocked (generate → save/share). ⬜ wire Settings → Export my data. |
| **Permission usage strings** (camera / mic / photo library) | ✅ set | `app.json` ios.infoPlist (NSCamera/Microphone/PhotoLibrary/PhotoLibraryAdd). Android `permissions` added. ⬜ confirm the media libs (expo-image-picker / expo-camera / expo-audio) surface them when installed. |
| **Encryption export compliance** | ✅ set | `ITSAppUsesNonExemptEncryption: false` (HTTPS-only = exempt). |
| **Privacy policy (hosted URL)** | ⬜ to write | Settings link is designed; author the policy + host it. Cover: data collected (email, media, comments), EU residency, no ads/tracking, deletion + export, children's data. |
| **App Privacy "nutrition label" / Play Data Safety** | ⬜ to fill | Declare: Contact info (email), User content (photos/videos/audio/text), Identifiers. Linked to user, not used for tracking. |

## Handled by design / N/A

| Item | Status | Notes |
|---|---|---|
| Sign in with Apple | ➖ | Email-only auth, no third-party login → not required. |
| App Tracking Transparency (ATT) | ➖ | No cross-app tracking / no ad SDKs. |
| IAP / StoreKit | ➖ | No purchases in Phase 1 (gift cards = Phase 4). |
| Kids Category / COPPA | ➖ | Users are parents (adults). Not a Kids-category app. Children's *data* handled under GDPR (private, encrypted, EU residency, no third-party analytics on media). |
| Private by default | ✅ | No public feed/discovery; family-invite only. |

## Partial / to harden

| Item | Status | Notes |
|---|---|---|
| **UGC moderation** (Apple 1.2) | 🟡 designed | Private family-only lowers the bar. Owner can **remove members** + delete own comments. **Report** sheet now designed (moment/comment overflow → reason → owner + support; mockups.html "Report content"). ⬜ build it + a published support contact. |
| **Privacy manifest** (`PrivacyInfo.xcprivacy` + required-reason APIs) | 🟡 | Expo SDK 54 generates most. Verify at build; add reasons for any required-reason API used (e.g. UserDefaults, file timestamp). |
| **Age rating** | ⬜ | Set in App Store Connect / Play. Likely 4+, but user-generated content may bump it — answer the questionnaire honestly. |
| **Store assets** | ⬜ | Icon + splash still placeholder (reskin to light-teal); screenshots, description, keywords, support URL, marketing URL. |
| **Encryption at rest** (PRD §9) | ✅ backend | Postgres + object storage encrypted at rest; TLS in transit. Verify prod config at deploy. |

## Before submission — punch list
1. Wire Settings → **Delete account** (double-confirm) + **Export my data** to the CMS endpoints.
2. Write + host the **privacy policy**; link it in Settings + App Store Connect.
3. Fill **App Privacy** + **Play Data Safety** forms.
4. Add media libs; confirm iOS permission prompts show the strings above.
5. Add a **report/flag** affordance (UGC hardening) + support contact.
6. Replace placeholder **icon/splash** with the light-teal brand; produce screenshots.
7. Verify **privacy manifest** at build; set **age rating**.
8. Prod = **HTTPS** with matching `NEXT_PUBLIC_SERVER_URL` (CMS cookie/CORS/CSRF).

_Companion to CMS_INTEGRATION.md (endpoints) + PRD.md §9 (privacy)._
