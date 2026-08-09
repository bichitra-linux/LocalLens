import { NoteUseCase } from '../domain/usecases/NoteUseCase';
import { NoteRepository } from '../domain/repositories/NoteRepository';
import { InteractionRepository } from '../domain/repositories/InteractionRepository';
import { Note, CreateNoteRequest } from '../domain/entities/Note';
import { PaginatedResponse } from '../domain/entities/Common';
import { Vote, VoteType } from '../domain/entities/Interaction';

const mockNoteRepository: jest.Mocked<NoteRepository> = {
  getNotesByLocation: jest.fn(),
  getNoteById: jest.fn(),
  getUserNotes: jest.fn(),
  createNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
  listenToNotesInArea: jest.fn(),
};

const mockInteractionRepository: jest.Mocked<InteractionRepository> = {
  voteOnNote: jest.fn(),
  removeVote: jest.fn(),
  getUserVote: jest.fn(),
  getUserVotes: jest.fn(),
  getComments: jest.fn(),
  createComment: jest.fn(),
  deleteComment: jest.fn(),
};

const createMockNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  userId: 'user-1',
  username: 'testuser',
  content: 'Test note content',
  location: { latitude: 40.7128, longitude: -74.006, geohash: 'dr5reg' },
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  upvotes: 0,
  downvotes: 0,
  commentsCount: 0,
  isActive: true,
  ...overrides,
});

