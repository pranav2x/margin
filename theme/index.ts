import { useColorScheme } from 'react-native';
import { lightColors, darkColors, type ColorPalette } from './colors';
import { usePreferencesStore } from '../state/preferences';

export * from './colors';
export * from './type';
export * from './space';
export * from './motion';
export * from './radius';
export * from './icon';

export function useTheme(): { colors: ColorPalette; isDark: boolean } {
  const scheme = useColorScheme();
  const pref = usePreferencesStore((s) => s.themePreference);
  const isDark =
    pref === 'dark' ? true : pref === 'light' ? false : scheme === 'dark';
  return { colors: isDark ? darkColors : lightColors, isDark };
}
