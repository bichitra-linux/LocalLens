# LocalLens — 10 New Features Implementation Plan

## Overview

10 features that work offline, without location services, or both. Ordered by dependency.

## Implementation Order

```
1. Theme System ──────────────────────── Foundation for all UI
2. App Settings ───────────────────────── Depends on theme
3. Local Note Cache ───────────────────── Foundation for offline
4. Bookmarks & Favorites ──────────────── Depends on cache
5. Note Drafts ────────────────────────── Independent, offline-first
6. Note Categories & Tags ─────────────── Schema change, affects UI
7. Note Reactions ─────────────────────── Schema change, affects interactions
8. Trending Notes Feed ────────────────── New screen, uses categories
9. Note Sharing ───────────────────────── Uses note data + deep links
10. Achievement System ────────────────── Depends on tracking all user actions
```

---

## Feature 1: Theme System (Dark Mode)

**What:** Centralized color tokens, dark/light mode toggle, system preference detection.

**New files:**
- `src/utils/theme.ts` — Color tokens, spacing, typography constants
- `src/presentation/hooks/useTheme.ts` — Hook reading theme from store, returns current palette

**Modified files:**
- `src/presentation/store/appStore.ts` — Add `theme: 'light' | 'dark' | 'system'` slice with setter, persisted
- All screens/components — Replace hardcoded colors with `theme.*` tokens

**Theme tokens (light + dark):**

| Token | Light | Dark |
|-------|-------|------|
| `background` | `#f5f5f5` | `#121212` |
| `surface` | `#ffffff` | `#1e1e1e` |
| `primary` | `#2196F3` | `#64B5F6` |
| `text` | `#333333` | `#e0e0e0` |
| `textSecondary` | `#666666` | `#aaaaaa` |
| `border` | `#e0e0e0` | `#333333` |
| `error` | `#f44336` | `#ef5350` |
| `success` | `#4CAF50` | `#66bb6a` |
| `card` | `#ffffff` | `#2a2a2a` |

---

## Feature 2: App Settings Screen

**What:** New screen for search radius, default expiration, theme, notification prefs, cache management.

**New files:**
- `src/presentation/screens/SettingsScreen.tsx` — Full settings UI
- `src/domain/entities/Settings.ts` — Settings interface

**Modified files:**
- `src/presentation/store/appStore.ts` — Add settings slice
- `src/presentation/navigation/AppNavigator.tsx` — Add `Settings` to stack

**Settings items:**

| Setting | Type | Default | Storage |
|---------|------|---------|---------|
| Search radius | Slider (1-50 km) | 5 | Store |
| Default note expiration | Picker (1-30 days) | 7 | Store |
| Theme | Light/Dark/System | System | Store |
| Notifications | Toggle | On | Store |
| Auto-sync when online | Toggle | On | Store |
| Cache on WiFi only | Toggle | On | Store |
| Clear local cache | Button | — | Action |
| About / Version | Info | — | — |

---

## Feature 3: Local Note Cache

**What:** Cache viewed notes in AsyncStorage for offline reading. Sync on pull-to-refresh.

**New files:**
- `src/utils/noteCache.ts` — `NoteCacheService` with `cacheNotes()`, `getCachedNotes()`, `getCachedNoteById()`, `clearCache()`, `getCacheSize()`

**Modified files:**
- `src/presentation/hooks/useNotes.ts` — `useNearbyNotes` and `useNote` write to cache on success
- `src/presentation/components/MapScreen.tsx` — Show cached notes when offline

**Cache strategy:**
- On successful fetch: write notes to `'locallens_cached_notes'` AsyncStorage key
- Max 200 notes cached (LRU eviction)
- Cache metadata: `{ notes: Map<id, Note>, lastUpdated: Date, version: number }`
- When offline: read from cache, show "Offline — showing cached notes" banner

---

## Feature 4: Bookmarks & Favorites

**What:** Users can bookmark notes for later. Stored locally, works offline.

**New files:**
- `src/utils/bookmarks.ts` — `BookmarkService`
- `src/presentation/hooks/useBookmarks.ts` — React Query hooks
- `src/presentation/screens/BookmarksScreen.tsx` — List of bookmarked notes

**Modified files:**
- `src/presentation/screens/NoteDetailScreen.tsx` — Add bookmark button
- `src/presentation/screens/ProfileScreen.tsx` — Add "Bookmarks" tab
- `src/presentation/navigation/AppNavigator.tsx` — Add `Bookmarks` screen

**Storage:** `'locallens_bookmarks'` AsyncStorage key storing `{ noteId, bookmarkedAt, noteSnapshot }[]`.

---

## Feature 5: Note Drafts

**What:** Auto-save note content locally. Resume drafts if user exits CreateNote screen.

**New files:**
- `src/utils/drafts.ts` — `DraftService`
- `src/presentation/screens/DraftsScreen.tsx` — List of saved drafts

**Modified files:**
- `src/presentation/screens/CreateNoteScreen.tsx` — Auto-save every 2s, restore on mount
- `src/presentation/navigation/AppNavigator.tsx` — Add `Drafts` screen
- `src/presentation/screens/ProfileScreen.tsx` — Add "Drafts" section

**Storage:** `'locallens_drafts'` AsyncStorage key. Max 10 drafts.

---

## Feature 6: Note Categories & Tags

**What:** Users select a category when creating notes. Filter notes by category on map.

**New type:** `NoteCategory = 'general' | 'food' | 'event' | 'tip' | 'warning' | 'photo' | 'question'`

