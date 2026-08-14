import {
  collection,
  doc,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  setDoc,
  runTransaction,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { firestore, auth } from '../../core/firebase';
import { InteractionRepository } from '../../domain/repositories/InteractionRepository';
import { Vote, Comment, CreateVoteRequest, CreateCommentRequest } from '../../domain/entities/Interaction';
import { PaginatedResponse } from '../../domain/entities/Common';
import { FirebaseVoteDoc, FirebaseCommentDoc, Collections } from '../models/FirebaseModels';
import { OfflineQueueService, isOnline } from '../../utils/offlineQueue';

const offlineQueue = OfflineQueueService.getInstance();

export class FirebaseInteractionRepository implements InteractionRepository {
  async voteOnNote(request: CreateVoteRequest): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to vote');
      }

      // Offline: queue the vote for sync when connectivity returns
      if (!(await isOnline())) {
        await offlineQueue.enqueue({
          type: 'vote',
          payload: { noteId: request.noteId, voteType: request.type },
        });
        return;
      }

      // ponytail: counter updates (upvotes/downvotes/votesCount) are handled
      // by Cloud Function triggers on the votes collection — see functions/index.js.
      await runTransaction(firestore, async (transaction) => {
        const votesCollection = collection(firestore, Collections.VOTES);
        const existingQuery = query(
          votesCollection,
          where('userId', '==', auth.currentUser!.uid),
          where('noteId', '==', request.noteId),
          limit(1)
        );

        const existingSnap = await getDocs(existingQuery);
        let existingVote: Vote | null = null;
        if (!existingSnap.empty) {
          existingVote = this.mapFirebaseVoteToVote(existingSnap.docs[0].data() as FirebaseVoteDoc);

          // Same type = toggle off
          if (existingVote.type === request.type) {
            transaction.delete(existingSnap.docs[0].ref);
            return;
          }

          // Type switch = replace vote doc
          transaction.delete(existingSnap.docs[0].ref);
        }

        const voteData: Omit<FirebaseVoteDoc, 'id'> = {
          userId: auth.currentUser!.uid,
          noteId: request.noteId,
          type: request.type,
          createdAt: Timestamp.now(),
        };

        const voteRef = doc(collection(firestore, Collections.VOTES));
        transaction.set(voteRef, { ...voteData, id: voteRef.id });
      });
    } catch (error) {
      console.error('Error voting on note:', error);
      throw error;
    }
  }

  async removeVote(noteId: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to remove vote');
      }

      if (!(await isOnline())) {
        await offlineQueue.enqueue({
          type: 'remove_vote',
          payload: { noteId },
        });
        return;
      }

      const existingVote = await this.getUserVote(noteId);
      if (!existingVote) {
        return;
      }

      // Counter decrement happens via the votes onDelete trigger
      await deleteDoc(doc(firestore, Collections.VOTES, existingVote.id));
    } catch (error) {
      console.error('Error removing vote:', error);
      throw error;
    }
  }

  async getUserVote(noteId: string): Promise<Vote | null> {
    try {
      if (!auth.currentUser) {
        return null;
      }

      const votesCollection = collection(firestore, Collections.VOTES);
      const q = query(
        votesCollection,
        where('userId', '==', auth.currentUser.uid),
        where('noteId', '==', noteId),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return this.mapFirebaseVoteToVote(doc.data() as FirebaseVoteDoc);
    } catch (error) {
      console.error('Error getting user vote:', error);
      throw error;
    }
  }

  async getComments(
    noteId: string, 
    lastDoc?: QueryDocumentSnapshot
  ): Promise<PaginatedResponse<Comment>> {
    try {
      const commentsCollection = collection(firestore, Collections.COMMENTS);
      let q = query(
        commentsCollection,
        where('noteId', '==', noteId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const comments = snapshot.docs.map(doc => 
        this.mapFirebaseCommentToComment(doc.data() as FirebaseCommentDoc)
      );

      return {
        data: comments,
        hasMore: snapshot.docs.length === 20,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
      };
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  async createComment(request: CreateCommentRequest): Promise<Comment> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to comment');
      }

      // Offline: queue the comment for sync
      if (!(await isOnline())) {
        const localComment: Comment = {
          id: `local_${Date.now()}`,
          noteId: request.noteId,
          userId: auth.currentUser.uid,
          username: auth.currentUser.displayName || 'Anonymous',
          userAvatar: auth.currentUser.photoURL || undefined,
          content: request.content,
          createdAt: new Date(),
          upvotes: 0,
          downvotes: 0,
        };
        await offlineQueue.enqueue({
          type: 'add_comment',
          payload: {
            noteId: request.noteId,
            content: request.content,
            username: localComment.username,
          },
        });
        return localComment;
      }

      const commentData: Omit<FirebaseCommentDoc, 'id'> = {
        noteId: request.noteId,
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        userAvatar: auth.currentUser.photoURL || undefined,
        content: request.content,
        createdAt: Timestamp.now(),
        upvotes: 0,
        downvotes: 0,
      };

      // commentsCount is incremented via the comments onCreate trigger
      const commentRef = doc(collection(firestore, Collections.COMMENTS));
      await setDoc(commentRef, { ...commentData, id: commentRef.id });

      return this.mapFirebaseCommentToComment({
        ...commentData,
        id: commentRef.id,
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  async getUserVotes(noteIds: string[]): Promise<Map<string, 'up' | 'down'>> {
    if (!auth.currentUser || noteIds.length === 0) return new Map();
    const votesCollection = collection(firestore, Collections.VOTES);
    const chunks: string[][] = [];
    for (let i = 0; i < noteIds.length; i += 30) {
      chunks.push(noteIds.slice(i, i + 30));
    }
    const result = new Map<string, 'up' | 'down'>();
    for (const chunk of chunks) {
      const q = query(
        votesCollection,
        where('userId', '==', auth.currentUser.uid),
        where('noteId', 'in', chunk)
      );
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        const data = doc.data() as FirebaseVoteDoc;
        result.set(data.noteId, data.type);
      });
    }
    return result;
  }

  async deleteComment(id: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to delete comment');
      }

      if (!(await isOnline())) {
        await offlineQueue.enqueue({
          type: 'delete_comment',
          payload: { commentId: id },
        });
        return;
      }

      // Get comment to check ownership and get noteId
      const commentRef = doc(firestore, Collections.COMMENTS, id);
      const commentSnap = await getDoc(commentRef);
      
      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }

      const commentData = commentSnap.data() as FirebaseCommentDoc;
      
      if (commentData.userId !== auth.currentUser.uid) {
        throw new Error('Not authorized to delete this comment');
      }

      // commentsCount is decremented via the comments onDelete trigger
      await deleteDoc(commentRef);
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  private mapFirebaseVoteToVote(firebaseVote: FirebaseVoteDoc): Vote {
    return {
      id: firebaseVote.id,
      userId: firebaseVote.userId,
      noteId: firebaseVote.noteId,
      type: firebaseVote.type,
      createdAt: firebaseVote.createdAt.toDate(),
    };
  }

  private mapFirebaseCommentToComment(firebaseComment: FirebaseCommentDoc): Comment {
    return {
      id: firebaseComment.id,
      noteId: firebaseComment.noteId,
      userId: firebaseComment.userId,
      username: firebaseComment.username,
      userAvatar: firebaseComment.userAvatar,
      content: firebaseComment.content,
      createdAt: firebaseComment.createdAt.toDate(),
      upvotes: firebaseComment.upvotes,
      downvotes: firebaseComment.downvotes,
    };
  }
}