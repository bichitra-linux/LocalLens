export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Date;
  lastActiveAt: Date;
  notesCount: number;
  votesCount: number;
  reputationLevel?: number;
  achievementsCount?: number;
}

export interface CreateUserRequest {
  id?: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}