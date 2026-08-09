import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { OfflineAction, OfflineActionType, OfflineQueueStats } from '../domain/entities/OfflineAction';
import { firestore, auth } from '../core/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  Timestamp,
  increment,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { FirebaseNoteDoc, FirebaseVoteDoc, FirebaseReactionDoc, FirebaseCommentDoc, Collections } from '../data/models/FirebaseModels';
import { generateGeohash, generateGeohashPrefixes } from './geospatial';

const QUEUE_KEY = 'locallens_offline_queue';
const MAX_RETRIES = 5;

export class OfflineQueueService {
  private static instance: OfflineQueueService;
  private processing = false;
  private needsReprocess = false;
  private netInfoUnsubscribe: (() => void) | null = null;
  private appStateSubscription: { remove: () => void } | null = null;

  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  async enqueue(action: Omit<OfflineAction, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<string> {
    const queue = await this.getQueue();
    const id = `action_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const entry: OfflineAction = {
      ...action,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    queue.push(entry);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    // Try to process immediately
    this.processQueue();

    return id;
  }

  async getQueue(): Promise<OfflineAction[]> {
    try {
      const json = await AsyncStorage.getItem(QUEUE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue:', error);
      return [];
    }
  }

  async getStats(): Promise<OfflineQueueStats> {
    const queue = await this.getQueue();
    const pending = queue.filter(a => a.status === 'pending');
    const failed = queue.filter(a => a.status === 'failed');

    return {
      totalActions: queue.length,
      pendingActions: pending.length,
      failedActions: failed.length,
      oldestAction: queue.length > 0 ? queue[0].createdAt : undefined,
    };
  }

  async processQueue(): Promise<void> {
    if (this.processing) {
      this.needsReprocess = true;
      return;
    }

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    this.processing = true;
    this.needsReprocess = false;

    try {
      const queue = await this.getQueue();
      const pending = queue.filter(a => a.status === 'pending' || a.status === 'failed');

      for (const action of pending) {
        try {
          action.status = 'processing';

          await this.executeAction(action);

          // Remove from queue on success
          const index = queue.indexOf(action);
          if (index > -1) queue.splice(index, 1);
        } catch (error: any) {
          action.retryCount += 1;
          action.lastError = error.message;
          action.status = action.retryCount >= MAX_RETRIES ? 'failed' : 'pending';
        }
      }

      await this.saveQueue(queue);
    } finally {
      this.processing = false;

      // If new items were enqueued during processing, process again
      if (this.needsReprocess) {
        this.needsReprocess = false;
        this.processQueue();
      }
    }
  }

  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }

  async clearFailed(): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(a => a.status !== 'failed');
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  }

  setupAutoProcess(): void {
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        this.processQueue();
      }
    });

    this.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        this.processQueue();
      }
    });
  }

  destroy(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  private async saveQueue(queue: OfflineAction[]): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    switch (action.type) {
      case 'create_note':
        await this.executeCreateNote(action.payload, user.uid);
        break;
      case 'vote':
        await this.executeVote(action.payload, user.uid);
        break;
      case 'remove_vote':
        await this.executeRemoveVote(action.payload, user.uid);
        break;
      case 'add_reaction':
        await this.executeAddReaction(action.payload, user.uid);
        break;
      case 'remove_reaction':
        await this.executeRemoveReaction(action.payload, user.uid);
        break;
      case 'add_comment':
        await this.executeAddComment(action.payload, user.uid);
        break;
      case 'delete_comment':
        await this.executeDeleteComment(action.payload);
        break;
      case 'delete_note':
        await this.executeDeleteNote(action.payload);
        break;
      case 'update_profile':
        await this.executeUpdateProfile(action.payload, user.uid);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeCreateNote(payload: any, userId: string): Promise<void> {
    const geohash = generateGeohash(payload.location.latitude, payload.location.longitude);
    const geohashPrefixes = generateGeohashPrefixes(geohash);
    const expiresInDays = payload.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const noteData: Omit<FirebaseNoteDoc, 'id'> = {
      userId,
      username: payload.username || 'Anonymous',
      content: payload.content,
      latitude: payload.location.latitude,
      longitude: payload.location.longitude,
      geohash,
      geohashPrefixes,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
      upvotes: 0,
      downvotes: 0,
      commentsCount: 0,
      isActive: true,
      category: payload.category || 'general',
    };

    await addDoc(collection(firestore, Collections.NOTES), noteData);
  }

  private async executeVote(payload: any, userId: string): Promise<void> {
    const votesRef = collection(firestore, Collections.VOTES);
    const existingQuery = query(
      votesRef,
      where('userId', '==', userId),
      where('noteId', '==', payload.noteId),
      limit(1)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      const existingVote = existingSnapshot.docs[0];
      if (existingVote.data().type !== payload.voteType) {
        await updateDoc(existingVote.ref, { type: payload.voteType });
        const noteRef = doc(firestore, Collections.NOTES, payload.noteId);
        const oldType = existingVote.data().type;
        await updateDoc(noteRef, {
          [oldType === 'up' ? 'upvotes' : 'downvotes']: increment(-1),
          [payload.voteType === 'up' ? 'upvotes' : 'downvotes']: increment(1),
        });
      }
    } else {
      const voteData: Omit<FirebaseVoteDoc, 'id'> = {
        userId,
        noteId: payload.noteId,
        type: payload.voteType,
        createdAt: Timestamp.now(),
      };
      const voteRef = doc(collection(firestore, Collections.VOTES));
      await setDoc(voteRef, { ...voteData, id: voteRef.id });

      const noteRef = doc(firestore, Collections.NOTES, payload.noteId);
      await updateDoc(noteRef, payload.voteType === 'up' ? { upvotes: increment(1) } : { downvotes: increment(1) });
    }
  }

  private async executeRemoveVote(payload: any, userId: string): Promise<void> {
    // Find and delete the vote document
    const votesRef = collection(firestore, Collections.VOTES);
    const voteQuery = query(
      votesRef,
      where('userId', '==', userId),
      where('noteId', '==', payload.noteId),
      limit(1)
    );
    const voteSnapshot = await getDocs(voteQuery);

    if (!voteSnapshot.empty) {
      await deleteDoc(voteSnapshot.docs[0].ref);
    }

    // Decrement the vote count on the note
    const noteRef = doc(firestore, Collections.NOTES, payload.noteId);
    await updateDoc(noteRef, payload.voteType === 'up' ? { upvotes: increment(-1) } : { downvotes: increment(-1) });
  }

  private async executeAddReaction(payload: any, userId: string): Promise<void> {
    const reactionData: Omit<FirebaseReactionDoc, 'id'> = {
      noteId: payload.noteId,
      userId,
      emoji: payload.emoji,
      createdAt: Timestamp.now(),
    };

    await addDoc(collection(firestore, Collections.REACTIONS), reactionData);
  }

  private async executeRemoveReaction(payload: any, userId: string): Promise<void> {
    const reactionsRef = collection(firestore, Collections.REACTIONS);
    const q = query(
      reactionsRef,
      where('noteId', '==', payload.noteId),
      where('userId', '==', userId),
      where('emoji', '==', payload.emoji)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(firestore);
    snapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }

  private async executeAddComment(payload: any, userId: string): Promise<void> {
    const commentData: Omit<FirebaseCommentDoc, 'id'> = {
      noteId: payload.noteId,
      userId,
      username: payload.username || 'Anonymous',
      content: payload.content,
      createdAt: Timestamp.now(),
      upvotes: 0,
      downvotes: 0,
    };

    const commentRef = doc(collection(firestore, Collections.COMMENTS));
    await setDoc(commentRef, { ...commentData, id: commentRef.id });

    const noteRef = doc(firestore, Collections.NOTES, payload.noteId);
    await updateDoc(noteRef, { commentsCount: increment(1) });
  }

  private async executeDeleteComment(payload: any): Promise<void> {
    await deleteDoc(doc(firestore, Collections.COMMENTS, payload.commentId));

    if (payload.noteId) {
      const noteRef = doc(firestore, Collections.NOTES, payload.noteId);
      await updateDoc(noteRef, { commentsCount: increment(-1) });
    }
  }

  private async executeDeleteNote(payload: any): Promise<void> {
    const noteRef = doc(firestore, Collections.NOTES, payload.noteId);
    await updateDoc(noteRef, { isActive: false });
  }

  private async executeUpdateProfile(payload: any, userId: string): Promise<void> {
    const userRef = doc(firestore, Collections.USERS, userId);
    await updateDoc(userRef, payload.updates);
  }
}
