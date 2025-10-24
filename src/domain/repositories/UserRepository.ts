import { User, CreateUserRequest } from '../entities/User';

export interface UserRepository {
  getCurrentUser(): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(request: CreateUserRequest): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<void>;
  deleteUser(id: string): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<User>;
  signUpWithEmail(email: string, password: string, userData: CreateUserRequest): Promise<User>;
  signInWithGoogle(): Promise<User>;
  signOut(): Promise<void>;
}