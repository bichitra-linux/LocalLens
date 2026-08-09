# LocalLens Development Guide

## Project Structure

```
src/
├── core/                    # Firebase initialization
├── data/                    # Data layer
│   ├── models/              # Firebase data models
│   └── repositories/        # Firebase repository implementations
├── domain/                  # Business logic layer
│   ├── entities/            # Domain models
│   ├── repositories/        # Repository interfaces
│   └── usecases/            # Business logic use cases
├── presentation/            # UI and state management
│   ├── components/          # Reusable components (MapScreen, ErrorBoundary)
│   ├── screens/             # Screen components
│   ├── hooks/               # React Query hooks
│   ├── navigation/          # App navigator
│   └── store/               # Zustand store
├── utils/                   # Shared utilities
├── __tests__/               # Unit tests
└── functions/               # Cloud Functions (deploy separately)
```

## Getting Started

```bash
npm install
cp .env.example .env.local
# Fill in Firebase credentials
npx expo start
```

## Architecture

- **Clean Architecture**: Presentation -> Domain -> Data -> Core
- **State Management**: React Query (server) + Zustand (client)
- **Data Flow**: UI -> Hook -> UseCase -> Repository -> Firebase
- **Geospatial**: Geohash-based proximity queries via ngeohash

## Key Commands

```bash
npx expo start           # Start dev server
npx expo start --web     # Web version
npm test                 # Run unit tests
npm run test:coverage    # Coverage report
```

## Testing

```bash
npm test src/__tests__/   # Run all unit tests
```

## Important Notes

- Map uses OpenStreetMap (free, no API key)
- Google Sign-In works on web only (mobile needs @react-native-google-signin)
- Offline notes are queued and synced when connectivity returns
- Images are optimized (800x600 max, 80% quality) before upload
- Expired notes are cleaned up via Cloud Functions on a 24h schedule
