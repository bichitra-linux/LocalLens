import { ReactionRepository } from '../repositories/ReactionRepository';
import { Reaction, CreateReactionRequest, ReactionCount, ReactionEmoji } from '../entities/Reaction';

export class ReactionUseCase {
  constructor(private reactionRepository: ReactionRepository) {}

  async toggleReaction(noteId: string, emoji: ReactionEmoji): Promise<void> {
    const userReactions = await this.reactionRepository.getUserReactions(noteId);
    if (userReactions.includes(emoji)) {
      await this.reactionRepository.removeReaction(noteId, emoji);
    } else {
      await this.reactionRepository.addReaction({ noteId, emoji });
    }
  }

  async getReactionsForNote(noteId: string): Promise<ReactionCount[]> {
    return await this.reactionRepository.getReactionsForNote(noteId);
  }

  async getUserReactions(noteId: string): Promise<string[]> {
    return await this.reactionRepository.getUserReactions(noteId);
  }
}
