import { initializeApp } from 'firebase/app';
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Development mode detection
const isDevelopment = __DEV__;

// Firebase configuration
const firebaseConfig = {
  // Use demo config for development to avoid API key errors
  apiKey: isDevelopment ? "demo-api-key-for-development" : "your-api-key",
  authDomain: "locallens-demo.firebaseapp.com",
  projectId: "locallens-demo", 
  storageBucket: "locallens-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth - simplified approach
export const auth = getAuth(app);

// Initialize Firestore
export const firestore = getFirestore(app);
export const storage = getStorage(app);

// Log Firebase status in development
if (isDevelopment) {
  console.log('🔥 Firebase initialized in development mode');
  console.log('📝 Note: Using placeholder Firebase config');
  console.log('🔧 To use real Firebase, update src/core/firebase.ts with your project config');
}

export default app;

// Initialize Firestore
export const firestore = getFirestore(app);
export const storage = getStorage(app);

// Development emulators (optional - uncomment if you want to use Firebase emulators)
if (isDevelopment && Platform.OS !== 'web') {
  // Uncomment these lines if you're running Firebase emulators locally
  // try {
  //   connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  //   connectFirestoreEmulator(firestore, 'localhost', 8080);
  // } catch (error) {
  //   console.log('Emulators not available, using live Firebase');
  // }
}

export default app;