import { InteractionRepository } from '../repositories/InteractionRepository';
import { Vote, Comment, CreateVoteRequest, CreateCommentRequest, VoteType } from '../entities/Interaction';
import { PaginatedResponse } from '../entities/Common';

export class InteractionUseCase {
  constructor(private interactionRepository: InteractionRepository) {}

  async voteOnNote(noteId: string, voteType: VoteType): Promise<void> {
    if (!noteId) {
      throw new Error('Note ID is required');
    }

    const request: CreateVoteRequest = {
      noteId,
      type: voteType,
    };

    await this.interactionRepository.voteOnNote(request);
  }

  async removeVoteFromNote(noteId: string): Promise<void> {
    if (!noteId) {
      throw new Error('Note ID is required');
    }

    await this.interactionRepository.removeVote(noteId);
  }

  async getUserVoteForNote(noteId: string): Promise<Vote | null> {
    return await this.interactionRepository.getUserVote(noteId);
  }

  async getCommentsForNote(noteId: string, lastDoc?: any): Promise<PaginatedResponse<Comment>> {
    if (!noteId) {
      throw new Error('Note ID is required');
    }

    return await this.interactionRepository.getComments(noteId, lastDoc);
  }

  async addComment(noteId: string, content: string): Promise<Comment> {
    if (!noteId) {
      throw new Error('Note ID is required');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Comment content is required');
    }

    if (content.length > 280) {
      throw new Error('Comment must be less than 280 characters');
    }

    const request: CreateCommentRequest = {
      noteId,
      content: content.trim(),
    };

    return await this.interactionRepository.createComment(request);
  }

  async deleteComment(commentId: string): Promise<void> {
    if (!commentId) {
      throw new Error('Comment ID is required');
    }

    await this.interactionRepository.deleteComment(commentId);
  }

  async toggleVote(noteId: string, voteType: VoteType): Promise<void> {
    const currentVote = await this.getUserVoteForNote(noteId);

    if (currentVote?.type === voteType) {
      // Remove vote if user clicks the same vote type
      await this.removeVoteFromNote(noteId);
    } else {
      // Add or change vote
      await this.voteOnNote(noteId, voteType);
    }
  }
}