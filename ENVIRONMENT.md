# Environment Variables Guide

## Overview
LocalLens uses environment variables for secure configuration management. This approach keeps sensitive data like API keys out of your codebase and allows for different configurations across development, staging, and production environments.

## File Structure
```
├── .env.example      # Template with all available variables
├── .env.local        # Your local development config (gitignored)
├── src/utils/config.ts # Centralized configuration utility
└── README.md         # Setup instructions
```

## Quick Setup

### 1. Copy the template
```bash
cp .env.example .env.local
```

### 2. Update your Firebase credentials
Edit `.env.local` with your actual Firebase project values:
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# ... etc
```

### 3. Development features
The following variables control development features:
```bash
EXPO_PUBLIC_DEV_MODE=true                    # Enables development utilities
EXPO_PUBLIC_DUMMY_USERS_ENABLED=true        # Auto-creates test users
EXPO_PUBLIC_ANALYTICS_ENABLED=false         # Disable analytics in dev
EXPO_PUBLIC_ENV=development                  # Environment identifier
```

## Available Variables

### Firebase Configuration (Required)
- `EXPO_PUBLIC_FIREBASE_API_KEY` - Your Firebase API key
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `EXPO_PUBLIC_FIREBASE_APP_ID` - Firebase app ID

### Development Settings
- `EXPO_PUBLIC_ENV` - Environment: `development`, `staging`, `production`
- `EXPO_PUBLIC_DEV_MODE` - Enable development utilities (`true`/`false`)
- `EXPO_PUBLIC_DUMMY_USERS_ENABLED` - Auto-create test users (`true`/`false`)

### Feature Flags
- `EXPO_PUBLIC_ANALYTICS_ENABLED` - Enable analytics tracking (`true`/`false`)
- `EXPO_PUBLIC_CRASHLYTICS_ENABLED` - Enable crash reporting (`true`/`false`)

### Firebase Emulator (Optional)
For local Firebase development:
```bash
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true
EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost
EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT=8080
EXPO_PUBLIC_STORAGE_EMULATOR_HOST=localhost
EXPO_PUBLIC_STORAGE_EMULATOR_PORT=9199
```

## Configuration Access

The `src/utils/config.ts` file provides type-safe access to all configuration:

```typescript
import { config } from '../utils/config';

// Type-safe access with fallbacks
console.log(config.firebase.projectId);
console.log(config.env); // 'development' | 'staging' | 'production'
console.log(config.features.devModeEnabled); // boolean
```

## Security Best Practices

### ✅ DO
- Keep `.env.local` out of version control (already in `.gitignore`)
- Use different values for development, staging, and production
- Prefix all Expo public variables with `EXPO_PUBLIC_`
- Store sensitive production variables in your deployment platform's environment

### ❌ DON'T
- Commit `.env.local` files to git
- Put production API keys in development config
- Use the same Firebase project for dev and production
- Store secrets in the codebase

## Troubleshooting

### Missing Environment Variables
If you see "Using fallback Firebase config" in console:
1. Check that `.env.local` exists
2. Verify all `EXPO_PUBLIC_FIREBASE_*` variables are set
3. Restart the development server

### Firebase Connection Issues
1. Verify your Firebase project settings
2. Check that authentication methods are enabled
3. Ensure Firestore rules allow development access
4. Try using Firebase emulators for local development

### Environment Not Loading
1. Ensure variables start with `EXPO_PUBLIC_`
2. Restart the development server after changes
3. Clear Metro cache: `npx expo start --clear`

## Production Deployment

For production builds, set environment variables in your deployment platform:
- **Vercel**: Environment Variables section in dashboard
- **Netlify**: Site Settings > Environment Variables
- **EAS Build**: `eas.json` configuration or Expo dashboard

Never use `.env.local` for production - use your platform's secure environment variable system.