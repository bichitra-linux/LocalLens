import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignInWithEmail, useSignUpWithEmail, useSignInWithGoogle } from '../hooks/useAuth';
import { DEV_MODE, DUMMY_USERS } from '../../utils/devHelpers';
import { DevAuthHelpers } from '../../utils/devAuthHelpers';

export const AuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  const signInMutation = useSignInWithEmail();
  const signUpMutation = useSignUpWithEmail();
  const googleSignInMutation = useSignInWithGoogle();

  const isLoading = signInMutation.isPending || signUpMutation.isPending || googleSignInMutation.isPending;

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      if (!username || !displayName) {
        Alert.alert('Error', 'Please enter username and display name');
        return;
      }

      try {
        await signUpMutation.mutateAsync({
          email,
          password,
          userData: {
            username,
            email,
            displayName,
          },
        });
      } catch (error: any) {
        Alert.alert('Sign Up Failed', error.message);
      }
    } else {
      try {
        await signInMutation.mutateAsync({ email, password });
      } catch (error: any) {
        Alert.alert('Sign In Failed', error.message);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await googleSignInMutation.mutateAsync();
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message);
    }
  };

  // Anonymous sign-in for quick testing
  const handleAnonymousLogin = async () => {
    try {
      console.log('👤 Attempting anonymous login...');
      await DevAuthHelpers.signInAnonymous();
      console.log('✅ Anonymous login successful!');
    } catch (error: any) {
      console.error('Anonymous login failed:', error);
      Alert.alert(
        'Anonymous Login Failed',
        'Could not sign in anonymously. Please try manual login.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDummyLogin = async (userKey: 'testUser1' | 'testUser2') => {
    try {
      // Use the new DevAuthHelpers for more reliable dummy login
      const dummyUsers = DevAuthHelpers.getDummyUsers();
      const userIndex = userKey === 'testUser1' ? 0 : 1;
      const selectedUser = dummyUsers[userIndex];
      
      if (selectedUser) {
        console.log('🎭 Attempting dummy login for:', selectedUser.name);
        await DevAuthHelpers.signInMockUser(selectedUser.email);
        console.log('✅ Dummy login successful!');
      } else {
        // Fallback to original method
        const dummyUser = DUMMY_USERS[userKey];
        setEmail(dummyUser.email);
        setPassword(dummyUser.password);
        
        await signInMutation.mutateAsync({
          email: dummyUser.email,
          password: dummyUser.password,
        });
      }
    } catch (error: any) {
      console.error('Dummy login failed:', error);
      Alert.alert(
        'Development Login',
        'Quick login failed. The development server might still be initializing dummy users. Try again in a moment or use manual login.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setDisplayName('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>LocalLens</Text>
            <Text style={styles.subtitle}>
              Discover and share moments in your neighborhood
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />

            {isSignUp && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!isLoading}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!isLoading}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Display Name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  editable={!isLoading}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleEmailAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.googleButtonText}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={toggleMode}
              disabled={isLoading}
            >
              <Text style={styles.linkText}>
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : 'Need an account? Sign Up'}
              </Text>
            </TouchableOpacity>

            {/* Development Dummy Users - Only show in dev mode */}
            {DEV_MODE && !isSignUp && (
              <View style={styles.devSection}>
                <Text style={styles.devTitle}>🚀 Quick Login (Dev Only)</Text>
                <TouchableOpacity
                  style={[styles.button, styles.devButton, { backgroundColor: '#FF6B6B' }]}
                  onPress={handleAnonymousLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.devButtonText}>
                    ⚡ Anonymous Login
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.devButton]}
                  onPress={() => handleDummyLogin('testUser1')}
                  disabled={isLoading}
                >
                  <Text style={styles.devButtonText}>
                    👩‍💻 Alice Developer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.devButton]}
                  onPress={() => handleDummyLogin('testUser2')}
                  disabled={isLoading}
                >
                  <Text style={styles.devButtonText}>
                    👨‍🔬 Bob Tester
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  linkButton: {
    alignItems: 'center',
    padding: 16,
  },
  linkText: {
    color: '#2196F3',
    fontSize: 16,
  },
  devSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  devTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  devButton: {
    backgroundColor: '#FF9800',
    marginBottom: 8,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});