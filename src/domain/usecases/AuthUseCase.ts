import { UserRepository } from '../repositories/UserRepository';
import { User, CreateUserRequest } from '../entities/User';

export class AuthUseCase {
  constructor(private userRepository: UserRepository) {}

  async getCurrentUser(): Promise<User | null> {
    return await this.userRepository.getCurrentUser();
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    return await this.userRepository.signInWithEmail(email, password);
  }

  async signUpWithEmail(
    email: string, 
    password: string, 
    userData: CreateUserRequest
  ): Promise<User> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (!userData.username || userData.username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (!userData.displayName) {
      throw new Error('Display name is required');
    }

    return await this.userRepository.signUpWithEmail(email, password, userData);
  }

  async signInWithGoogle(): Promise<User> {
    return await this.userRepository.signInWithGoogle();
  }

  async signOut(): Promise<void> {
    await this.userRepository.signOut();
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
    // Validate updates
    if (updates.username && updates.username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (updates.email && !this.isValidEmail(updates.email)) {
      throw new Error('Invalid email format');
    }

    await this.userRepository.updateUser(userId, updates);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}