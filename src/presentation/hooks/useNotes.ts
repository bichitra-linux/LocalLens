import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { NoteUseCase } from '../../domain/usecases/NoteUseCase';
import { InteractionUseCase } from '../../domain/usecases/InteractionUseCase';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../../domain/entities/Note';
import { useAppStore } from '../store/appStore';

// Dependency injection
import { FirebaseNoteRepository } from '../../data/repositories/FirebaseNoteRepository';
import { FirebaseInteractionRepository } from '../../data/repositories/FirebaseInteractionRepository';

const noteRepository = new FirebaseNoteRepository();
const interactionRepository = new FirebaseInteractionRepository();
const noteUseCase = new NoteUseCase(noteRepository, interactionRepository);
const interactionUseCase = new InteractionUseCase(interactionRepository);

// Query keys
export const noteKeys = {
  all: ['notes'] as const,
  nearby: (lat: number, lng: number, radius: number) => 
    [...noteKeys.all, 'nearby', lat, lng, radius] as const,
  byId: (id: string) => [...noteKeys.all, 'byId', id] as const,
  byUser: (userId: string) => [...noteKeys.all, 'byUser', userId] as const,
};

// Queries
export const useNearbyNotes = () => {
  const { location, searchRadius } = useAppStore();
  
  return useInfiniteQuery({
    queryKey: noteKeys.nearby(
      location.latitude || 0, 
      location.longitude || 0, 
      searchRadius
    ),
    queryFn: ({ pageParam }) => {
      if (!location.latitude || !location.longitude) {
        throw new Error('Location is required');
      }
      
      return noteUseCase.getNearbyNotes(
        location.latitude,
        location.longitude,
        searchRadius,
        pageParam
      );
    },
    enabled: !!(location.latitude && location.longitude),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.lastDoc : undefined,
    staleTime: 30000, // 30 seconds
  });
};

export const useNote = (id: string) => {
  return useQuery({
    queryKey: noteKeys.byId(id),
    queryFn: () => noteUseCase.getNoteById(id),
    enabled: !!id,
  });
};

export const useUserNotes = (userId: string) => {
  return useInfiniteQuery({
    queryKey: noteKeys.byUser(userId),
    queryFn: ({ pageParam }) => noteUseCase.getUserNotes(userId, pageParam),
    enabled: !!userId,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.lastDoc : undefined,
  });
};

// Real-time subscription hook
export const useNearbyNotesListener = () => {
  const { location, searchRadius } = useAppStore();
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['notes', 'listener', location.latitude, location.longitude, searchRadius],
    queryFn: () => {
      if (!location.latitude || !location.longitude) {
        return Promise.resolve([]);
      }

      return new Promise<Note[]>((resolve) => {
        const unsubscribe = noteUseCase.listenToNearbyNotes(
          location.latitude!,
          location.longitude!,
          searchRadius,
          (notes) => {
            // Update the nearby notes cache
            queryClient.setQueryData(
              noteKeys.nearby(location.latitude!, location.longitude!, searchRadius),
              (old: any) => ({
                pages: [{ data: notes, hasMore: false }],
                pageParams: [undefined],
              })
            );
            resolve(notes);
          }
        );

        // Cleanup function
        return () => unsubscribe();
      });
    },
    enabled: !!(location.latitude && location.longitude),
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

// Mutations
export const useCreateNote = () => {
  const queryClient = useQueryClient();
  const { location } = useAppStore();
  
  return useMutation({
    mutationFn: (request: CreateNoteRequest) => noteUseCase.createNote(request),
    onSuccess: (newNote) => {
      // Add to nearby notes cache
      if (location.latitude && location.longitude) {
        const queryKey = noteKeys.nearby(
          location.latitude, 
          location.longitude, 
          useAppStore.getState().searchRadius
        );
        
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.pages) return old;
          
          const firstPage = { ...old.pages[0] };
          firstPage.data = [newNote, ...firstPage.data];
          
          return {
            ...old,
            pages: [firstPage, ...old.pages.slice(1)],
          };
        });
      }

      // Invalidate user notes
      queryClient.invalidateQueries({
        queryKey: noteKeys.byUser(newNote.userId),
      });
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: UpdateNoteRequest) => noteUseCase.updateNote(request),
    onSuccess: (_, request) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: noteKeys.byId(request.id),
      });
      queryClient.invalidateQueries({
        queryKey: noteKeys.all,
      });
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => noteUseCase.deleteNote(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: noteKeys.byId(id),
      });
      
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: noteKeys.all,
      });
    },
  });
};