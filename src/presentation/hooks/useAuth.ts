import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { AuthUseCase } from '../../domain/usecases/AuthUseCase';
import { User, CreateUserRequest } from '../../domain/entities/User';

// Dependency injection - these would be provided by DI container
import { FirebaseUserRepository } from '../../data/repositories/FirebaseUserRepository';

const userRepository = new FirebaseUserRepository();
const authUseCase = new AuthUseCase(userRepository);

// Query keys
export const authKeys = {
  currentUser: ['auth', 'currentUser'] as const,
  user: (id: string) => ['auth', 'user', id] as const,
};

// Queries
export const useCurrentUser = () => {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: () => authUseCase.getCurrentUser(),
    staleTime: Infinity,
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: authKeys.user(id),
    queryFn: () => userRepository.getUserById(id),
    enabled: !!id,
  });
};

// Mutations
export const useSignInWithEmail = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authUseCase.signInWithEmail(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.currentUser, user);
    },
  });
};

export const useSignUpWithEmail = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      email, 
      password, 
      userData 
    }: { 
      email: string; 
      password: string; 
      userData: CreateUserRequest; 
    }) =>
      authUseCase.signUpWithEmail(email, password, userData),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.currentUser, user);
    },
  });
};

export const useSignInWithGoogle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => authUseCase.signInWithGoogle(),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.currentUser, user);
    },
  });
};

export const useSignOut = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => authUseCase.signOut(),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.currentUser, null);
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<User> }) =>
      authUseCase.updateProfile(userId, updates),
    onSuccess: (_, { userId, updates }) => {
      // Update current user cache
      queryClient.setQueryData(authKeys.currentUser, (old: User | null) => 
        old && old.id === userId ? { ...old, ...updates } : old
      );
      
      // Update specific user cache
      queryClient.setQueryData(authKeys.user(userId), (old: User | null) => 
        old ? { ...old, ...updates } : old
      );
    },
  });
};