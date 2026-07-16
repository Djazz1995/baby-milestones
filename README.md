# Baby Milestones

Private, family-first baby timeline & memory app — pregnancy through childhood. Photos, videos, voice notes, text moments on a timeline; automatic pregnancy/age display; family invites; likes & comments. Dutch + English, GDPR-native.

- **Product spec:** [PRD.md](PRD.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)

## Stack

- **App:** React Native (Expo SDK 54) + expo-router + NativeWind + gluestack-ui v3
- **Backend:** Payload CMS + Postgres (consumed by the app over Payload's REST/GraphQL API)
- **Media:** private EU bucket (Hetzner Object Storage) + signed delivery URLs

## Get started

```bash
npm install
npm run start   # then open on iOS / Android / web
```

Edit files under `src/` — see [ARCHITECTURE.md](ARCHITECTURE.md) for the layer layout (`models / services / hooks / lib / components / app`).

## Scripts

- `npm run ios` / `npm run android` / `npm run web` — run on a platform
- `npm run lint` — expo lint
- `npm run format` — prettier
