export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '🔥'] as const;
export type ReactionEmoji = typeof REACTION_EMOJIS[number];

export interface Reaction {
  id: string;
  noteId: string;
  userId: string;
  emoji: ReactionEmoji;
  createdAt: Date;
}

export interface CreateReactionRequest {
  noteId: string;
  emoji: ReactionEmoji;
}

export interface ReactionCount {
  emoji: ReactionEmoji;
  count: number;
  hasReacted: boolean;
}
