import {
  collection,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  writeBatch,
  increment,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { firestore, auth } from '../../core/firebase';
import { InteractionRepository } from '../../domain/repositories/InteractionRepository';
import { Vote, Comment, CreateVoteRequest, CreateCommentRequest } from '../../domain/entities/Interaction';
import { PaginatedResponse } from '../../domain/entities/Common';
import { FirebaseVoteDoc, FirebaseCommentDoc, Collections } from '../models/FirebaseModels';

export class FirebaseInteractionRepository implements InteractionRepository {
  async voteOnNote(request: CreateVoteRequest): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to vote');
      }

      const batch = writeBatch(firestore);
      
      // Check if user already voted
      const existingVote = await this.getUserVote(request.noteId);
      
      if (existingVote) {
        // Remove existing vote first
        await this.removeVote(request.noteId);
        
        // Don't create new vote if it's the same type
        if (existingVote.type === request.type) {
          return;
        }
      }

      // Create new vote
      const voteData: Omit<FirebaseVoteDoc, 'id'> = {
        userId: auth.currentUser.uid,
        noteId: request.noteId,
        type: request.type,
        createdAt: Timestamp.now(),
      };

      const voteRef = doc(collection(firestore, Collections.VOTES));
      batch.set(voteRef, { ...voteData, id: voteRef.id });

      // Update note vote counts
      const noteRef = doc(firestore, Collections.NOTES, request.noteId);
      const voteIncrement = request.type === 'up' ? { upvotes: increment(1) } : { downvotes: increment(1) };
      batch.update(noteRef, voteIncrement);

      // Update user vote count
      const userRef = doc(firestore, Collections.USERS, auth.currentUser.uid);
      batch.update(userRef, { votesCount: increment(1) });

      await batch.commit();
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

      const existingVote = await this.getUserVote(noteId);
      if (!existingVote) {
        return;
      }

      const batch = writeBatch(firestore);

      // Delete vote
      const voteRef = doc(firestore, Collections.VOTES, existingVote.id);
      batch.delete(voteRef);

      // Update note vote counts
      const noteRef = doc(firestore, Collections.NOTES, noteId);
      const voteDecrement = existingVote.type === 'up' 
        ? { upvotes: increment(-1) } 
        : { downvotes: increment(-1) };
      batch.update(noteRef, voteDecrement);

      // Update user vote count
      const userRef = doc(firestore, Collections.USERS, auth.currentUser.uid);
      batch.update(userRef, { votesCount: increment(-1) });

      await batch.commit();
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

      const batch = writeBatch(firestore);

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

      const commentRef = doc(collection(firestore, Collections.COMMENTS));
      batch.set(commentRef, { ...commentData, id: commentRef.id });

      // Update note comment count
      const noteRef = doc(firestore, Collections.NOTES, request.noteId);
      batch.update(noteRef, { commentsCount: increment(1) });

      await batch.commit();

      return this.mapFirebaseCommentToComment({
        ...commentData,
        id: commentRef.id,
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  async deleteComment(id: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to delete comment');
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

      const batch = writeBatch(firestore);

      // Delete comment
      batch.delete(commentRef);

      // Update note comment count
      const noteRef = doc(firestore, Collections.NOTES, commentData.noteId);
      batch.update(noteRef, { commentsCount: increment(-1) });

      await batch.commit();
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