import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note } from '../domain/entities/Note';

const BOOKMARKS_KEY = 'locallens_bookmarks';

export interface BookmarkEntry {
  noteId: string;
  bookmarkedAt: string;
  noteSnapshot: Note;
}

export class BookmarkService {
  private static instance: BookmarkService;

  static getInstance(): BookmarkService {
    if (!BookmarkService.instance) {
      BookmarkService.instance = new BookmarkService();
    }
    return BookmarkService.instance;
  }

  async addBookmark(note: Note): Promise<void> {
    const bookmarks = await this.getBookmarks();
    if (bookmarks.some(b => b.noteId === note.id)) return;

    bookmarks.unshift({
      noteId: note.id,
      bookmarkedAt: new Date().toISOString(),
      noteSnapshot: note,
    });

    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }

  async removeBookmark(noteId: string): Promise<void> {
    const bookmarks = await this.getBookmarks();
    const filtered = bookmarks.filter(b => b.noteId !== noteId);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
  }

  async isBookmarked(noteId: string): Promise<boolean> {
    const bookmarks = await this.getBookmarks();
    return bookmarks.some(b => b.noteId === noteId);
  }

  async getBookmarks(): Promise<BookmarkEntry[]> {
    try {
      const json = await AsyncStorage.getItem(BOOKMARKS_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('[Bookmarks] Failed to load bookmarks:', error);
      return [];
    }
  }

  async toggleBookmark(note: Note): Promise<boolean> {
    const isBookmarked = await this.isBookmarked(note.id);
    if (isBookmarked) {
      await this.removeBookmark(note.id);
      return false;
    } else {
      await this.addBookmark(note);
      return true;
    }
  }
}
