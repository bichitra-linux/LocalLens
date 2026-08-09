import { Reaction, CreateReactionRequest, ReactionCount } from '../entities/Reaction';

export interface ReactionRepository {
  addReaction(request: CreateReactionRequest): Promise<Reaction>;
  removeReaction(noteId: string, emoji: string): Promise<void>;
  getReactionsForNote(noteId: string): Promise<ReactionCount[]>;
  getUserReactions(noteId: string): Promise<string[]>;
}
