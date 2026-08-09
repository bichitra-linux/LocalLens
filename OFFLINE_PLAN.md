# LocalLens — Full Offline Operation Plan

## Zero Cost, Fully Open Source

| Technology | Purpose | License | Cost | API Key |
|-----------|---------|---------|------|---------|
| `@maplibre/maplibre-react-native` | Map rendering | MIT | Free | None |
| OpenStreetMap | Tile data | ODbL | Free | None |
| MapLibre OfflineManager | Offline tile packs | MIT | Free | None |
| `@turf/turf` | Distance/bearing math | MIT | Free | None |
| OSRM demo server | Online routing | BSD | Free | None |
| `expo-location` | GPS positioning | MIT | Free | None |
| AsyncStorage + SQLite | Local storage | MIT | Free | None |

---

## Phase 1: MapLibre GL Migration

**Goal:** Replace `react-native-maps` with `@maplibre/maplibre-react-native`

**New files:**
- `src/utils/mapConfig.ts` — MapLibre initialization, style URLs, tile sources
- `src/presentation/components/MapScreen.tsx` — Complete rewrite for MapLibre API

**Modified files:**
- `package.json` — Remove `react-native-maps`, add `@maplibre/maplibre-react-native`, add `@turf/turf`
- `app.json` — Add MapLibre config plugin
- `src/presentation/components/MapScreen.tsx` — Rewrite for MapLibre

**Key details:**
- Style URL: `https://demotiles.maplibre.org/style.json` (free, no key)
- Keep Leaflet for web platform (separate code path)
- Platform split: `Platform.OS === 'web'` uses Leaflet, native uses MapLibre
- MapLibre requires new architecture (already enabled)

---

## Phase 2: Offline Map Tiles

**Goal:** Download map regions for offline use via MapLibre's built-in OfflineManager

**New files:**
- `src/utils/offlineMapPacks.ts` — OfflineManager wrapper service
- `src/presentation/hooks/useOfflineMaps.ts` — React Query hooks for pack management
- `src/presentation/screens/OfflineMapsScreen.tsx` — Download/manage UI
- `src/domain/entities/MapRegion.ts` — Region definitions

**Key details:**
- MapLibre OfflineManager has native SQLite-backed tile storage
- Preset regions: NYC, SF, London, custom
- Download progress callbacks
- Storage management (delete packs, show usage)

---

## Phase 3: GPS-Only Location

**Goal:** Ensure location works reliably without network in remote areas

**New files:**
- `src/presentation/components/LocationIndicator.tsx` — GPS signal strength widget

**Modified files:**
- `src/utils/locationService.ts` — Add GPS-only mode, source detection, warm-up
- `src/presentation/store/appStore.ts` — Add `locationSource` field
- `src/presentation/screens/SettingsScreen.tsx` — GPS-only toggle

**Key details:**
- `Location.Accuracy.Highest` for GPS-only (no network assistance)
- Detect GPS vs network based on accuracy threshold (<20m = GPS)
- GPS warm-up strategy for faster cold starts
- Location quality indicator in UI

---

## Phase 4: Navigation System

**Goal:** Turn-by-turn when online, stored routes when available, compass when offline

**New files:**
- `src/utils/routing.ts` — RoutingService (OSRM API + route storage)
- `src/utils/compassNavigation.ts` — Compass bearing + distance via turf.js
- `src/domain/entities/Route.ts` — Route, RouteStep interfaces
- `src/presentation/hooks/useNavigation.ts` — Navigation state management
- `src/presentation/components/NavigationView.tsx` — Turn-by-turn overlay
- `src/presentation/components/CompassNavigation.tsx` — Compass fallback UI
- `src/presentation/components/RouteDisplay.tsx` — Route line on MapLibre map
- `src/presentation/screens/NavigationScreen.tsx` — Full navigation screen

**Key details:**
- Online routing: OSRM demo server (`router.project-osrm.org`) — free, no API key
- Route storage: AsyncStorage for offline replay
- Compass fallback: `@turf/turf` bearing + distance
- Three-tier strategy: online → stored → compass

---

## Phase 5: Full Offline Data Layer

**Goal:** All reads fall back to cache, all writes queue for sync

**New files:**
- `src/utils/offlineQueue.ts` — Extended queue service for all write operations
- `src/domain/entities/OfflineAction.ts` — Action type definitions
- `src/presentation/components/OfflineBanner.tsx` — Persistent offline status banner
- `src/presentation/hooks/useNetworkStatus.ts` — Connection detection hook
- `src/presentation/screens/OfflineStatusScreen.tsx` — Offline dashboard

**Modified files:**
- `src/presentation/hooks/useNotes.ts` — Add cache writes + offline fallback
- `src/utils/criticalSolutions.ts` — Integrate offline queue
- `src/presentation/components/MapScreen.tsx` — Show cached notes when offline
- `src/presentation/screens/SettingsScreen.tsx` — Queue size, storage stats
- `App.tsx` — Add OfflineBanner

---

## Phase 6: Integration & Polish

**New files:**
- `src/presentation/screens/SetupWizard.tsx` — First-run wizard for map downloads
- `src/presentation/screens/OfflineDashboard.tsx` — Full offline status screen

**Modified files:**
- `src/presentation/screens/NoteDetailScreen.tsx` — Add "Navigate to" button
- `src/presentation/screens/BookmarksScreen.tsx` — Navigate to bookmarked notes
- `src/presentation/navigation/AppNavigator.tsx` — Add new screens
- `src/presentation/screens/SettingsScreen.tsx` — Offline data section

---

## Dependency Chain

```
Phase 1 (MapLibre) ──→ Phase 2 (Offline Tiles) ──→ Phase 6 (Integration)
      │                                               ↑
      └──→ Phase 4 (Navigation) ──────────────────────┘
                    ↑
Phase 3 (GPS) ─────┘
                    
Phase 5 (Offline Data) ──→ Phase 6 (Integration)
```

Phase 1 and Phase 3 can run in parallel (no dependency).
Phase 5 can run in parallel with Phase 2 and 4.

## File Count

| Phase | New Files | Modified Files |
|-------|-----------|---------------|
| 1: MapLibre | 1 | 3 |
| 2: Offline Tiles | 4 | 0 |
| 3: GPS | 1 | 3 |
| 4: Navigation | 8 | 0 |
| 5: Offline Data | 5 | 5 |
| 6: Integration | 2 | 4 |
| **Total** | **~21** | **~15** |
