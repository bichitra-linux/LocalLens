import { Ionicons } from '@expo/vector-icons';

export type NoteCategory = 'general' | 'food' | 'event' | 'tip' | 'warning' | 'photo' | 'question';

export interface CategoryInfo {
  id: NoteCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'general', label: 'General', icon: 'chatbubble', color: '#2196F3' },
  { id: 'food', label: 'Food & Drink', icon: 'restaurant', color: '#FF9800' },
  { id: 'event', label: 'Event', icon: 'calendar', color: '#9C27B0' },
  { id: 'tip', label: 'Tip', icon: 'bulb', color: '#4CAF50' },
  { id: 'warning', label: 'Warning', icon: 'warning', color: '#f44336' },
  { id: 'photo', label: 'Photo Spot', icon: 'camera', color: '#00BCD4' },
  { id: 'question', label: 'Question', icon: 'help-circle', color: '#795548' },
];

export const getCategoryById = (id: string): CategoryInfo => {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
};


