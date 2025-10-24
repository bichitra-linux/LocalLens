export type VoteType = 'up' | 'down';

export interface Vote {
  id: string;
  userId: string;
  noteId: string;
  type: VoteType;
  createdAt: Date;
}

export interface Comment {
  id: string;
  noteId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  content: string;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
}

export interface CreateVoteRequest {
  noteId: string;
  type: VoteType;
}

export interface CreateCommentRequest {
  noteId: string;
  content: string;
}