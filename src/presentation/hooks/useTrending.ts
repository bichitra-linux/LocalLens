import { useInfiniteQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, startAfter, getDocs, Timestamp, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { firestore } from '../../core/firebase';
import { FirebaseNoteDoc, Collections } from '../../data/models/FirebaseModels';
import { Note } from '../../domain/entities/Note';
import { NoteCategory } from '../../domain/entities/Category';

const PAGE_SIZE = 20;

const mapFirebaseNoteToNote = (data: FirebaseNoteDoc): Note => ({
  id: data.id,
  userId: data.userId,
  username: data.username,
  userAvatar: data.userAvatar,
  content: data.content,
  location: { latitude: data.latitude, longitude: data.longitude, geohash: data.geohash },
  createdAt: data.createdAt.toDate(),
  expiresAt: data.expiresAt.toDate(),
  upvotes: data.upvotes,
  downvotes: data.downvotes,
  commentsCount: data.commentsCount,
  isActive: data.isActive,
  reactionCounts: data.reactionCounts,
  category: (data as any).category || 'general',
});

export const trendingKeys = {
  all: ['trending'] as const,
  list: (category?: NoteCategory) => [...trendingKeys.all, 'list', category ?? 'all'] as const,
};

export const useTrendingNotes = (category?: NoteCategory) => {
  return useInfiniteQuery({
    queryKey: trendingKeys.list(category),
    queryFn: async ({ pageParam }: { pageParam: QueryDocumentSnapshot<DocumentData> | undefined }) => {
      const notesRef = collection(firestore, Collections.NOTES);
      let q;

      const baseConstraints = [
        where('isActive', '==', true),
        where('expiresAt', '>', Timestamp.now()),
      ];

      if (category) {
        q = query(
          notesRef,
          ...baseConstraints,
          where('category', '==', category),
          orderBy('upvotes', 'desc'),
          limit(PAGE_SIZE),
          ...(pageParam ? [startAfter(pageParam)] : [])
        );
      } else {
        q = query(
          notesRef,
          ...baseConstraints,
          orderBy('upvotes', 'desc'),
          limit(PAGE_SIZE),
          ...(pageParam ? [startAfter(pageParam)] : [])
        );
      }

      const snapshot = await getDocs(q);
      const notes = snapshot.docs.map(doc => mapFirebaseNoteToNote(doc.data() as FirebaseNoteDoc));

      return {
        data: notes,
        hasMore: snapshot.docs.length === PAGE_SIZE,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
      };
    },
    initialPageParam: undefined as QueryDocumentSnapshot<DocumentData> | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.lastDoc : undefined,
    staleTime: 60000,
  });
};
