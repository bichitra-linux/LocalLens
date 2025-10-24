import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { InteractionUseCase } from '../../domain/usecases/InteractionUseCase';
import { VoteType } from '../../domain/entities/Interaction';
import { noteKeys } from './useNotes';

// Dependency injection
import { FirebaseInteractionRepository } from '../../data/repositories/FirebaseInteractionRepository';

const interactionRepository = new FirebaseInteractionRepository();
const interactionUseCase = new InteractionUseCase(interactionRepository);

// Query keys
export const interactionKeys = {
  all: ['interactions'] as const,
  comments: (noteId: string) => [...interactionKeys.all, 'comments', noteId] as const,
  userVote: (noteId: string) => [...interactionKeys.all, 'userVote', noteId] as const,
};

// Queries
export const useComments = (noteId: string) => {
  return useInfiniteQuery({
    queryKey: interactionKeys.comments(noteId),
    queryFn: ({ pageParam }) => interactionUseCase.getCommentsForNote(noteId, pageParam),
    enabled: !!noteId,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.lastDoc : undefined,
  });
};

export const useUserVote = (noteId: string) => {
  return useQuery({
    queryKey: interactionKeys.userVote(noteId),
    queryFn: () => interactionUseCase.getUserVoteForNote(noteId),
    enabled: !!noteId,
    staleTime: 60000, // 1 minute
  });
};

// Mutations
export const useVoteOnNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ noteId, voteType }: { noteId: string; voteType: VoteType }) =>
      interactionUseCase.toggleVote(noteId, voteType),
    onMutate: async ({ noteId, voteType }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: interactionKeys.userVote(noteId) });
      await queryClient.cancelQueries({ queryKey: noteKeys.byId(noteId) });

      // Snapshot previous values
      const previousVote = queryClient.getQueryData(interactionKeys.userVote(noteId));
      const previousNote = queryClient.getQueryData(noteKeys.byId(noteId));

      // Optimistically update user vote
      const currentVote = previousVote as any;
      const willRemoveVote = currentVote?.type === voteType;
      
      queryClient.setQueryData(interactionKeys.userVote(noteId), 
        willRemoveVote ? null : { type: voteType, noteId }
      );

      // Optimistically update note vote counts
      queryClient.setQueryData(noteKeys.byId(noteId), (old: any) => {
        if (!old) return old;

        let upvotes = old.upvotes;
        let downvotes = old.downvotes;

        // Remove previous vote effect
        if (currentVote?.type === 'up') upvotes--;
        if (currentVote?.type === 'down') downvotes--;

        // Add new vote effect (if not removing)
        if (!willRemoveVote) {
          if (voteType === 'up') upvotes++;
          if (voteType === 'down') downvotes++;
        }

        return {
          ...old,
          upvotes,
          downvotes,
          hasUserVoted: willRemoveVote ? null : voteType,
        };
      });

      return { previousVote, previousNote };
    },
    onError: (_, { noteId }, context) => {
      // Revert optimistic updates
      if (context?.previousVote) {
        queryClient.setQueryData(interactionKeys.userVote(noteId), context.previousVote);
      }
      if (context?.previousNote) {
        queryClient.setQueryData(noteKeys.byId(noteId), context.previousNote);
      }
    },
    onSettled: (_, __, { noteId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: interactionKeys.userVote(noteId) });
      queryClient.invalidateQueries({ queryKey: noteKeys.byId(noteId) });
    },
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      interactionUseCase.addComment(noteId, content),
    onSuccess: (newComment, { noteId }) => {
      // Add comment to cache
      queryClient.setQueryData(
        interactionKeys.comments(noteId),
        (old: any) => {
          if (!old?.pages) return old;
          
          const firstPage = { ...old.pages[0] };
          firstPage.data = [newComment, ...firstPage.data];
          
          return {
            ...old,
            pages: [firstPage, ...old.pages.slice(1)],
          };
        }
      );

      // Update note comment count
      queryClient.setQueryData(noteKeys.byId(noteId), (old: any) => 
        old ? { ...old, commentsCount: old.commentsCount + 1 } : old
      );

      // Invalidate comments query to ensure freshness
      queryClient.invalidateQueries({ 
        queryKey: interactionKeys.comments(noteId) 
      });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ commentId, noteId }: { commentId: string; noteId: string }) =>
      interactionUseCase.deleteComment(commentId),
    onSuccess: (_, { commentId, noteId }) => {
      // Remove comment from cache
      queryClient.setQueryData(
        interactionKeys.comments(noteId),
        (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.filter((comment: any) => comment.id !== commentId),
            })),
          };
        }
      );

      // Update note comment count
      queryClient.setQueryData(noteKeys.byId(noteId), (old: any) => 
        old ? { ...old, commentsCount: Math.max(0, old.commentsCount - 1) } : old
      );
    },
  });
};