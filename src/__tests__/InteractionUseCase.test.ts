import { InteractionUseCase } from '../domain/usecases/InteractionUseCase';
import { InteractionRepository } from '../domain/repositories/InteractionRepository';
import { Vote, VoteType, Comment } from '../domain/entities/Interaction';

const mockInteractionRepository: jest.Mocked<InteractionRepository> = {
  voteOnNote: jest.fn(),
  removeVote: jest.fn(),
  getUserVote: jest.fn(),
  getUserVotes: jest.fn(),
  getComments: jest.fn(),
  createComment: jest.fn(),
  deleteComment: jest.fn(),
};

const createMockVote = (overrides: Partial<Vote> = {}): Vote => ({
  id: 'vote-1',
  userId: 'user-1',
  noteId: 'note-1',
  type: 'up',
  createdAt: new Date(),
  ...overrides,
});

const createMockComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'comment-1',
  noteId: 'note-1',
  userId: 'user-1',
  username: 'testuser',
  content: 'Great note!',
  createdAt: new Date(),
  upvotes: 0,
  downvotes: 0,
  ...overrides,
});

describe('InteractionUseCase', () => {
  let interactionUseCase: InteractionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    interactionUseCase = new InteractionUseCase(mockInteractionRepository);
  });

  describe('voteOnNote', () => {
    it('should vote with valid input', async () => {
      mockInteractionRepository.voteOnNote.mockResolvedValue();

      await interactionUseCase.voteOnNote('note-1', 'up');

      expect(mockInteractionRepository.voteOnNote).toHaveBeenCalledWith({
        noteId: 'note-1',
        type: 'up',
      });
    });

    it('should reject empty noteId', async () => {
      await expect(
        interactionUseCase.voteOnNote('', 'up')
      ).rejects.toThrow('Note ID is required');
    });

    it('should support both vote types', async () => {
      mockInteractionRepository.voteOnNote.mockResolvedValue();

      await interactionUseCase.voteOnNote('note-1', 'up');
      await interactionUseCase.voteOnNote('note-1', 'down');

      expect(mockInteractionRepository.voteOnNote).toHaveBeenCalledTimes(2);
    });
  });

  describe('removeVoteFromNote', () => {
    it('should remove vote with valid noteId', async () => {
      mockInteractionRepository.removeVote.mockResolvedValue();

      await interactionUseCase.removeVoteFromNote('note-1');

      expect(mockInteractionRepository.removeVote).toHaveBeenCalledWith('note-1');
    });

    it('should reject empty noteId', async () => {
      await expect(
        interactionUseCase.removeVoteFromNote('')
      ).rejects.toThrow('Note ID is required');
    });
  });

  describe('getUserVoteForNote', () => {
    it('should return vote when exists', async () => {
      const vote = createMockVote();
      mockInteractionRepository.getUserVote.mockResolvedValue(vote);

      const result = await interactionUseCase.getUserVoteForNote('note-1');

      expect(result).toEqual(vote);
    });

    it('should return null when no vote exists', async () => {
      mockInteractionRepository.getUserVote.mockResolvedValue(null);

      const result = await interactionUseCase.getUserVoteForNote('note-1');

      expect(result).toBeNull();
    });
  });

  describe('toggleVote', () => {
    it('should remove vote if same type clicked', async () => {
      const existingVote = createMockVote({ type: 'up' });
      mockInteractionRepository.getUserVote.mockResolvedValue(existingVote);

      await interactionUseCase.toggleVote('note-1', 'up');

      expect(mockInteractionRepository.removeVote).toHaveBeenCalledWith('note-1');
      expect(mockInteractionRepository.voteOnNote).not.toHaveBeenCalled();
    });

    it('should add vote if no existing vote', async () => {
      mockInteractionRepository.getUserVote.mockResolvedValue(null);

      await interactionUseCase.toggleVote('note-1', 'up');

      expect(mockInteractionRepository.voteOnNote).toHaveBeenCalledWith({
        noteId: 'note-1',
        type: 'up',
      });
      expect(mockInteractionRepository.removeVote).not.toHaveBeenCalled();
    });

    it('should switch vote if different type', async () => {
      const existingVote = createMockVote({ type: 'up' });
      mockInteractionRepository.getUserVote.mockResolvedValue(existingVote);

      await interactionUseCase.toggleVote('note-1', 'down');

      expect(mockInteractionRepository.voteOnNote).toHaveBeenCalledWith({
        noteId: 'note-1',
        type: 'down',
      });
      expect(mockInteractionRepository.removeVote).not.toHaveBeenCalled();
    });
  });

  describe('getCommentsForNote', () => {
    it('should return comments for note', async () => {
      const comments = [createMockComment()];
      mockInteractionRepository.getComments.mockResolvedValue({
        data: comments,
        hasMore: false,
      });

      const result = await interactionUseCase.getCommentsForNote('note-1');

      expect(result.data).toEqual(comments);
    });

    it('should reject empty noteId', async () => {
      await expect(
        interactionUseCase.getCommentsForNote('')
      ).rejects.toThrow('Note ID is required');
    });

    it('should pass pagination parameters', async () => {
      mockInteractionRepository.getComments.mockResolvedValue({
        data: [],
        hasMore: false,
      });

      const mockLastDoc = { id: 'last-doc' };
      await interactionUseCase.getCommentsForNote('note-1', mockLastDoc);

      expect(mockInteractionRepository.getComments).toHaveBeenCalledWith('note-1', mockLastDoc);
    });
  });

  describe('addComment', () => {
    it('should create comment with valid input', async () => {
      const expectedComment = createMockComment();
      mockInteractionRepository.createComment.mockResolvedValue(expectedComment);

      const result = await interactionUseCase.addComment('note-1', 'Great note!');

      expect(result).toEqual(expectedComment);
      expect(mockInteractionRepository.createComment).toHaveBeenCalledWith({
        noteId: 'note-1',
        content: 'Great note!',
      });
    });

    it('should trim comment content', async () => {
      const expectedComment = createMockComment();
      mockInteractionRepository.createComment.mockResolvedValue(expectedComment);

      await interactionUseCase.addComment('note-1', '  Great note!  ');

      expect(mockInteractionRepository.createComment).toHaveBeenCalledWith({
        noteId: 'note-1',
        content: 'Great note!',
      });
    });

    it('should reject empty comment', async () => {
      await expect(
        interactionUseCase.addComment('note-1', '')
      ).rejects.toThrow('Comment content is required');
    });

    it('should reject whitespace-only comment', async () => {
      await expect(
        interactionUseCase.addComment('note-1', '   ')
      ).rejects.toThrow('Comment content is required');
    });

    it('should reject comment exceeding 280 characters', async () => {
      await expect(
        interactionUseCase.addComment('note-1', 'a'.repeat(281))
      ).rejects.toThrow('Comment must be less than 280 characters');
    });

    it('should accept comment at exactly 280 characters', async () => {
      const expectedComment = createMockComment();
      mockInteractionRepository.createComment.mockResolvedValue(expectedComment);

      const result = await interactionUseCase.addComment('note-1', 'a'.repeat(280));

      expect(result).toEqual(expectedComment);
    });

    it('should reject empty noteId', async () => {
      await expect(
        interactionUseCase.addComment('', 'content')
      ).rejects.toThrow('Note ID is required');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment with valid id', async () => {
      mockInteractionRepository.deleteComment.mockResolvedValue();

      await interactionUseCase.deleteComment('comment-1');

      expect(mockInteractionRepository.deleteComment).toHaveBeenCalledWith('comment-1');
    });

    it('should reject empty commentId', async () => {
      await expect(
        interactionUseCase.deleteComment('')
      ).rejects.toThrow('Comment ID is required');
    });
  });
});
