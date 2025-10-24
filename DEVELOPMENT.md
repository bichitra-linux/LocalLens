# LocalLens Development Guide 👨‍💻

## Project Structure

```
src/
├── core/                    # Core configuration and utilities
│   └── firebase.ts         # Firebase initialization and config
├── data/                   # Data layer (repositories, models)
│   ├── models/            
│   │   └── FirebaseModels.ts
│   └── repositories/
│       ├── FirebaseUserRepository.ts
│       ├── FirebaseNoteRepository.ts
│       └── FirebaseInteractionRepository.ts
├── domain/                 # Business logic layer
│   ├── entities/          # Domain models
│   ├── repositories/      # Repository interfaces  
│   └── usecases/         # Business logic use cases
├── presentation/          # UI and state management
│   ├── components/       
│   ├── screens/
│   ├── hooks/           # React Query hooks
│   ├── navigation/
│   └── store/           # Zustand store
└── utils/                # Shared utilities
    ├── geospatial.ts    # Geographic calculations
    ├── locationService.ts
    └── criticalSolutions.ts
```

## Development Workflow

### 1. Environment Setup
```bash
# Clone and install
git clone <repository>
cd LocalLens
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Firebase credentials
```

### 2. Firebase Setup
1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password + Google)
3. Create Firestore database
4. Enable Storage
5. Copy configuration to `src/core/firebase.ts`
6. Deploy security rules:
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login and initialize
   firebase login
   firebase init firestore storage
   
   # Copy rules and deploy
   firebase deploy --only firestore:rules,storage
   ```

### 3. Google Maps Setup (Android)
1. Get API key from Google Cloud Console
2. Add to `app.json` android.config.googleMaps.apiKey
3. Add to `.env.local` as EXPO_PUBLIC_GOOGLE_MAPS_API_KEY

### 4. Running the App
```bash
# Start development server
npx expo start

# Run on specific platforms
npx expo run:ios
npx expo run:android
npx expo start --web
```

## Architecture Patterns

### Clean Architecture Implementation
- **Presentation Layer**: React components, hooks, navigation
- **Domain Layer**: Business logic, entities, use cases
- **Data Layer**: Firebase repositories, external API calls
- **Core Layer**: Configuration, utilities, shared services

### State Management Strategy
- **Server State**: React Query for caching, sync, optimistic updates
- **Client State**: Zustand for UI state, user preferences
- **Persistent State**: AsyncStorage for offline data

### Data Flow Pattern
```
UI Component → Custom Hook → Use Case → Repository → Firebase
     ↓              ↑            ↓          ↑          ↓
React Query ← Response ← Domain Entity ← Data Model ← API
```

## Key Implementation Details

### Geospatial Queries
```typescript
// Efficient proximity queries using geohashes
const geohash = generateGeohash(lat, lng);
const neighbors = getNeighboringGeohashes(lat, lng);

// Firestore query with geohash prefix
const query = collection('notes')
  .where('geohash', '>=', geohash.slice(0, 5))
  .where('geohash', '<', geohash.slice(0, 5) + '~');
```

### Real-time Updates
```typescript
// Live data with Firestore listeners
const unsubscribe = onSnapshot(query, (snapshot) => {
  const notes = snapshot.docs.map(mapFirebaseNoteToNote);
  callback(notes);
});
```

### Optimistic Updates
```typescript
// Immediate UI feedback before server confirmation
const { mutate } = useMutation({
  onMutate: async (variables) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(queryKey);
    
    // Snapshot previous value
    const previousData = queryClient.getQueryData(queryKey);
    
    // Optimistically update
    queryClient.setQueryData(queryKey, newData);
    
    return { previousData };
  },
  onError: (_, __, context) => {
    // Rollback on error
    queryClient.setQueryData(queryKey, context.previousData);
  }
});
```

## Testing Strategy

### Unit Tests
```bash
# Test domain logic
npm test src/domain/

# Test utilities
npm test src/utils/
```

### Integration Tests  
```bash
# Test data layer
npm test src/data/

# Test with Firebase emulators
firebase emulators:start
npm run test:integration
```

### E2E Tests
```bash
# Install Detox for React Native E2E
npm run test:e2e
```

## Performance Optimization

### Database Optimization
- Denormalize frequently accessed data
- Use composite indexes for complex queries
- Implement pagination with cursor-based pagination
- Regular cleanup of expired notes

### Image Optimization
- Automatic resize/compression before upload
- Generate thumbnails for list views
- Lazy loading with placeholder images
- Progressive JPEG for better perceived performance

### Caching Strategy
- React Query with stale-while-revalidate
- AsyncStorage for offline persistence
- Image caching with react-native-fast-image
- Geospatial query result caching

## Security Considerations

### Firebase Security Rules
- Authenticated users only
- Row-level security based on user ownership
- Input validation at database level
- Rate limiting for expensive operations

### Data Privacy
- Location precision limited to geohash accuracy
- Optional anonymous posting
- Automatic content expiration
- GDPR compliance with data export/deletion

## Deployment

### Expo Application Services (EAS)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure builds
eas build:configure

# Build for app stores
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Environment Management
```bash
# Production build
eas build --profile production

# Staging build  
eas build --profile preview

# Development build
eas build --profile development
```

## Monitoring & Analytics

### Crash Reporting
- Expo Crashlytics integration
- Custom error boundaries for React components
- Firebase Crashlytics for native crashes

### Performance Monitoring
- React Native Performance Monitor
- Firebase Performance Monitoring
- Custom metrics for geospatial queries

### User Analytics
- Firebase Analytics
- Custom events for feature usage
- A/B testing with Firebase Remote Config

## Troubleshooting

### Common Issues

#### Location Permissions
```typescript
// Check permissions before accessing location
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  // Handle permission denied
}
```

#### Firebase Connection
```typescript
// Test Firebase connection
import { connectFirestoreEmulator } from 'firebase/firestore';

if (__DEV__) {
  connectFirestoreEmulator(firestore, 'localhost', 8080);
}
```

#### Map Loading Issues
```typescript
// Wait for map to be ready
<MapView
  onMapReady={() => setMapReady(true)}
  // ... other props
/>
```

### Debug Commands
```bash
# Clear cache
npx expo start --clear

# Debug bundle
npx expo start --dev-client

# Check Metro bundler
npx expo start --verbose
```

## Contributing Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Conventional commits for git messages
- Pre-commit hooks with Husky

### Pull Request Process
1. Create feature branch from `develop`
2. Implement feature with tests
3. Update documentation
4. Submit PR with detailed description
5. Code review and approval required
6. Merge to develop, deploy to staging

### Release Process
1. Create release branch from `develop`
2. Update version numbers and changelog
3. Test thoroughly on staging
4. Merge to `main` and tag release
5. Deploy to production app stores