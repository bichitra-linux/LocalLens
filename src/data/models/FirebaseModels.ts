import { Timestamp } from 'firebase/firestore';

// Firebase Collections Schema Design
// Optimized for efficient geospatial queries using geohashes

export interface FirebaseUserDoc {
  id: string; // matches auth UID
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
  notesCount: number;
  votesCount: number;
}

export interface FirebaseNoteDoc {
  id: string;
  userId: string;
  username: string; // denormalized for performance
  userAvatar?: string; // denormalized for performance
  content: string;
  imageUrl?: string;
  
  // Geospatial data - key for efficient querying
  latitude: number;
  longitude: number;
  geohash: string; // 7-character geohash for ~150m precision
  geohashPrefixes: string[]; // Array of prefixes for range queries
  
  createdAt: Timestamp;
  expiresAt: Timestamp;
  upvotes: number;
  downvotes: number;
  commentsCount: number;
  isActive: boolean;
  
  // Composite indexes needed:
  // - geohash, isActive, createdAt (desc)
  // - userId, createdAt (desc)
  // - expiresAt (for cleanup job)
}

export interface FirebaseVoteDoc {
  id: string;
  userId: string;
  noteId: string;
  type: 'up' | 'down';
  createdAt: Timestamp;
  
  // Composite indexes needed:
  // - userId, noteId (unique constraint via security rules)
  // - noteId, type, createdAt
}

export interface FirebaseCommentDoc {
  id: string;
  noteId: string;
  userId: string;
  username: string; // denormalized
  userAvatar?: string; // denormalized
  content: string;
  createdAt: Timestamp;
  upvotes: number;
  downvotes: number;
  
  // Composite indexes needed:
  // - noteId, createdAt (desc)
}

// Geohash utility for efficient proximity queries
export const GEOHASH_PRECISION = 7; // ~150m accuracy
export const SEARCH_RADIUS_KM = 5; // Default search radius

// Collection names
export const Collections = {
  USERS: 'users',
  NOTES: 'notes',
  VOTES: 'votes',
  COMMENTS: 'comments',
  REPORTS: 'reports', // for moderation
} as const;