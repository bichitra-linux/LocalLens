import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  Timestamp,
  QueryDocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { firestore, auth } from '../../core/firebase';
import { NoteRepository } from '../../domain/repositories/NoteRepository';
import { Note, CreateNoteRequest, UpdateNoteRequest, Location } from '../../domain/entities/Note';
import { GeospatialQuery, PaginatedResponse } from '../../domain/entities/Common';
import { FirebaseNoteDoc, Collections, GEOHASH_PRECISION } from '../models/FirebaseModels';
import {
  generateGeohash,
  generateGeohashPrefixes,
  getNeighboringGeohashes,
  getPrecisionForRadius,
  calculateDistance
} from '../../utils/geospatial';
import { OfflineQueueService, isOnline } from '../../utils/offlineQueue';

const offlineQueue = OfflineQueueService.getInstance();

export class FirebaseNoteRepository implements NoteRepository {
  async getNotesByLocation(
    geoQuery: GeospatialQuery,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<PaginatedResponse<Note>> {
    try {
      const { latitude, longitude, radiusInKm } = geoQuery;
      const geohashesToQuery = getNeighboringGeohashes(latitude, longitude, getPrecisionForRadius(radiusInKm));

      const notesCollection = collection(firestore, Collections.NOTES);

      // Single bounding-box query using the min/max geohash across neighbors
      const minHash = geohashesToQuery.reduce((min, g) => g < min ? g : min, geohashesToQuery[0]);
      const maxHash = geohashesToQuery.reduce((max, g) => g > max ? g : max, geohashesToQuery[0]);

      let q = query(
        notesCollection,
        where('isActive', '==', true),
        where('expiresAt', '>', Timestamp.now()),
        where('geohash', '>=', minHash),
        where('geohash', '<=', maxHash + '~'),
        orderBy('geohash'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);

      const notes = snapshot.docs
        .map(doc => {
          const data = doc.data() as FirebaseNoteDoc;
          return { data, doc };
        })
        .filter(({ data }) => {
          const distance = calculateDistance(latitude, longitude, data.latitude, data.longitude);
          return distance <= radiusInKm;
        })
        .map(({ data }) => this.mapFirebaseNoteToNote(data));

      return {
        data: notes,
        hasMore: snapshot.docs.length === 20,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
      };
    } catch (error) {
      console.error('Error getting notes by location:', error);
      throw error;
    }
  }

  async getNoteById(id: string): Promise<Note | null> {
    try {
      const docRef = doc(firestore, Collections.NOTES, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return this.mapFirebaseNoteToNote(docSnap.data() as FirebaseNoteDoc);
    } catch (error) {
      console.error('Error getting note by id:', error);
      throw error;
    }
  }

  async getUserNotes(userId: string, lastDoc?: QueryDocumentSnapshot): Promise<PaginatedResponse<Note>> {
    try {
      const notesCollection = collection(firestore, Collections.NOTES);
      let q = query(
        notesCollection,
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const notes = snapshot.docs.map(doc =>
        this.mapFirebaseNoteToNote(doc.data() as FirebaseNoteDoc)
      );

      return {
        data: notes,
        hasMore: snapshot.docs.length === 20,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
      };
    } catch (error) {
      console.error('Error getting user notes:', error);
      throw error;
    }
  }

  async createNote(request: CreateNoteRequest): Promise<Note> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to create a note');
      }

      // Offline: queue the note for sync when connectivity returns
      if (!(await isOnline())) {
        const expiresInDays = request.expiresInDays || 7;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        await offlineQueue.enqueue({
          type: 'create_note',
          payload: {
            content: request.content,
            location: request.location,
            expiresInDays,
            category: request.category,
            username: auth.currentUser.displayName || 'Anonymous',
          },
        });

        return {
          id: `local_${Date.now()}`,
          userId: auth.currentUser.uid,
          username: auth.currentUser.displayName || 'Anonymous',
          userAvatar: auth.currentUser.photoURL ?? undefined,
          content: request.content,
          location: {
            latitude: request.location.latitude,
            longitude: request.location.longitude,
            geohash: generateGeohash(request.location.latitude, request.location.longitude),
          },
          createdAt: new Date(),
          expiresAt,
          upvotes: 0,
          downvotes: 0,
          commentsCount: 0,
          isActive: true,
          category: request.category,
          reactionCounts: {},
        };
      }

      const geohash = generateGeohash(request.location.latitude, request.location.longitude);
      const geohashPrefixes = generateGeohashPrefixes(geohash);

      const expiresInDays = request.expiresInDays || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const noteData: Omit<FirebaseNoteDoc, 'id'> = {
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        userAvatar: auth.currentUser.photoURL ?? undefined,
        content: request.content,
        latitude: request.location.latitude,
        longitude: request.location.longitude,
        geohash,
        geohashPrefixes,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
        upvotes: 0,
        downvotes: 0,
        commentsCount: 0,
        isActive: true,
        reactionCounts: {},
      };

      const docRef = await addDoc(collection(firestore, Collections.NOTES), noteData);

      return this.mapFirebaseNoteToNote({
        ...noteData,
        id: docRef.id,
      });
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  async updateNote(request: UpdateNoteRequest): Promise<void> {
    try {
      const docRef = doc(firestore, Collections.NOTES, request.id);
      const updateData: Partial<FirebaseNoteDoc> = {};

      if (request.content) {
        updateData.content = request.content;
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  async deleteNote(id: string): Promise<void> {
    try {
      if (!(await isOnline())) {
        await offlineQueue.enqueue({
          type: 'delete_note',
          payload: { noteId: id },
        });
        return;
      }

      const docRef = doc(firestore, Collections.NOTES, id);
      await updateDoc(docRef, { isActive: false });
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  listenToNotesInArea(
    geoQuery: GeospatialQuery,
    callback: (notes: Note[]) => void
  ): Unsubscribe {
    const { latitude, longitude, radiusInKm } = geoQuery;
    const geohashesToQuery = getNeighboringGeohashes(latitude, longitude, getPrecisionForRadius(radiusInKm));

    const notesCollection = collection(firestore, Collections.NOTES);

    // Bounding-box geohash range covering the search radius
    const minHash = geohashesToQuery.reduce((min, g) => g < min ? g : min, geohashesToQuery[0]);
    const maxHash = geohashesToQuery.reduce((max, g) => g > max ? g : max, geohashesToQuery[0]);

    const q = query(
      notesCollection,
      where('isActive', '==', true),
      where('expiresAt', '>', Timestamp.now()),
      where('geohash', '>=', minHash),
      where('geohash', '<=', maxHash + '~'),
      orderBy('geohash'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notes: Note[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data() as FirebaseNoteDoc;
        const distance = calculateDistance(
          latitude,
          longitude,
          data.latitude,
          data.longitude
        );

        if (distance <= radiusInKm) {
          notes.push(this.mapFirebaseNoteToNote(data));
        }
      });

      callback(notes);
    });
  }

  private mapFirebaseNoteToNote(firebaseNote: FirebaseNoteDoc): Note {
    return {
      id: firebaseNote.id,
      userId: firebaseNote.userId,
      username: firebaseNote.username,
      userAvatar: firebaseNote.userAvatar,
      content: firebaseNote.content,
      location: {
        latitude: firebaseNote.latitude,
        longitude: firebaseNote.longitude,
        geohash: firebaseNote.geohash,
      },
      createdAt: firebaseNote.createdAt.toDate(),
      expiresAt: firebaseNote.expiresAt.toDate(),
      upvotes: firebaseNote.upvotes,
      downvotes: firebaseNote.downvotes,
      commentsCount: firebaseNote.commentsCount,
      isActive: firebaseNote.isActive,
      reactionCounts: firebaseNote.reactionCounts,
    };
  }
}
