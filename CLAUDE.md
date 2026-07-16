# Baby Milestones

Private baby timeline & memory app. React Native + Expo + NativeWind, gluestack-ui v3.
Backend: **Payload CMS + Postgres** (the RN app consumes Payload's REST/GraphQL API).

## Docs
- Product spec → @PRD.md (screens, functionalities, phases 1–4)
- Architecture → @ARCHITECTURE.md (layered `screens → hooks → services → lib`; models-only above services)
- Build plan → @BUILD_PLAN.md (phased app build A0–A4; synced to the CMS build plan)
- Backend API contract → @CMS_INTEGRATION.md (Payload CMS: auth, collections, endpoints, media, seed logins — the backend lives in the separate `baby-milestones-cms` repo)

## Stack notes
- Verify every Expo API against https://docs.expo.dev/versions/v54.0.0/ before coding.
- Style with NativeWind classes on the gluestack v3 token scale — no hardcoded hex.
- No Supabase. Data reads/writes go through the service layer → Payload API.
- Phase-2+ native deps need a **custom dev build** (not Expo Go): RevenueCat/IAP (paywall, A4.5), `expo-media-library` (auto-import, A6.2), share extension / `expo-share-intent` (share-into-app, A6.3). Verify each against Expo SDK 54.
- AI is server-side/batch behind `ai/provider.ts` — except **on-demand Story Assist** (user-triggered, async, optional; via the CMS `/api/ai/story` endpoint). Never block the capture path on AI.
