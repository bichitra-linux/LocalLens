import { auth } from '../core/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  User
} from 'firebase/auth';
import { config } from './config';

// Development authentication helpers
export const DevAuthHelpers = {
  // Create a mock user for development
  createMockUser: async (email: string, password: string = 'dev123456') => {
    try {
      console.log('🔧 Creating mock user for development:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      // If user already exists, try to sign in
      if (error.code === 'auth/email-already-in-use') {
        console.log('👤 User already exists, signing in instead');
        return DevAuthHelpers.signInMockUser(email, password);
      }
      throw error;
    }
  },

  // Sign in existing mock user
  signInMockUser: async (email: string, password: string = 'dev123456') => {
    try {
      console.log('🔑 Signing in mock user:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      console.error('Failed to sign in mock user:', error.message);
      throw error;
    }
  },

  // Sign in anonymously for quick testing
  signInAnonymous: async () => {
    try {
      console.log('👤 Signing in anonymously for development');
      const userCredential = await signInAnonymously(auth);
      return userCredential.user;
    } catch (error: any) {
      console.error('Failed to sign in anonymously:', error.message);
      throw error;
    }
  },

  // Quick dummy users for development
  getDummyUsers: () => [
    { email: 'alice@locallens.dev', name: 'Alice Developer', avatar: '👩‍💻' },
    { email: 'bob@locallens.dev', name: 'Bob Tester', avatar: '👨‍🔬' },
    { email: 'carol@locallens.dev', name: 'Carol Designer', avatar: '🎨' },
  ],

  // Initialize dummy users for development
  initializeDummyUsers: async () => {
    const users = DevAuthHelpers.getDummyUsers();
    console.log('🎭 Initializing dummy users for development...');
    
    for (const user of users) {
      try {
        await DevAuthHelpers.createMockUser(user.email);
        console.log(`✅ Dummy user ready: ${user.name} (${user.email})`);
      } catch (error) {
        console.log(`ℹ️ Dummy user exists: ${user.name} (${user.email})`);
      }
    }
  }
};

// Auto-initialize in development mode
if (config.features.dummyUsersEnabled) {
  // Initialize dummy users after a short delay
  setTimeout(() => {
    DevAuthHelpers.initializeDummyUsers().catch(console.error);
  }, 2000);
}