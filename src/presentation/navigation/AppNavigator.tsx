import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../../utils/theme';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentUser } from '../hooks/useAuth';
import { useAppStore } from '../store/appStore';

// Screens
import { MapScreenContainer } from '../screens/MapScreenContainer';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { CreateNoteScreen } from '../screens/CreateNoteScreen';
import { NoteDetailScreen } from '../screens/NoteDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { BookmarksScreen } from '../screens/BookmarksScreen';
import { DraftsScreen } from '../screens/DraftsScreen';
import { TrendingScreen } from '../screens/TrendingScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { NavigationScreen } from '../screens/NavigationScreen';
import { OfflineMapsScreen } from '../screens/OfflineMapsScreen';
import { OfflineStatusScreen } from '../screens/OfflineStatusScreen';

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Auth: undefined;
  CreateNote: { latitude?: number; longitude?: number; draftId?: string };
  NoteDetail: { noteId: string };
  Settings: undefined;
  Bookmarks: undefined;
  Drafts: undefined;
  Achievements: undefined;
  OfflineMaps: undefined;
  OfflineStatus: undefined;
  Navigation: { destinationLat: number; destinationLng: number; destinationName?: string };
};

export type MainTabParamList = {
  Map: undefined;
  Trending: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Trending') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Map" component={MapScreenContainer}
        options={{ tabBarAccessibilityLabel: 'Map view' }} />
      <Tab.Screen name="Trending" component={TrendingScreen}
        options={{ tabBarAccessibilityLabel: 'Trending notes' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarAccessibilityLabel: 'Profile' }} />
    </Tab.Navigator>
  );
};

const createLoadingStyles = (colors: ThemeColors) => StyleSheet.create({
container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
  const loadingStyles = createLoadingStyles(colors);
  const { data: user, isLoading } = useCurrentUser();
  const { setUser } = useAppStore();
  const [authResolved, setAuthResolved] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      setUser(user || null);
      setAuthResolved(true);
    }
  }, [user, isLoading, setUser]);

  if (isLoading || !authResolved) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={loadingStyles.text}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary
          },
          headerTintColor: colors.surface,
          headerTitleStyle: {
            fontWeight: 'bold'
          },
        }}
      >
        {user ? (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateNote"
              component={CreateNoteScreen}
              options={{
                title: 'Create Note',
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="NoteDetail"
              component={NoteDetailScreen}
              options={{
                title: 'Note Details'
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen
              name="Bookmarks"
              component={BookmarksScreen}
              options={{ title: 'Bookmarks' }}
            />
            <Stack.Screen
              name="Drafts"
              component={DraftsScreen}
              options={{ title: 'Drafts' }}
            />
            <Stack.Screen
              name="Achievements"
              component={AchievementsScreen}
              options={{ title: 'Achievements' }}
            />
            <Stack.Screen
              name="OfflineMaps"
              component={OfflineMapsScreen}
              options={{ title: 'Offline Maps' }}
            />
            <Stack.Screen
              name="OfflineStatus"
              component={OfflineStatusScreen}
              options={{ title: 'Offline Status' }}
            />
            <Stack.Screen
              name="Navigation"
              component={NavigationScreen}
              options={{
                title: 'Navigation',
                headerShown: false,
              }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
