import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  CreateNote: { latitude?: number; longitude?: number };
  NoteDetail: { noteId: string };
};

export type MainTabParamList = {
  Map: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Map" component={MapScreenContainer} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { data: user, isLoading } = useCurrentUser();
  const { setUser } = useAppStore();

  React.useEffect(() => {
    setUser(user || null);
  }, [user, setUser]);

  if (isLoading) {
    return null; // Could show a loading screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerStyle: { 
            backgroundColor: '#2196F3' 
          },
          headerTintColor: '#fff',
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