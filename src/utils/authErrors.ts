// Map Firebase auth error codes to friendly, user-safe messages.
// Raw codes leak account-existence oracles and look broken to users.
export const getAuthErrorMessage = (error: unknown): string => {
  const code = (error as any)?.code as string | undefined;
  const message = error instanceof Error ? error.message : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    default:
      return message || 'An unexpected error occurred';
  }
};