describe('NoteUseCase', () => {
  let noteUseCase: NoteUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    noteUseCase = new NoteUseCase(mockNoteRepository, mockInteractionRepository);
  });

  describe('createNote', () => {
    const validRequest: CreateNoteRequest = {
      content: 'Test note content',
      location: { latitude: 40.7128, longitude: -74.006 },
      expiresInDays: 7,
    };

    it('should create a note with valid input', async () => {
      const expectedNote = createMockNote();
      mockNoteRepository.createNote.mockResolvedValue(expectedNote);

      const result = await noteUseCase.createNote(validRequest);

      expect(result).toEqual(expectedNote);
      expect(mockNoteRepository.createNote).toHaveBeenCalledWith({
        ...validRequest,
        expiresInDays: 7,
      });
    });

    it('should default expiresInDays to 7 when not provided', async () => {
      const expectedNote = createMockNote();
      mockNoteRepository.createNote.mockResolvedValue(expectedNote);

      await noteUseCase.createNote({ ...validRequest, expiresInDays: undefined });

      expect(mockNoteRepository.createNote).toHaveBeenCalledWith({
        ...validRequest,
        expiresInDays: 7,
      });
    });

    it('should reject empty content', async () => {
      await expect(
        noteUseCase.createNote({ ...validRequest, content: '' })
      ).rejects.toThrow('Note content is required');
    });

    it('should reject whitespace-only content', async () => {
      await expect(
        noteUseCase.createNote({ ...validRequest, content: '   ' })
      ).rejects.toThrow('Note content is required');
    });

    it('should reject content exceeding 500 characters', async () => {
      await expect(
        noteUseCase.createNote({ ...validRequest, content: 'a'.repeat(501) })
      ).rejects.toThrow('Note content must be less than 500 characters');
    });

    it('should accept content at exactly 500 characters', async () => {
      const expectedNote = createMockNote();
      mockNoteRepository.createNote.mockResolvedValue(expectedNote);

      const result = await noteUseCase.createNote({
        ...validRequest,
        content: 'a'.repeat(500),
      });

      expect(result).toEqual(expectedNote);
    });

    it('should reject invalid latitude', async () => {
      await expect(
        noteUseCase.createNote({
          ...validRequest,
          location: { latitude: 100, longitude: -74.006 },
        })
      ).rejects.toThrow('Invalid coordinates');
    });

    it('should reject invalid longitude', async () => {
      await expect(
        noteUseCase.createNote({
          ...validRequest,
          location: { latitude: 40.7128, longitude: 200 },
        })
      ).rejects.toThrow('Invalid coordinates');
    });

    it('should reject expiration less than 1 day', async () => {
      await expect(
        noteUseCase.createNote({ ...validRequest, expiresInDays: 0 })
      ).rejects.toThrow('Notes can expire between 1 and 30 days');
    });

    it('should reject expiration more than 30 days', async () => {
      await expect(
        noteUseCase.createNote({ ...validRequest, expiresInDays: 31 })
      ).rejects.toThrow('Notes can expire between 1 and 30 days');
    });

    it('should accept expiration at boundary values', async () => {
      const expectedNote = createMockNote();
      mockNoteRepository.createNote.mockResolvedValue(expectedNote);

      await noteUseCase.createNote({ ...validRequest, expiresInDays: 1 });
      await noteUseCase.createNote({ ...validRequest, expiresInDays: 30 });

      expect(mockNoteRepository.createNote).toHaveBeenCalledTimes(2);
    });
  });

  describe('getNearbyNotes', () => {
    it('should enrich notes with user vote status', async () => {
      const notes = [createMockNote()];
      const mockVote: Vote = {
        id: 'vote-1',
        userId: 'user-1',
        noteId: 'note-1',
        type: 'up',
        createdAt: new Date(),
      };

      mockNoteRepository.getNotesByLocation.mockResolvedValue({
        data: notes,
        hasMore: false,
      });
      mockInteractionRepository.getUserVote.mockResolvedValue(mockVote);

      const result = await noteUseCase.getNearbyNotes(40.7128, -74.006, 5);

      expect(result.data[0].hasUserVoted).toBe('up');
    });

    it('should set hasUserVoted to null when no vote exists', async () => {
      const notes = [createMockNote()];
      mockNoteRepository.getNotesByLocation.mockResolvedValue({
        data: notes,
        hasMore: false,
      });
      mockInteractionRepository.getUserVote.mockResolvedValue(null);

      const result = await noteUseCase.getNearbyNotes(40.7128, -74.006, 5);

      expect(result.data[0].hasUserVoted).toBeNull();
    });

    it('should pass pagination parameters correctly', async () => {
      mockNoteRepository.getNotesByLocation.mockResolvedValue({
        data: [],
        hasMore: false,
      });
      mockInteractionRepository.getUserVote.mockResolvedValue(null);

      const mockLastDoc = { id: 'last-doc' };
      await noteUseCase.getNearbyNotes(40.7128, -74.006, 10, mockLastDoc);

      expect(mockNoteRepository.getNotesByLocation).toHaveBeenCalledWith(
        { latitude: 40.7128, longitude: -74.006, radiusInKm: 10 },
        mockLastDoc
      );
    });

    it('should use default radius of 5km', async () => {
      mockNoteRepository.getNotesByLocation.mockResolvedValue({
        data: [],
        hasMore: false,
      });

      await noteUseCase.getNearbyNotes(40.7128, -74.006);

      expect(mockNoteRepository.getNotesByLocation).toHaveBeenCalledWith(
        { latitude: 40.7128, longitude: -74.006, radiusInKm: 5 },
        undefined
      );
    });
  });

  describe('getNoteById', () => {
    it('should return enriched note with vote status', async () => {
      const note = createMockNote();
      const mockVote: Vote = {
        id: 'vote-1',
        userId: 'user-1',
        noteId: 'note-1',
        type: 'down',
        createdAt: new Date(),
      };

      mockNoteRepository.getNoteById.mockResolvedValue(note);
      mockInteractionRepository.getUserVote.mockResolvedValue(mockVote);

      const result = await noteUseCase.getNoteById('note-1');

      expect(result).not.toBeNull();
      expect(result!.hasUserVoted).toBe('down');
    });

    it('should return null when note not found', async () => {
      mockNoteRepository.getNoteById.mockResolvedValue(null);

      const result = await noteUseCase.getNoteById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateNote', () => {
    it('should update note with valid content', async () => {
      mockNoteRepository.updateNote.mockResolvedValue();

      await noteUseCase.updateNote({ id: 'note-1', content: 'Updated content' });

      expect(mockNoteRepository.updateNote).toHaveBeenCalledWith({
        id: 'note-1',
        content: 'Updated content',
      });
    });

    it('should reject content exceeding 500 characters', async () => {
      await expect(
        noteUseCase.updateNote({ id: 'note-1', content: 'a'.repeat(501) })
      ).rejects.toThrow('Note content must be less than 500 characters');
    });
  });

  describe('deleteNote', () => {
    it('should call repository deleteNote', async () => {
      mockNoteRepository.deleteNote.mockResolvedValue();

      await noteUseCase.deleteNote('note-1');

      expect(mockNoteRepository.deleteNote).toHaveBeenCalledWith('note-1');
    });
  });

  describe('getUserNotes', () => {
    it('should return user notes from repository', async () => {
      const notes = [createMockNote()];
      mockNoteRepository.getUserNotes.mockResolvedValue({
        data: notes,
        hasMore: true,
        lastDoc: { id: 'last' },
      });

      const result = await noteUseCase.getUserNotes('user-1');

      expect(result.data).toEqual(notes);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('listenToNearbyNotes', () => {
    it('should return unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      mockNoteRepository.listenToNotesInArea.mockReturnValue(mockUnsubscribe);

      const result = noteUseCase.listenToNearbyNotes(40.7128, -74.006, 5, jest.fn());

      expect(typeof result).toBe('function');
    });

    it('should enrich notes with vote status in callback', (done) => {
      const notes = [createMockNote()];
      const mockVote: Vote = {
        id: 'vote-1',
        userId: 'user-1',
        noteId: 'note-1',
        type: 'up',
        createdAt: new Date(),
      };

      mockInteractionRepository.getUserVote.mockResolvedValue(mockVote);
      mockNoteRepository.listenToNotesInArea.mockImplementation((query, callback) => {
        setTimeout(() => callback(notes), 10);
        return jest.fn();
      });

      noteUseCase.listenToNearbyNotes(40.7128, -74.006, 5, (enrichedNotes) => {
        expect(enrichedNotes[0].hasUserVoted).toBe('up');
        done();
      });
    });
  });
});
