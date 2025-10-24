import { Note, CreateNoteRequest, UpdateNoteRequest } from '../entities/Note';
import { GeospatialQuery, PaginatedResponse } from '../entities/Common';

export interface NoteRepository {
  getNotesByLocation(query: GeospatialQuery, lastDoc?: any): Promise<PaginatedResponse<Note>>;
  getNoteById(id: string): Promise<Note | null>;
  getUserNotes(userId: string, lastDoc?: any): Promise<PaginatedResponse<Note>>;
  createNote(request: CreateNoteRequest): Promise<Note>;
  updateNote(request: UpdateNoteRequest): Promise<void>;
  deleteNote(id: string): Promise<void>;
  uploadImage(uri: string): Promise<string>;
  listenToNotesInArea(query: GeospatialQuery, callback: (notes: Note[]) => void): () => void;
}