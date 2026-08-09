import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { lightColors, darkColors, ThemeColors, ThemeMode } from '../../utils/theme';

export const useTheme = (): { colors: ThemeColors; isDark: boolean; mode: ThemeMode } => {
  const { theme } = useSettingsStore();
  const systemScheme = useColorScheme();

  const isDark = theme === 'system'
    ? systemScheme === 'dark'
    : theme === 'dark';

  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
    mode: theme,
  };
};
