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
  imageUrl?: string;
  location: Location;
  createdAt: Date;
  expiresAt: Date;
  upvotes: number;
  downvotes: number;
  commentsCount: number;
  isActive: boolean;
  hasUserVoted?: 'up' | 'down' | null;
}

export interface CreateNoteRequest {
  content: string;
  imageUri?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  expiresInDays?: number;
}

export interface UpdateNoteRequest {
  id: string;
  content?: string;
  imageUri?: string;
}