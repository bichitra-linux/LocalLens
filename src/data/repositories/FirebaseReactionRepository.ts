import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { firestore, auth } from '../../core/firebase';
import { ReactionRepository } from '../../domain/repositories/ReactionRepository';
import {
  Reaction,
  CreateReactionRequest,
  ReactionCount,
  ReactionEmoji,
  REACTION_EMOJIS,
} from '../../domain/entities/Reaction';
import { Collections } from '../models/FirebaseModels';

export class FirebaseReactionRepository implements ReactionRepository {
  private collectionRef = collection(firestore, Collections.REACTIONS);

  async addReaction(request: CreateReactionRequest): Promise<Reaction> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const q = query(
      this.collectionRef,
      where('noteId', '==', request.noteId),
      where('userId', '==', user.uid),
      where('emoji', '==', request.emoji)
    );
    const existing = await getDocs(q);

    if (!existing.empty) {
      const existingDoc = existing.docs[0];
      return {
        id: existingDoc.id,
        noteId: existingDoc.data().noteId,
        userId: existingDoc.data().userId,
        emoji: existingDoc.data().emoji,
        createdAt: existingDoc.data().createdAt.toDate(),
      };
    }

    const docRef = await addDoc(this.collectionRef, {
      noteId: request.noteId,
      userId: user.uid,
      emoji: request.emoji,
      createdAt: Timestamp.now(),
    });

    return {
      id: docRef.id,
      noteId: request.noteId,
      userId: user.uid,
      emoji: request.emoji,
      createdAt: new Date(),
    };
  }

  async removeReaction(noteId: string, emoji: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const q = query(
      this.collectionRef,
      where('noteId', '==', noteId),
      where('userId', '==', user.uid),
      where('emoji', '==', emoji)
    );
    const snapshot = await getDocs(q);

    const batch = writeBatch(firestore);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }

  async getReactionsForNote(noteId: string): Promise<ReactionCount[]> {
    const user = auth.currentUser;

    const q = query(this.collectionRef, where('noteId', '==', noteId));
    const snapshot = await getDocs(q);

    const countMap = new Map<string, { count: number; hasReacted: boolean }>();

    snapshot.docs.forEach((docSnap) => {
      const emoji = docSnap.data().emoji as ReactionEmoji;
      const isCurrentUser = user ? docSnap.data().userId === user.uid : false;
      const existing = countMap.get(emoji);

      if (existing) {
        existing.count += 1;
        if (isCurrentUser) existing.hasReacted = true;
      } else {
        countMap.set(emoji, { count: 1, hasReacted: isCurrentUser });
      }
    });

    return REACTION_EMOJIS.map((emoji) => ({
      emoji,
      count: countMap.get(emoji)?.count ?? 0,
      hasReacted: countMap.get(emoji)?.hasReacted ?? false,
    }));
  }

  async getUserReactions(noteId: string): Promise<string[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const q = query(
      this.collectionRef,
      where('noteId', '==', noteId),
      where('userId', '==', user.uid)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => docSnap.data().emoji as string);
  }
}
