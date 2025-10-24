import { Vote, Comment, CreateVoteRequest, CreateCommentRequest } from '../entities/Interaction';
import { PaginatedResponse } from '../entities/Common';

export interface InteractionRepository {
  voteOnNote(request: CreateVoteRequest): Promise<void>;
  removeVote(noteId: string): Promise<void>;
  getUserVote(noteId: string): Promise<Vote | null>;
  getComments(noteId: string, lastDoc?: any): Promise<PaginatedResponse<Comment>>;
  createComment(request: CreateCommentRequest): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
}