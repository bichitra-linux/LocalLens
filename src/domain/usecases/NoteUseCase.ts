import { NoteRepository } from '../repositories/NoteRepository';
import { InteractionRepository } from '../repositories/InteractionRepository';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../entities/Note';
import { GeospatialQuery, PaginatedResponse } from '../entities/Common';

export class NoteUseCase {
  constructor(
    private noteRepository: NoteRepository,
    private interactionRepository: InteractionRepository
  ) {}

  async getNearbyNotes(
    latitude: number,
    longitude: number,
    radiusInKm: number = 5,
    lastDoc?: any
  ): Promise<PaginatedResponse<Note>> {
    const query: GeospatialQuery = {
      latitude,
      longitude,
      radiusInKm,
    };

    const result = await this.noteRepository.getNotesByLocation(query, lastDoc);
    
    // Enrich notes with user vote status
    const enrichedNotes = await Promise.all(
      result.data.map(async (note) => {
        const userVote = await this.interactionRepository.getUserVote(note.id);
        return {
          ...note,
          hasUserVoted: userVote?.type || null,
        };
      })
    );

    return {
      ...result,
      data: enrichedNotes,
    };
  }

  async getNoteById(id: string): Promise<Note | null> {
    const note = await this.noteRepository.getNoteById(id);
    
    if (!note) {
      return null;
    }

    // Enrich with user vote status
    const userVote = await this.interactionRepository.getUserVote(id);
    return {
      ...note,
      hasUserVoted: userVote?.type || null,
    };
  }

  async createNote(request: CreateNoteRequest): Promise<Note> {
    // Validate content
    if (!request.content || request.content.trim().length === 0) {
      throw new Error('Note content is required');
    }

    if (request.content.length > 500) {
      throw new Error('Note content must be less than 500 characters');
    }

    // Validate location
    if (!this.isValidCoordinate(request.location.latitude, request.location.longitude)) {
      throw new Error('Invalid coordinates');
    }

    // Validate expiration
    const expiresInDays = request.expiresInDays || 7;
    if (expiresInDays < 1 || expiresInDays > 30) {
      throw new Error('Notes can expire between 1 and 30 days');
    }

    return await this.noteRepository.createNote({
      ...request,
      expiresInDays,
    });
  }

  async updateNote(request: UpdateNoteRequest): Promise<void> {
    if (request.content && request.content.length > 500) {
      throw new Error('Note content must be less than 500 characters');
    }

    await this.noteRepository.updateNote(request);
  }

  async deleteNote(id: string): Promise<void> {
    await this.noteRepository.deleteNote(id);
  }

  async getUserNotes(userId: string, lastDoc?: any): Promise<PaginatedResponse<Note>> {
    return await this.noteRepository.getUserNotes(userId, lastDoc);
  }

  listenToNearbyNotes(
    latitude: number,
    longitude: number,
    radiusInKm: number = 5,
    callback: (notes: Note[]) => void
  ): () => void {
    const query: GeospatialQuery = {
      latitude,
      longitude,
      radiusInKm,
    };

    return this.noteRepository.listenToNotesInArea(query, async (notes) => {
      // Enrich notes with user vote status
      const enrichedNotes = await Promise.all(
        notes.map(async (note) => {
          const userVote = await this.interactionRepository.getUserVote(note.id);
          return {
            ...note,
            hasUserVoted: userVote?.type || null,
          };
        })
      );

      callback(enrichedNotes);
    });
  }

  private isValidCoordinate(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 && 
      latitude <= 90 && 
      longitude >= -180 && 
      longitude <= 180
    );
  }
}