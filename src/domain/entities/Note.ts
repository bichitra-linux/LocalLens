export interface Location {
  latitude: number;
  longitude: number;
  geohash: string;
}

export interface Note {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  content: string;
  location: Location;
  createdAt: Date;
  expiresAt: Date;
  upvotes: number;
  downvotes: number;
  commentsCount: number;
  isActive: boolean;
  hasUserVoted?: 'up' | 'down' | null;
  category?: string;
  reactionCounts?: Record<string, number>;
}

export interface CreateNoteRequest {
  content: string;
  location: {
    latitude: number;
    longitude: number;
  };
  expiresInDays?: number;
  category?: string;
}

export interface UpdateNoteRequest {
  id: string;
  content?: string;
}