export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  requirement: number;
  category: 'notes' | 'votes' | 'comments' | 'social' | 'special';
}

export interface UserAchievement {
  achievementId: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string; // ISO date
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-note', name: 'First Note', description: 'Create your first note', icon: 'create', requirement: 1, category: 'notes' },
  { id: 'storyteller', name: 'Storyteller', description: 'Create 10 notes', icon: 'book', requirement: 10, category: 'notes' },
  { id: 'local-guide', name: 'Local Guide', description: 'Create 50 notes', icon: 'map', requirement: 50, category: 'notes' },
  { id: 'popular', name: 'Popular', description: 'Receive 10 upvotes on your notes', icon: 'star', requirement: 10, category: 'votes' },
  { id: 'influencer', name: 'Influencer', description: 'Receive 100 upvotes on your notes', icon: 'trophy', requirement: 100, category: 'votes' },
  { id: 'commentator', name: 'Commentator', description: 'Add 10 comments', icon: 'chatbubbles', requirement: 10, category: 'comments' },
  { id: 'conversationalist', name: 'Conversationalist', description: 'Add 50 comments', icon: 'people', requirement: 50, category: 'comments' },
  { id: 'explorer', name: 'Explorer', description: 'Create notes in 3 different locations', icon: 'compass', requirement: 3, category: 'social' },
  { id: 'early-bird', name: 'Early Bird', description: 'Create a note before 8am', icon: 'sunny', requirement: 1, category: 'special' },
  { id: 'night-owl', name: 'Night Owl', description: 'Create a note after midnight', icon: 'moon', requirement: 1, category: 'special' },
  { id: 'bookworm', name: 'Bookworm', description: 'Bookmark 10 notes', icon: 'bookmark', requirement: 10, category: 'social' },
  { id: 'reactor', name: 'Reactor', description: 'Add 20 reactions', icon: 'happy', requirement: 20, category: 'social' },
];

export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find(a => a.id === id);
};

export const REPUTATION_LEVELS = [
  { level: 1, title: 'Newcomer', minPoints: 0 },
  { level: 2, title: 'Explorer', minPoints: 10 },
  { level: 3, title: 'Contributor', minPoints: 30 },
  { level: 4, title: 'Regular', minPoints: 60 },
  { level: 5, title: 'Expert', minPoints: 100 },
  { level: 6, title: 'Veteran', minPoints: 150 },
  { level: 7, title: 'Ambassador', minPoints: 250 },
  { level: 8, title: 'Legend', minPoints: 400 },
  { level: 9, title: 'Icon', minPoints: 600 },
  { level: 10, title: 'Master', minPoints: 1000 },
];

export const getReputationLevel = (points: number) => {
  for (let i = REPUTATION_LEVELS.length - 1; i >= 0; i--) {
    if (points >= REPUTATION_LEVELS[i].minPoints) {
      return REPUTATION_LEVELS[i];
    }
  }
  return REPUTATION_LEVELS[0];
};
