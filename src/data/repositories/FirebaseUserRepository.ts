import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  EmailAuthProvider,
  deleteUser as deleteFirebaseUser,
  updateProfile,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { auth, firestore } from '../../core/firebase';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { User, CreateUserRequest } from '../../domain/entities/User';
import { FirebaseUserDoc, Collections } from '../models/FirebaseModels';

export class FirebaseUserRepository implements UserRepository {
  private currentUser: User | null = null;
  private unsubscribeAuth: (() => void) | null = null;
  private authReadyResolve: (() => void) | null = null;
  private authReadyPromise: Promise<void>;

  constructor() {
    // Resolves on the first onAuthStateChanged emission so cold-start
    // getCurrentUser() calls wait for the session restore to finish.
    this.authReadyPromise = new Promise<void>((resolve) => {
      this.authReadyResolve = resolve;
    });

    this.unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      this.authReadyResolve?.();
      this.authReadyResolve = null;

      try {
        if (firebaseUser) {
          this.currentUser = await this.getUserById(firebaseUser.uid);
        } else {
          this.currentUser = null;
        }
      } catch (error) {
        console.error('[Auth] onAuthStateChanged error:', error);
        this.currentUser = null;
      }
    });
  }

  destroy() {
    this.unsubscribeAuth?.();
    this.unsubscribeAuth = null;
  }

  async getCurrentUser(): Promise<User | null> {
    await this.authReadyPromise;

    if (auth.currentUser) {
      this.currentUser = await this.getUserById(auth.currentUser.uid);
    } else {
      this.currentUser = null;
    }
    return this.currentUser;
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const docRef = doc(firestore, Collections.USERS, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return this.mapFirebaseUserToUser(docSnap.data() as FirebaseUserDoc);
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async createUser(request: CreateUserRequest): Promise<User> {
    try {
      const uid = request.id || auth.currentUser?.uid;
      if (!uid) {
        throw new Error('No authenticated user');
      }

      const userData: FirebaseUserDoc = {
        id: uid,
        username: request.username,
        email: request.email,
        displayName: request.displayName,
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
        notesCount: 0,
        votesCount: 0,
        ...(request.avatarUrl ? { avatarUrl: request.avatarUrl } : {}),
      } as FirebaseUserDoc;

      const docRef = doc(firestore, Collections.USERS, uid);
      await setDoc(docRef, userData);

      const user = this.mapFirebaseUserToUser(userData);
      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    try {
      const docRef = doc(firestore, Collections.USERS, id);

      const updateData: Partial<FirebaseUserDoc> = {};

      if (updates.username) updateData.username = updates.username;
      if (updates.displayName) updateData.displayName = updates.displayName;
      if (updates.avatarUrl !== undefined) updateData.avatarUrl = updates.avatarUrl;
      if (updates.notesCount !== undefined) updateData.notesCount = updates.notesCount;
      if (updates.votesCount !== undefined) updateData.votesCount = updates.votesCount;

      updateData.lastActiveAt = Timestamp.now();

      await updateDoc(docRef, updateData);

      // Keep Firebase Auth displayName in sync so new notes use the updated name
      if (updates.displayName && auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName: updates.displayName });
        } catch (error) {
          console.warn('[Auth] Failed to update Auth displayName:', error);
        }
      }

      if (this.currentUser && this.currentUser.id === id) {
        this.currentUser = { ...this.currentUser, ...updates };
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      let user = await this.getUserById(userCredential.user.uid);

      if (!user) {
        user = await this.createUser({
          id: userCredential.user.uid,
          email: userCredential.user.email || email,
          displayName: userCredential.user.displayName || email.split('@')[0],
          username: (userCredential.user.email || email).split('@')[0],
          avatarUrl: userCredential.user.photoURL || undefined,
        });
      }

      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async signUpWithEmail(email: string, password: string, userData: CreateUserRequest): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    try {
      const user = await this.createUser({
        id: userCredential.user.uid,
        email,
        displayName: userData.displayName,
        username: userData.username,
        avatarUrl: userCredential.user.photoURL || undefined,
      });
      return user;
    } catch (error) {
      await userCredential.user.delete();
      throw error;
    }
  }

  async signInWithGoogle(): Promise<User> {
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);

        let user = await this.getUserById(result.user.uid);

        if (!user) {
          await this.createUser({
            username: result.user.displayName || 'User',
            email: result.user.email || '',
            displayName: result.user.displayName || 'User',
            avatarUrl: result.user.photoURL || undefined,
          });

          user = await this.getUserById(result.user.uid);
        } else {
          user = await this.refreshGoogleProfile(user, result.user.displayName, result.user.photoURL);
        }

        if (!user) {
          throw new Error('Failed to get or create user');
        }

        return user;
      } else {
        try {
          const { GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin');

          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const googleUser = await GoogleSignin.signIn();
          const { idToken } = googleUser;

          const googleCredential = GoogleAuthProvider.credential(idToken);
          const userCredential = await signInWithCredential(auth, googleCredential);

          let user = await this.getUserById(userCredential.user.uid);

          if (!user) {
            await this.createUser({
              username: userCredential.user.displayName || 'User',
              email: userCredential.user.email || '',
              displayName: userCredential.user.displayName || 'User',
              avatarUrl: userCredential.user.photoURL || undefined,
            });

            user = await this.getUserById(userCredential.user.uid);
          } else {
            user = await this.refreshGoogleProfile(user, userCredential.user.displayName, userCredential.user.photoURL);
          }

          if (!user) {
            throw new Error('Failed to get or create user');
          }

          return user;
        } catch (googleError: any) {
          if (googleError.code === 'auth/operation-not-allowed') {
            throw new Error('Google Sign-In is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.');
          }
          if (googleError.message?.includes('RNGoogleSignin') || googleError.message?.includes('native module')) {
            throw new Error(
              'Google Sign-In requires native module setup.\n' +
              'Install: npx expo install @react-native-google-signin/google-signin\n' +
              'Then rebuild: npx expo prebuild && npx expo run:android/ios'
            );
          }
          throw googleError;
        }
      }
    } catch (error) {
      console.error('Error with Google sign in:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        try {
          const { GoogleSignin } = require('@react-native-google-signin/google-signin');
          await GoogleSignin.signOut();
        } catch (error) {
          console.warn('[Auth] Google Sign-In signOut failed (may not be signed in):', error);
        }
      }
      await signOut(auth);
      this.currentUser = null;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async deleteUser(userId: string, email: string, password: string): Promise<void> {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('No authenticated user');
      }

      // Re-authenticate user before deletion (Firebase security requirement).
      // Google accounts can't re-auth with email/password, so use the provider credential.
      const providerId = firebaseUser.providerData[0]?.providerId;
      if (providerId === 'google.com') {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const googleUser = await GoogleSignin.signIn({ forceConsentPrompt: true });
        const { idToken } = googleUser;
        if (!idToken) {
          throw new Error('Google re-authentication failed');
        }
        const credential = GoogleAuthProvider.credential(idToken);
        await reauthenticateWithCredential(firebaseUser, credential);
      } else {
        const credential = EmailAuthProvider.credential(email, password);
        await reauthenticateWithCredential(firebaseUser, credential);
      }

      // Delete user data from Firestore first
      await this.deleteUserData(userId);

      // Delete Firebase Auth account
      await deleteFirebaseUser(firebaseUser);

      // Clear local state
      this.currentUser = null;
    } catch (error: any) {
      console.error('Error deleting user:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('For security reasons, please sign in again before deleting your account');
      }
      if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password');
      }
      if (error.code === 'auth/user-not-found') {
        throw new Error('User not found');
      }
      
      throw new Error('Failed to delete account. Please try again.');
    }
  }

  private async deleteUserData(userId: string): Promise<void> {
    try {
      // Delete user document from Firestore
      await deleteDoc(doc(firestore, Collections.USERS, userId));

      // Delete user's notes (soft delete by marking as inactive)
      const userNotesQuery = query(
        collection(firestore, Collections.NOTES),
        where('userId', '==', userId)
      );
      const notesSnapshot = await getDocs(userNotesQuery);
      
      const deleteNotePromises = notesSnapshot.docs.map(doc => 
        updateDoc(doc.ref, { isActive: false })
      );
      await Promise.all(deleteNotePromises);

      // Delete user's comments
      const userCommentsQuery = query(
        collection(firestore, Collections.COMMENTS),
        where('userId', '==', userId)
      );
      const commentsSnapshot = await getDocs(userCommentsQuery);
      const deleteCommentPromises = commentsSnapshot.docs.map(doc =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deleteCommentPromises);

      // Delete user's votes (each as a batch)
      const userVotesQuery = query(
        collection(firestore, Collections.VOTES),
        where('userId', '==', userId)
      );
      const votesSnapshot = await getDocs(userVotesQuery);
      const deleteVotePromises = votesSnapshot.docs.map(doc =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deleteVotePromises);

      // Delete user's reactions
      const userReactionsQuery = query(
        collection(firestore, Collections.REACTIONS),
        where('userId', '==', userId)
      );
      const reactionsSnapshot = await getDocs(userReactionsQuery);
      const deleteReactionPromises = reactionsSnapshot.docs.map(doc =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deleteReactionPromises);

      console.log('[User Deletion] User data cleaned up successfully');
    } catch (error) {
      console.error('[User Deletion] Error cleaning up user data:', error);
      throw error;
    }
  }

  private async refreshGoogleProfile(
    user: User,
    displayName: string | null,
    photoURL: string | null
  ): Promise<User> {
    const updates: Partial<User> = {
      ...(displayName && displayName !== user.displayName ? { displayName } : {}),
      ...(photoURL && photoURL !== user.avatarUrl ? { avatarUrl: photoURL } : {}),
    };

    if (Object.keys(updates).length > 0) {
      await this.updateUser(user.id, updates);
      return { ...user, ...updates };
    }
    return user;
  }

  private mapFirebaseUserToUser(firebaseUser: FirebaseUserDoc): User {
    return {
      id: firebaseUser.id,
      username: firebaseUser.username,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      avatarUrl: firebaseUser.avatarUrl,
      createdAt: firebaseUser.createdAt?.toDate() ?? new Date(),
      lastActiveAt: firebaseUser.lastActiveAt?.toDate() ?? new Date(),
      notesCount: firebaseUser.notesCount,
      votesCount: firebaseUser.votesCount,
    };
  }
}
