# LocalLens System Audit

**Date:** May 26, 2026  
**Scope:** Full codebase analysis for bugs, errors, and issues  
**Files Analyzed:** 84 source files  
**Tests:** 70 passing  
**TypeScript:** 0 errors  

---

## Executive Summary

Deep analysis revealed **40 issues** across the codebase: 6 critical, 12 high, 14 medium, 8 low severity. Critical issues include data corruption in offline vote/reaction sync, platform crashes on web, and falsy-zero coordinate checks that break location near the equator/prime meridian.

---

## Critical Issues (6)

### BUG-01: Falsy-Zero Coordinate Check
**Files:** `MapScreen.tsx:186,362`, `CompassNavigation.tsx:19`, `appStore.ts:6-9`  
**Problem:** `location.latitude && location.longitude` evaluates to `false` when coordinates are `0` (valid location at equator or prime meridian). Map shows loading spinner forever, user location marker doesn't render.  
**Fix:** Use `location.latitude !== null && location.longitude !== null`

### BUG-02: `executeRemoveReaction` Is No-Op
**File:** `offlineQueue.ts:256-260`  
**Problem:** Reaction removals are logged to console but never synced to Firestore. Data corruption — client thinks reaction removed, server still has it.  
**Fix:** Implement actual Firestore query and delete.

### BUG-03: `executeRemoveVote` Doesn't Delete Vote Doc
**File:** `offlineQueue.ts:239-243`  
**Problem:** Only decrements note vote count, never deletes the vote document from `votes` collection. Orphan documents accumulate, breaks one-vote-per-user constraint.  
**Fix:** Query and delete the vote document before decrementing.

### BUG-04: Duplicate Vote Creation
**File:** `offlineQueue.ts:223-237`  
**Problem:** `executeVote` creates new vote without checking for existing votes. Can create duplicates after offline sync.  
**Fix:** Check for existing vote document before creating.

### BUG-05: `offlineMapPacks.ts` Crashes on Web
**File:** `offlineMapPacks.ts:1`  
**Problem:** Static import of native-only `@maplibre/maplibre-react-native`. Module resolution error on web platform.  
**Fix:** Add platform guard with dynamic require.

### BUG-06: `RouteDisplay.tsx` Missing `.default`
**File:** `RouteDisplay.tsx:9`  
**Problem:** `require()` without `.default` gets module object instead of default export. ShapeSource/LineLayer will be undefined.  
**Fix:** Add `.default` to require call.

---

## High Issues (12)

### BUG-07: Navigation Never Updates Step Index
**File:** `useNavigation.ts:108-137`  
**Problem:** `currentStepIndex` only set once in `startNavigation`. Turn-by-turn always shows first instruction.  
**Fix:** Calculate current step from user position in the location update effect.

### BUG-08: `savePackRecord` Marks Complete Prematurely
**File:** `offlineMapPacks.ts:108-129`  
**Problem:** Saves `status: 'complete'` immediately after `createPack()` returns, before download finishes.  
**Fix:** Save with `status: 'downloading'`, update to `'complete'` in progress callback when 100%.

### BUG-09: `getCurrentStepIndex` Ignores Nearest Point
**File:** `routing.ts:149-167`  
**Problem:** Destructures `index` from nearest point but never uses it. Falls back to checking 50m distance to each step, returns step 0 when user is between turns.  
**Fix:** Use the nearest point index to determine current step.

### BUG-10: Navigation Screen Not Registered
**File:** `AppNavigator.tsx`  
**Problem:** `RootStackParamList` defines `Navigation` route but no `<Stack.Screen>` exists. `navigation.navigate('Navigation', ...)` will fail.  
**Fix:** Import and register NavigationScreen.

### BUG-11: `useNavigation` Hook Never Imported
**File:** `useNavigation.ts`  
**Problem:** Entire navigation system (hook, NavigationView, CompassNavigation, RouteDisplay) is dead code. Never connected to any screen.  
**Fix:** Create NavigationScreen that uses the hook and components.

### BUG-12: Two Competing Sync Services
**Files:** `criticalSolutions.ts`, `offlineQueue.ts`, `App.tsx`  
**Problem:** Both `OfflineSyncService` and `OfflineQueueService` listen for connectivity and sync notes. Could create duplicate notes.  
**Fix:** Consolidate into single sync service, or make OfflineQueueService the primary and deprecate OfflineSyncService note queue.

### BUG-13: `processQueue` Race Condition
**File:** `offlineQueue.ts:79-117`  
**Problem:** Simple boolean guard. Concurrent calls from enqueue/NetInfo/AppState silently dropped. Newly enqueued actions may not process until next trigger.  
**Fix:** Add re-process flag, process again after current batch completes if new items were added.

