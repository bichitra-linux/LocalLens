import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeColors = {
  background: string;
  surface: string;
  primary: string;
  primaryDark: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  card: string;
  shadow: string;
  overlay: string;
};

export const lightColors: ThemeColors = {
  background: '#f4f6f9',
  surface: '#fcfcfd',
  primary: '#2196F3',
  primaryDark: '#1976D2',
  text: '#1a1c20',
  textSecondary: '#4a5568',
  textTertiary: '#5a6577',
  border: '#d8dde6',
  error: '#e53935',
  success: '#2e7d32',
  warning: '#ef6c00',
  card: '#ffffff',
  shadow: '#0a0c10',
  overlay: 'rgba(10,12,16,0.5)',
};

export const darkColors: ThemeColors = {
  background: '#0f1117',
  surface: '#1a1d25',
  primary: '#64B5F6',
  primaryDark: '#42A5F5',
  text: '#e2e8f0',
  textSecondary: '#a0aec0',
  textTertiary: '#8a9ab0',
  border: '#2d3748',
  error: '#ef5350',
  success: '#66bb6a',
  warning: '#FFA726',
  card: '#1e222b',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
} as const;

export const getColors = (isDark: boolean): ThemeColors => {
  return isDark ? darkColors : lightColors;
};

export const getSystemTheme = (): 'light' | 'dark' => {
  return Appearance.getColorScheme() ?? 'light';
};
