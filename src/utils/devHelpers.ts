// Development utilities for testing and debugging
import { User } from '../domain/entities/User';
import { config } from './config';

// Check development mode from centralized config
export const DEV_MODE = config.features.devModeEnabled;

export const DUMMY_USERS = {
  testUser1: {
    email: 'test@locallens.dev',
    password: 'testpass123',
    userData: {
      id: 'dummy-user-1',
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@locallens.dev',
      avatarUrl: undefined,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      notesCount: 2,
      votesCount: 15,
    } as User,
  },
  testUser2: {
    email: 'demo@locallens.dev',
    password: 'demopass123',
    userData: {
      id: 'dummy-user-2',
      username: 'demouser',
      displayName: 'Demo User',
      email: 'demo@locallens.dev',
      avatarUrl: undefined,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      notesCount: 1,
      votesCount: 8,
    } as User,
  },
};

export const DUMMY_NOTES = [
  {
    id: 'note-1',
    userId: 'dummy-user-1',
    username: 'testuser',
    content: '🗽 Amazing view of the Statue of Liberty from here! Perfect spot for photos.',
    location: {
      latitude: 40.6892,
      longitude: -74.0445,
    },
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    votes: {
      up: 15,
      down: 2,
    },
    hasUserVoted: null,
    isActive: true,
  },
  {
    id: 'note-2',
    userId: 'dummy-user-2',
    username: 'demouser',
    content: '🌉 Golden Gate Bridge looks incredible today! The fog cleared up just in time.',
    location: {
      latitude: 37.8199,
      longitude: -122.4783,
    },
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    votes: {
      up: 8,
      down: 0,
    },
    hasUserVoted: null,
    isActive: true,
  },
  {
    id: 'note-3',
    userId: 'dummy-user-1',
    username: 'testuser',
    content: '☕ Great coffee shop here! They have amazing pastries and the WiFi is fast.',
    location: {
      latitude: 40.7505,
      longitude: -73.9934,
    },
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    votes: {
      up: 12,
      down: 1,
    },
    hasUserVoted: 'up',
    isActive: true,
  },
];

// Mock authentication for development
export class DummyAuthService {
  private static currentUser: User | null = null;
  private static authListeners: ((user: User | null) => void)[] = [];

  static getCurrentUser(): User | null {
    return this.currentUser;
  }

  static async signIn(email: string, password: string): Promise<User> {
    const dummyUser = Object.values(DUMMY_USERS).find(
      user => user.email === email && user.password === password
    );

    if (!dummyUser) {
      throw new Error('Invalid email or password');
    }

    this.currentUser = dummyUser.userData;
    this.notifyListeners();
    
    return dummyUser.userData;
  }

  static async signOut(): Promise<void> {
    this.currentUser = null;
    this.notifyListeners();
  }

  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.authListeners.push(callback);
    
    // Immediately call with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(callback);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  private static notifyListeners() {
    this.authListeners.forEach(listener => listener(this.currentUser));
  }
}

// Development location service mock
export const DEV_LOCATION = {
  // New York City - Default location
  DEFAULT: {
    latitude: 40.7128,
    longitude: -74.0060,
  },
  // San Francisco
  SF: {
    latitude: 37.7749,
    longitude: -122.4194,
  },
  // London
  LONDON: {
    latitude: 51.5074,
    longitude: -0.1278,
  },
};

export const getRandomDevLocation = () => {
  const locations = Object.values(DEV_LOCATION);
  const randomIndex = Math.floor(Math.random() * locations.length);
  const baseLocation = locations[randomIndex];
  
  // Add small random offset to make it more realistic
  return {
    latitude: baseLocation.latitude + (Math.random() - 0.5) * 0.01,
    longitude: baseLocation.longitude + (Math.random() - 0.5) * 0.01,
  };
};