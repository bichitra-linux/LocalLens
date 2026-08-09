# Environment Variables Guide

## Quick Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your Firebase credentials
3. Restart dev server

## Available Variables

### Required - Firebase
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

### Development
- `EXPO_PUBLIC_ENV` - `development`, `staging`, `production`
- `EXPO_PUBLIC_DEV_MODE` - enables development utilities
- `EXPO_PUBLIC_DUMMY_USERS_ENABLED` - auto-create test users

### Feature Flags
- `EXPO_PUBLIC_ANALYTICS_ENABLED` - enable analytics
- `EXPO_PUBLIC_CRASHLYTICS_ENABLED` - enable crash reporting

### Firebase Emulator (Optional)
- `EXPO_PUBLIC_USE_FIREBASE_EMULATOR`
- `EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST`
- `EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT`
- `EXPO_PUBLIC_STORAGE_EMULATOR_HOST`
- `EXPO_PUBLIC_STORAGE_EMULATOR_PORT`

## Configuration Access

```typescript
import { config } from '../utils/config';
console.log(config.firebase.projectId);
console.log(config.env);
console.log(config.features.devModeEnabled);
```

## Security

- Keep `.env.local` out of version control
- Prefix public variables with `EXPO_PUBLIC_`
- Use different Firebase projects for dev and production
