import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFTS_KEY = 'locallens_drafts';
const MAX_DRAFTS = 10;

export interface NoteDraft {
  id: string;
  content: string;
  location?: { latitude: number; longitude: number };
  expiresInDays: number;
  category?: string;
  lastSaved: string; // ISO date
  title: string;     // first 40 chars of content, or 'Untitled'
}

export class DraftService {
  private static instance: DraftService;

  static getInstance(): DraftService {
    if (!DraftService.instance) {
      DraftService.instance = new DraftService();
    }
    return DraftService.instance;
  }

  async saveDraft(draft: Omit<NoteDraft, 'id' | 'lastSaved' | 'title'> & { id?: string }): Promise<string> {
    const drafts = await this.getDrafts();
    const id = draft.id || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const title = draft.content.trim().substring(0, 40) || 'Untitled';

    const existingIndex = drafts.findIndex(d => d.id === id);
    const entry: NoteDraft = {
      ...draft,
      id,
      title,
      lastSaved: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      drafts[existingIndex] = entry;
    } else {
      drafts.unshift(entry);
      if (drafts.length > MAX_DRAFTS) {
        drafts.splice(MAX_DRAFTS);
      }
    }

    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    return id;
  }

  async getDrafts(): Promise<NoteDraft[]> {
    try {
      const json = await AsyncStorage.getItem(DRAFTS_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('[Drafts] Failed to load drafts:', error);
      return [];
    }
  }

  async getDraft(id: string): Promise<NoteDraft | null> {
    const drafts = await this.getDrafts();
    return drafts.find(d => d.id === id) ?? null;
  }

  async deleteDraft(id: string): Promise<void> {
    const drafts = await this.getDrafts();
    const filtered = drafts.filter(d => d.id !== id);
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(filtered));
  }

  async getDraftCount(): Promise<number> {
    const drafts = await this.getDrafts();
    return drafts.length;
  }
}
