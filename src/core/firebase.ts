import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { config } from '../utils/config';

// Firebase configuration from centralized config
const firebaseConfig = config.firebase;

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with simple configuration
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

// Development logging
if (config.isDevelopment) {
  console.log('🔥 Firebase initialized successfully');
  console.log('🔧 Environment:', config.env);
  console.log('📋 Project ID:', firebaseConfig.projectId);
  console.log('✅ All Firebase services ready');
  
  // Disable Firebase Auth warnings in development
  if (auth.settings) {
    auth.settings.appVerificationDisabledForTesting = true;
  }
  
  // Warn if using fallback configuration
  if (firebaseConfig.apiKey === "demo-key-fallback") {
    console.warn('⚠️ Using fallback Firebase config - check your .env.local file');
  }
}

export default app;