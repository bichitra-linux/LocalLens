import { AuthUseCase } from '../domain/usecases/AuthUseCase';
import { UserRepository } from '../domain/repositories/UserRepository';
import { User, CreateUserRequest } from '../domain/entities/User';

const mockUserRepository: jest.Mocked<UserRepository> = {
  getCurrentUser: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
};

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  createdAt: new Date(),
  lastActiveAt: new Date(),
  notesCount: 0,
  votesCount: 0,
  ...overrides,
});

describe('AuthUseCase', () => {
  let authUseCase: AuthUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    authUseCase = new AuthUseCase(mockUserRepository);
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const user = createMockUser();
      mockUserRepository.getCurrentUser.mockResolvedValue(user);

      const result = await authUseCase.getCurrentUser();

      expect(result).toEqual(user);
    });

    it('should return null when not authenticated', async () => {
      mockUserRepository.getCurrentUser.mockResolvedValue(null);

      const result = await authUseCase.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('signInWithEmail', () => {
    it('should sign in with valid credentials', async () => {
      const user = createMockUser();
      mockUserRepository.signInWithEmail.mockResolvedValue(user);

      const result = await authUseCase.signInWithEmail('test@example.com', 'password123');

      expect(result).toEqual(user);
      expect(mockUserRepository.signInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should reject empty email', async () => {
      await expect(
        authUseCase.signInWithEmail('', 'password123')
      ).rejects.toThrow('Email and password are required');
    });

    it('should reject empty password', async () => {
      await expect(
        authUseCase.signInWithEmail('test@example.com', '')
      ).rejects.toThrow('Email and password are required');
    });
  });

  describe('signUpWithEmail', () => {
    const validUserData: CreateUserRequest = {
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    it('should sign up with valid data', async () => {
      const user = createMockUser();
      mockUserRepository.signUpWithEmail.mockResolvedValue(user);

      const result = await authUseCase.signUpWithEmail('test@example.com', 'password123', validUserData);

      expect(result).toEqual(user);
    });

    it('should reject empty email', async () => {
      await expect(
        authUseCase.signUpWithEmail('', 'password123', validUserData)
      ).rejects.toThrow('Email and password are required');
    });

    it('should reject empty password', async () => {
      await expect(
        authUseCase.signUpWithEmail('test@example.com', '', validUserData)
      ).rejects.toThrow('Email and password are required');
    });

    it('should reject short username', async () => {
      await expect(
        authUseCase.signUpWithEmail('test@example.com', 'password123', {
          ...validUserData,
          username: 'ab',
        })
      ).rejects.toThrow('Username must be at least 3 characters long');
    });

    it('should reject empty display name', async () => {
      await expect(
        authUseCase.signUpWithEmail('test@example.com', 'password123', {
          ...validUserData,
          displayName: '',
        })
      ).rejects.toThrow('Display name is required');
    });

    it('should accept username at exactly 3 characters', async () => {
      const user = createMockUser({ username: 'abc' });
      mockUserRepository.signUpWithEmail.mockResolvedValue(user);

      const result = await authUseCase.signUpWithEmail('test@example.com', 'password123', {
        ...validUserData,
        username: 'abc',
      });

      expect(result).toEqual(user);
    });
  });

  describe('signInWithGoogle', () => {
    it('should delegate to repository', async () => {
      const user = createMockUser();
      mockUserRepository.signInWithGoogle.mockResolvedValue(user);

      const result = await authUseCase.signInWithGoogle();

      expect(result).toEqual(user);
    });
  });

  describe('signOut', () => {
    it('should delegate to repository', async () => {
      mockUserRepository.signOut.mockResolvedValue();

      await authUseCase.signOut();

      expect(mockUserRepository.signOut).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update with valid data', async () => {
      mockUserRepository.updateUser.mockResolvedValue();

      await authUseCase.updateProfile('user-1', { displayName: 'New Name' });

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-1', { displayName: 'New Name' });
    });

    it('should reject short username update', async () => {
      await expect(
        authUseCase.updateProfile('user-1', { username: 'ab' })
      ).rejects.toThrow('Username must be at least 3 characters long');
    });

    it('should reject invalid email update', async () => {
      await expect(
        authUseCase.updateProfile('user-1', { email: 'invalid' })
      ).rejects.toThrow('Invalid email format');
    });

    it('should accept valid email update', async () => {
      mockUserRepository.updateUser.mockResolvedValue();

      await authUseCase.updateProfile('user-1', { email: 'new@example.com' });

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-1', { email: 'new@example.com' });
    });
  });
});
