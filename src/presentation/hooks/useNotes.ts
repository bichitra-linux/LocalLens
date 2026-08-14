import { useEffect, useRef } from 'react';
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
      location.latitude ?? 0, 
      location.longitude ?? 0, 
      searchRadius
    ),
    queryFn: ({ pageParam }) => {
      if (location.latitude === null || location.longitude === null) {
        throw new Error('Location is required');
      }
      
      return noteUseCase.getNearbyNotes(
        location.latitude,
        location.longitude,
        searchRadius,
        pageParam
      );
    },
    enabled: location.latitude !== null && location.longitude !== null,
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
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (location.latitude === null || location.longitude === null) return;

    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const unsubscribe = noteUseCase.listenToNearbyNotes(
      location.latitude,
      location.longitude,
      searchRadius,
      (notes) => {
        const queryKey = noteKeys.nearby(location.latitude!, location.longitude!, searchRadius);
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.pages?.[0]) {
            return {
              pages: [{ data: notes, hasMore: false }],
              pageParams: [undefined],
            };
          }
          // Merge listener data into first page without clobbering pagination state
          const existingIds = new Set(old.pages[0].data.map((n: any) => n.id));
          const merged = [...old.pages[0].data];
          for (const note of notes) {
            if (!existingIds.has(note.id)) {
              merged.unshift(note);
              existingIds.add(note.id);
            }
          }
          return {
            ...old,
            pages: [{ ...old.pages[0], data: merged }, ...old.pages.slice(1)],
          };
        });
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [location.latitude, location.longitude, searchRadius, queryClient]);
};

// Mutations
export const useCreateNote = () => {
  const queryClient = useQueryClient();
  const { location } = useAppStore();
  
  return useMutation({
    mutationFn: (request: CreateNoteRequest) => noteUseCase.createNote(request),
    onSuccess: (newNote) => {
      // Add to nearby notes cache
      if (location.latitude !== null && location.longitude !== null) {
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