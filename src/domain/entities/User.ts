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
}

export interface CreateUserRequest {
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}