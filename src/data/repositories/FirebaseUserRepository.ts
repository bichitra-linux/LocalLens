import {
  collection,
  doc,
  getDoc,
  setDoc,
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
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { auth, firestore } from '../../core/firebase';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { User, CreateUserRequest } from '../../domain/entities/User';
import { FirebaseUserDoc, Collections } from '../models/FirebaseModels';

export class FirebaseUserRepository implements UserRepository {
  private currentUser: User | null = null;

  constructor() {
    // Listen to auth state changes
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        this.currentUser = await this.getUserById(firebaseUser.uid);
      } else {
        this.currentUser = null;
      }
    });
  }

  async getCurrentUser(): Promise<User | null> {
    if (auth.currentUser && !this.currentUser) {
      this.currentUser = await this.getUserById(auth.currentUser.uid);
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
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }

      const userData: FirebaseUserDoc = {
        id: auth.currentUser.uid,
        username: request.username,
        email: request.email,
        displayName: request.displayName,
        avatarUrl: request.avatarUrl,
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
        notesCount: 0,
        votesCount: 0,
      };

      const docRef = doc(firestore, Collections.USERS, auth.currentUser.uid);
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
      
      // Convert User updates to FirebaseUserDoc format
      const updateData: Partial<FirebaseUserDoc> = {};
      
      if (updates.username) updateData.username = updates.username;
      if (updates.email) updateData.email = updates.email;
      if (updates.displayName) updateData.displayName = updates.displayName;
      if (updates.avatarUrl) updateData.avatarUrl = updates.avatarUrl;
      if (updates.notesCount !== undefined) updateData.notesCount = updates.notesCount;
      if (updates.votesCount !== undefined) updateData.votesCount = updates.votesCount;
      
      updateData.lastActiveAt = Timestamp.now();

      await updateDoc(docRef, updateData);
      
      // Update current user if it's the same user
      if (this.currentUser && this.currentUser.id === id) {
        this.currentUser = { ...this.currentUser, ...updates };
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, Collections.USERS, id));
      if (this.currentUser && this.currentUser.id === id) {
        this.currentUser = null;
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = await this.getUserById(userCredential.user.uid);
      
      if (!user) {
        throw new Error('User data not found');
      }

      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async signUpWithEmail(email: string, password: string, userData: CreateUserRequest): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await this.createUser({
        ...userData,
        email: userCredential.user.email || email,
      });

      const user = await this.getUserById(userCredential.user.uid);
      if (!user) {
        throw new Error('Failed to create user data');
      }

      return user;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  async signInWithGoogle(): Promise<User> {
    try {
      if (Platform.OS === 'web') {
        // Web implementation
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        let user = await this.getUserById(result.user.uid);
        
        // Create user if doesn't exist
        if (!user) {
          await this.createUser({
            username: result.user.displayName || 'User',
            email: result.user.email || '',
            displayName: result.user.displayName || 'User',
            avatarUrl: result.user.photoURL || undefined,
          });
          
          user = await this.getUserById(result.user.uid);
        }

        if (!user) {
          throw new Error('Failed to get or create user');
        }

        return user;
      } else {
        // React Native implementation - for now, show an error
        // In a real app, you'd use @react-native-google-signin/google-signin
        throw new Error('Google Sign In is not available on mobile in this demo. Please use email/password or the dummy users for testing.');
      }
    } catch (error) {
      console.error('Error with Google sign in:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  private mapFirebaseUserToUser(firebaseUser: FirebaseUserDoc): User {
    return {
      id: firebaseUser.id,
      username: firebaseUser.username,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      avatarUrl: firebaseUser.avatarUrl,
      createdAt: firebaseUser.createdAt.toDate(),
      lastActiveAt: firebaseUser.lastActiveAt.toDate(),
      notesCount: firebaseUser.notesCount,
      votesCount: firebaseUser.votesCount,
    };
  }
}