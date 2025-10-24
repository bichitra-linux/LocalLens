import { DUMMY_USERS, DUMMY_NOTES } from './devHelpers';
import { auth, firestore } from '../core/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

export class DevDataSeeder {
  static async seedDummyUsers(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Dev data seeding is disabled in production');
      return;
    }

    try {
      // Create dummy users in Firebase Auth
      for (const [key, dummyUser] of Object.entries(DUMMY_USERS)) {
        try {
          // Try to create the user
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            dummyUser.email, 
            dummyUser.password
          );
          
          // Add user data to Firestore
          await setDoc(doc(firestore, 'users', userCredential.user.uid), {
            ...dummyUser.userData,
            id: userCredential.user.uid, // Use Firebase UID as ID
            createdAt: new Date(),
            lastActiveAt: new Date(),
          });

          console.log(`✅ Created dummy user: ${dummyUser.userData.username}`);
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            console.log(`ℹ️ Dummy user already exists: ${dummyUser.userData.username}`);
          } else {
            console.error(`❌ Error creating dummy user ${key}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error seeding dummy users:', error);
    }
  }

  static async seedDummyNotes(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Dev data seeding is disabled in production');
      return;
    }

    try {
      // Add dummy notes to Firestore
      for (const note of DUMMY_NOTES) {
        try {
          await addDoc(collection(firestore, 'notes'), {
            ...note,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`✅ Created dummy note: ${note.content.substring(0, 30)}...`);
        } catch (error) {
          console.error('❌ Error creating dummy note:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error seeding dummy notes:', error);
    }
  }

  static async seedAllData(): Promise<void> {
    console.log('🌱 Starting data seeding for development...');
    await this.seedDummyUsers();
    await this.seedDummyNotes();
    console.log('🌱 Data seeding completed!');
  }

  static getDummyCredentials() {
    return Object.entries(DUMMY_USERS).map(([key, user]) => ({
      key,
      email: user.email,
      password: user.password,
      displayName: user.userData.displayName,
      username: user.userData.username,
    }));
  }
}

// Development helper function to manually seed data
export const seedDevData = () => {
  if (__DEV__) {
    DevDataSeeder.seedAllData().catch(console.error);
  }
};

// Log dummy credentials for easy access
export const logDummyCredentials = () => {
  if (__DEV__) {
    console.log('🔑 Dummy User Credentials for Development:');
    const credentials = DevDataSeeder.getDummyCredentials();
    credentials.forEach((cred, index) => {
      console.log(`${index + 1}. ${cred.displayName} (@${cred.username})`);
      console.log(`   Email: ${cred.email}`);
      console.log(`   Password: ${cred.password}`);
      console.log('');
    });
  }
};