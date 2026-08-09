# Deployment Guide

## CI/CD Pipeline

The project uses GitHub Actions for CI/CD with the following workflows:

### Workflows

| Trigger | Jobs | Description |
|---------|------|-------------|
| Push to `develop` | `test` → `build-preview` | Type check, tests, then EAS preview build |
| Push to `main` (no tag) | `test` → `ota-update` | Type check, tests, then publish OTA update |
| Push to `main` (auto) | `test` → `version` | Type check, tests, bump version, create tag + GitHub Release |
| Tag push `v*` | `test` → `version` → `build-production` | Full production build + store submission |
| Pull request | `test` only | Type check + tests |
| Manual (`workflow_dispatch`) | Same as push to main | Choose version bump type |

### Pipeline Stages

1. **test** — TypeScript check, Jest tests, security audit
2. **version** — Auto-bumps `package.json` (patch/minor/major), creates git tag and GitHub Release
3. **build-preview** — EAS build for Android APK + iOS simulator (internal distribution)
4. **build-production** — EAS production build for both platforms + store submission
5. **ota-update** — EAS Update for over-the-air JS updates to production

### Version Strategy

Versions follow Semantic Versioning (`v<major>.<minor>.<patch>`):
- **patch** — Bug fixes, small tweaks (default on push to main)
- **minor** — New features (triggered manually)
- **major** — Breaking changes (triggered manually)

Tags are auto-generated on push to `main`. Use `workflow_dispatch` to choose `minor` or `major`.

## Required Secrets

Set these in your GitHub repository Settings → Secrets and variables → Actions:

| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Expo access token for EAS builds (`eas login` then copy from `~/.expo/access-token`) |

## Required EAS Secrets

Set via `eas secret:create` for production builds:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-api-key"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your-project.firebaseapp.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your-project-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "your-project.appspot.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "your-sender-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "your-app-id"
eas secret:create --scope project --name EXPO_PUBLIC_ENV --value "production"
```

## Manual Deployment

```bash
# Preview build (internal testing)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --profile production --platform all

# OTA update (no app store review)
eas update --branch production --message "Bug fixes"
```
