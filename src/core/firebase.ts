import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { config } from '../utils/config';

const firebaseConfig = config.firebase;

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);

if (config.emulators.useFirebaseEmulator) {
  try {
    const { connectAuthEmulator } = require('firebase/auth');
    const { connectFirestoreEmulator } = require('firebase/firestore');
    connectAuthEmulator(auth, `http://${config.emulators.authHost}:${config.emulators.authPort}`);
    connectFirestoreEmulator(firestore, config.emulators.firestoreHost, config.emulators.firestorePort);
  } catch (e) {
    console.warn('[Firebase] Emulator connection failed (may already be connected):', e);
  }
}

if (__DEV__) {
  console.log('Firebase initialized successfully');
  console.log('Environment:', config.env);
  console.log('Project ID:', firebaseConfig.projectId);

  if (firebaseConfig.apiKey === 'demo-key-fallback') {
    console.warn('Using fallback Firebase config - check your .env.local file');
  }
}

export default app;
