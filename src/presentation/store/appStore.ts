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
  
  // Location state
  location: LocationState;
  isLocationEnabled: boolean;
  locationSource: 'gps' | 'network' | null;
  
  // UI state
  isMapReady: boolean;
  searchRadius: number;
  
  // Actions
  setUser: (user: User | null) => void;
  setLocation: (location: LocationState) => void;
  setLocationEnabled: (enabled: boolean) => void;
  setLocationSource: (source: 'gps' | 'network' | null) => void;
  setMapReady: (ready: boolean) => void;
  setSearchRadius: (radius: number) => void;
  clearUser: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  location: {
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
  },
  isLocationEnabled: false,
  locationSource: null,
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
        
        setLocation: (location) => 
          set({ location }, false, 'setLocation'),
        
        setLocationEnabled: (isLocationEnabled) => 
          set({ isLocationEnabled }, false, 'setLocationEnabled'),
        
        setLocationSource: (locationSource) => 
          set({ locationSource }, false, 'setLocationSource'),
        
        setMapReady: (isMapReady) => 
          set({ isMapReady }, false, 'setMapReady'),
        
        setSearchRadius: (searchRadius) => 
          set({ searchRadius }, false, 'setSearchRadius'),
        
        clearUser: () => 
          set({ user: null }, false, 'clearUser'),
        
        reset: () => 
          set(initialState, false, 'reset'),
      }),
      {
        name: 'locallens-store',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          user: state.user,
          searchRadius: state.searchRadius,
        }),
        skipHydration: false, // Enable hydration
      }
    ),
    {
      name: 'LocalLens Store',
    }
  )
);