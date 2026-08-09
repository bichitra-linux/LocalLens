import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note } from '../domain/entities/Note';

const CACHE_KEY = 'locallens_cached_notes';
const MAX_CACHED_NOTES = 200;

interface CacheEntry {
  note: Note;
  cachedAt: string; // ISO date string
}

interface NoteCache {
  notes: Record<string, CacheEntry>; // keyed by noteId
  lastUpdated: string;
  version: number;
}

export class NoteCacheService {
  private static instance: NoteCacheService;

  static getInstance(): NoteCacheService {
    if (!NoteCacheService.instance) {
      NoteCacheService.instance = new NoteCacheService();
    }
    return NoteCacheService.instance;
  }

  async cacheNotes(notes: Note[]): Promise<void> {
    // Load existing cache
    const cache = await this.loadCache();
    
    // Add/update notes
    const now = new Date().toISOString();
    for (const note of notes) {
      cache.notes[note.id] = { note, cachedAt: now };
    }
    
    // LRU eviction: if over max, remove oldest entries
    const entries = Object.entries(cache.notes);
    if (entries.length > MAX_CACHED_NOTES) {
      // Sort by cachedAt ascending (oldest first)
      entries.sort((a, b) => a[1].cachedAt.localeCompare(b[1].cachedAt));
      const toRemove = entries.length - MAX_CACHED_NOTES;
      for (let i = 0; i < toRemove; i++) {
        delete cache.notes[entries[i][0]];
      }
    }
    
    cache.lastUpdated = now;
    cache.version += 1;
    
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }

  async getCachedNotes(): Promise<Note[]> {
    const cache = await this.loadCache();
    return Object.values(cache.notes)
      .sort((a, b) => b.cachedAt.localeCompare(a.cachedAt))
      .map(entry => entry.note);
  }

  async getCachedNoteById(id: string): Promise<Note | null> {
    const cache = await this.loadCache();
    return cache.notes[id]?.note ?? null;
  }

  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
  }

  async getCacheSize(): Promise<{ noteCount: number; lastUpdated: string | null }> {
    const cache = await this.loadCache();
    return {
      noteCount: Object.keys(cache.notes).length,
      lastUpdated: cache.lastUpdated,
    };
  }

  private async loadCache(): Promise<NoteCache> {
    try {
      const json = await AsyncStorage.getItem(CACHE_KEY);
      if (json) {
        return JSON.parse(json);
      }
    } catch (error) {
      console.error('Failed to load note cache:', error);
    }
    return { notes: {}, lastUpdated: '', version: 0 };
  }
}