**Modified files:**
- `src/domain/entities/Note.ts` — Add `category` field
- `src/data/models/FirebaseModels.ts` — Add `category` to `FirebaseNoteDoc`
- `src/data/repositories/FirebaseNoteRepository.ts` — Filter by category
- `src/presentation/screens/CreateNoteScreen.tsx` — Category selector chips
- `src/presentation/components/MapScreen.tsx` — Category filter bar, colored markers
- `src/presentation/store/appStore.ts` — Add `selectedCategory` filter
- `firestore.indexes.json` — Add composite index

**Category display:**

| Category | Icon | Color |
|----------|------|-------|
| General | `chatbubble` | `#2196F3` |
| Food | `restaurant` | `#FF9800` |
| Event | `calendar` | `#9C27B0` |
| Tip | `bulb` | `#4CAF50` |
| Warning | `warning` | `#f44336` |
| Photo | `camera` | `#00BCD4` |
| Question | `help-circle` | `#795548` |

---

## Feature 7: Note Reactions

**What:** Emoji reactions beyond up/down votes. Quick-tap reaction bar.

**New entities:** `Reaction { id, noteId, userId, emoji, createdAt }`

**New files:**
- `src/domain/entities/Reaction.ts`
- `src/domain/repositories/ReactionRepository.ts`
- `src/data/repositories/FirebaseReactionRepository.ts`
- `src/domain/usecases/ReactionUseCase.ts`
- `src/presentation/hooks/useReactions.ts`

**Modified files:**
- `src/data/models/FirebaseModels.ts` — Add `FirebaseReactionDoc`, `'reactions'` collection
- `src/presentation/screens/NoteDetailScreen.tsx` — Reaction bar
- `firestore.indexes.json` — Add index

**Emojis:** `['👍', '❤️', '😂', '😮', '🎉', '🔥']`

---

## Feature 8: Trending Notes Feed

**What:** Popular notes across all locations. No location required.

**New files:**
- `src/presentation/screens/TrendingScreen.tsx` — Card-based feed
- `src/presentation/hooks/useTrending.ts` — Query hook

**Modified files:**
- `src/domain/repositories/NoteRepository.ts` — Add `getTrendingNotes()`
- `src/data/repositories/FirebaseNoteRepository.ts` — Implement trending query
- `src/presentation/navigation/AppNavigator.tsx` — Add `Trending` tab
- `firestore.indexes.json` — Add composite index

**Algorithm:** `upvotes - downvotes` score, descending. Filter `isActive + expiresAt > now`. Paginated infinite scroll.

---

## Feature 9: Note Sharing

**What:** Generate shareable links, copy content, system share sheet.

**New files:**
- `src/utils/sharing.ts` — `ShareService`

**Modified files:**
- `src/presentation/screens/NoteDetailScreen.tsx` — Share button
- `src/presentation/screens/MapScreenContainer.tsx` — Long-press share

**Share options:**
1. System share sheet (React Native `Share` API)
2. Copy link (`https://locallens.app/note/{noteId}`)
3. Copy content to clipboard
4. QR code (optional `react-native-qrcode-svg`)

---

## Feature 10: Achievement System

**What:** Badges and reputation levels for user activity.

**New files:**
- `src/domain/entities/Achievement.ts` — Achievement interface + predefined list
- `src/utils/achievements.ts` — `AchievementService`
- `src/presentation/hooks/useAchievements.ts` — Query hooks
- `src/presentation/screens/AchievementsScreen.tsx` — Badge grid

**Modified files:**
- `src/domain/entities/User.ts` — Add `reputationLevel`, `achievementsCount`
- `src/data/models/FirebaseModels.ts` — Add `achievements` subcollection
- `src/presentation/screens/ProfileScreen.tsx` — Achievements summary
- `src/presentation/navigation/AppNavigator.tsx` — Add `Achievements` screen

**Achievements:**

| Achievement | Icon | Requirement |
|-------------|------|-------------|
| First Note | `create` | Create 1 note |
| Storyteller | `book` | Create 10 notes |
| Local Guide | `map` | Create 50 notes |
| Popular | `star` | Receive 10 upvotes |
| Influencer | `trophy` | Receive 100 upvotes |
| Commentator | `chatbubbles` | Add 10 comments |
| Conversationalist | `people` | Add 50 comments |
| Explorer | `compass` | Notes in 3 cities |
| Early Bird | `sunny` | Note before 8am |
| Night Owl | `moon` | Note after midnight |
| Bookworm | `bookmark` | 10 bookmarks |
| Reactor | `happy-face` | 20 reactions |

---

## Schema Changes Summary

| Collection | New Fields | New Indexes |
|-----------|-----------|-------------|
| `notes` | `category: string` | `isActive + expiresAt + category + createdAt`, `isActive + expiresAt + upvotes desc` |
| `reactions` (new) | `noteId, userId, emoji, createdAt` | `noteId + emoji`, `userId + noteId` |
| `users` | `reputationLevel, achievementsCount` | — |
| `users/{uid}/achievements` (new sub) | `achievementId, unlockedAt, progress` | — |

## File Count

| Category | New Files | Modified Files |
|----------|-----------|---------------|
| Theme | 2 | ~15 |
| Settings | 2 | 2 |
| Cache | 1 | 2 |
| Bookmarks | 3 | 4 |
| Drafts | 2 | 3 |
| Categories | 0 | 8 |
| Reactions | 5 | 4 |
| Trending | 2 | 4 |
| Sharing | 1 | 3 |
| Achievements | 4 | 4 |
| **Total** | **~22** | **~30** |
