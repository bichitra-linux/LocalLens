import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FirebaseReactionRepository } from '../../data/repositories/FirebaseReactionRepository';
import { ReactionUseCase } from '../../domain/usecases/ReactionUseCase';
import { ReactionEmoji } from '../../domain/entities/Reaction';

const reactionRepository = new FirebaseReactionRepository();
const reactionUseCase = new ReactionUseCase(reactionRepository);

export const reactionKeys = {
  all: ['reactions'] as const,
  byNote: (noteId: string) => [...reactionKeys.all, 'byNote', noteId] as const,
};

export function useReactions(noteId: string) {
  return useQuery({
    queryKey: reactionKeys.byNote(noteId),
    queryFn: () => reactionUseCase.getReactionsForNote(noteId),
    staleTime: 30_000,
  });
}

export function useUserReactions(noteId: string) {
  return useQuery({
    queryKey: [...reactionKeys.byNote(noteId), 'user'],
    queryFn: () => reactionUseCase.getUserReactions(noteId),
    staleTime: 60_000,
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, emoji }: { noteId: string; emoji: ReactionEmoji }) =>
      reactionUseCase.toggleReaction(noteId, emoji),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: reactionKeys.byNote(variables.noteId) });
    },
  });
}