### BUG-14: `useNearbyNotesListener` Never Unsubscribes
**File:** `useNotes.ts:75-112`  
**Problem:** Firestore `onSnapshot` listener cleanup returned from Promise constructor, but React Query can't use it. Listener leaks on every query key change.  
**Fix:** Use `useEffect` with cleanup for the listener, not inside `queryFn`.

### BUG-15: `getRouteFromCurrentLocation` Returns Null
**File:** `routing.ts:62-66`  
**Problem:** Always returns null. Any caller gets no route.  
**Fix:** Implement using current location from store.

### BUG-16: `react-leaflet` v5 Incompatible with React 19
**File:** `package.json:35`  
**Problem:** react-leaflet v5 targets React 18. React 19 may cause issues.  
**Fix:** Pin to compatible version or add compatibility shim.

### BUG-17: `whenCreated` Removed in react-leaflet v5
**File:** `MapScreen.tsx:352`  
**Problem:** `whenCreated` prop deprecated in v4, removed in v5.  
**Fix:** Use `ref` callback or `useMap()` hook.

### BUG-18: `fetch` Response Not Validated
**File:** `routing.ts:23-26`  
**Problem:** No `response.ok` check. HTTP 500 errors silently parsed as JSON.  
**Fix:** Add `if (!response.ok)` check before parsing.

---

## Medium Issues (14)

### BUG-19: Dead `incrementVal` Variable
**File:** `offlineQueue.ts:235`

### BUG-20: `NavigationViewProps` Too Broad
**File:** `NavigationView.tsx:6`

### BUG-21: `connectionType` Type Mismatch
**File:** `useNetworkStatus.ts:41`

### BUG-22: `isLocationEnabled` Persisted Incorrectly
**File:** `appStore.ts:92-96`

### BUG-23: `OfflineManager` Methods Without Platform Guard
**File:** `offlineMapPacks.ts:71-101`

### BUG-24: react-leaflet Version Mismatch
**File:** `package.json:35`

### BUG-25: Leaflet `whenCreated` Deprecated
**File:** `MapScreen.tsx:352`

### BUG-26: Missing Navigation Screen (duplicate of BUG-10)

### BUG-27: Dead `useNavigation` Hook (duplicate of BUG-11)

### BUG-28: `getArrowRotation` Never Used
**File:** `compassNavigation.ts:81-83`

### BUG-29: `saveQueue` O(n) Write Per Action
**File:** `offlineQueue.ts:94`

### BUG-30: Deprecated `substr` Usage
**Files:** `offlineQueue.ts:38`, `criticalSolutions.ts:140`

### BUG-31: Haversine Distance Duplicated 4 Times
**Files:** `MapScreen.tsx`, `routing.ts`, `geospatial.ts`, `locationService.ts`

### BUG-32: `updateStatus` Not Memoized
**File:** `useNetworkStatus.ts:33-44`

### BUG-33: No `response.ok` Check (duplicate of BUG-18)

### BUG-34: `locationSource` Shows 'Network' When Null
**File:** `OfflineStatusScreen.tsx:148`

### BUG-35: Mixed Concerns in `criticalSolutions.ts`
**File:** `criticalSolutions.ts:1,416`

### BUG-36: `locationService` Imports from Presentation Layer
**File:** `locationService.ts:2`

### BUG-37: `estimatedSizeMB` Used as `downloadSize`
**File:** `offlineMapPacks.ts:117`

### BUG-38: `estimateTileCount` Edge Case
**File:** `mapConfig.ts:121-123`

### BUG-39: `fetch` for Local File URI
**File:** `criticalSolutions.ts:255-256`

### BUG-40: `handleMapPress` Passes Undefined Coordinates
**File:** `MapScreen.tsx:222-243`

---

## Low Issues (8)

- BUG-19: Dead `incrementVal` variable
- BUG-20: NavigationViewProps too broad
- BUG-28: `getArrowRotation` never used
- BUG-30: Deprecated `substr`
- BUG-31: Duplicated haversine function
- BUG-32: `updateStatus` not memoized
- BUG-35: Mixed concerns
- BUG-38: Tile count edge case

---

## Fix Priority

| Priority | Bugs | Action |
|----------|------|--------|
| **P0 — Immediate** | 1-6 | Critical crashes and data corruption |
| **P1 — High** | 7-18 | Broken functionality, memory leaks |
| **P2 — Medium** | 19-40 | Code quality, deprecations, edge cases |

---

## Test Coverage After Fixes

All 70 existing tests must continue passing. New tests should be added for:
- Offline queue vote/reaction handling
- Navigation step progression
- Platform-specific code paths
- Coordinate edge cases (lat=0, lng=0)
