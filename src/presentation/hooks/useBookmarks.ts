import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookmarkService } from '../../utils/bookmarks';
import { Note } from '../../domain/entities/Note';

const bookmarkService = BookmarkService.getInstance();

export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  list: () => [...bookmarkKeys.all, 'list'] as const,
  isBookmarked: (noteId: string) => [...bookmarkKeys.all, 'isBookmarked', noteId] as const,
};

export const useBookmarks = () => {
  return useQuery({
    queryKey: bookmarkKeys.list(),
    queryFn: () => bookmarkService.getBookmarks(),
    staleTime: 30000,
  });
};

export const useIsBookmarked = (noteId: string) => {
  return useQuery({
    queryKey: bookmarkKeys.isBookmarked(noteId),
    queryFn: () => bookmarkService.isBookmarked(noteId),
    staleTime: 30000,
    enabled: !!noteId,
  });
};

export const useToggleBookmark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: Note) => bookmarkService.toggleBookmark(note),
    onSuccess: (_, note) => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.isBookmarked(note.id) });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.list() });
    },
  });
};


