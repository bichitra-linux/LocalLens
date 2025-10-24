import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../../domain/entities/User';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
}

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticating: boolean;
  
  // Location state
  location: LocationState;
  isLocationEnabled: boolean;
  
  // UI state
  selectedNoteId: string | null;
  isMapReady: boolean;
  searchRadius: number;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticating: (isAuthenticating: boolean) => void;
  setLocation: (location: LocationState) => void;
  setLocationEnabled: (enabled: boolean) => void;
  setSelectedNote: (noteId: string | null) => void;
  setMapReady: (ready: boolean) => void;
  setSearchRadius: (radius: number) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  isAuthenticating: false,
  location: {
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
  },
  isLocationEnabled: false,
  selectedNoteId: null,
  isMapReady: false,
  searchRadius: 5, // 5km default
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        setUser: (user) => 
          set({ user }, false, 'setUser'),
        
        setAuthenticating: (isAuthenticating) => 
          set({ isAuthenticating }, false, 'setAuthenticating'),
        
        setLocation: (location) => 
          set({ location }, false, 'setLocation'),
        
        setLocationEnabled: (isLocationEnabled) => 
          set({ isLocationEnabled }, false, 'setLocationEnabled'),
        
        setSelectedNote: (selectedNoteId) => 
          set({ selectedNoteId }, false, 'setSelectedNote'),
        
        setMapReady: (isMapReady) => 
          set({ isMapReady }, false, 'setMapReady'),
        
        setSearchRadius: (searchRadius) => 
          set({ searchRadius }, false, 'setSearchRadius'),
        
        reset: () => 
          set(initialState, false, 'reset'),
      }),
      {
        name: 'locallens-store',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          user: state.user,
          searchRadius: state.searchRadius,
          isLocationEnabled: state.isLocationEnabled,
        }),
        skipHydration: false, // Enable hydration
      }
    ),
    {
      name: 'LocalLens Store',
    }
  )
);