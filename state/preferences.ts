import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

interface PrefsState {
  themePreference: ThemePreference;
  commentsEnabled: boolean;
  crossSchoolDmsEnabled: boolean;
  isMinor: boolean;
  setThemePreference: (p: ThemePreference) => void;
  setCommentsEnabled: (enabled: boolean) => void;
  setCrossSchoolDmsEnabled: (enabled: boolean) => void;
  setIsMinor: (isMinor: boolean) => void;
}

export const usePreferencesStore = create<PrefsState>((set) => ({
  themePreference: 'system',
  commentsEnabled: false,
  crossSchoolDmsEnabled: false,
  isMinor: true,
  setThemePreference: (themePreference) => set({ themePreference }),
  setCommentsEnabled: (commentsEnabled) => set({ commentsEnabled }),
  setCrossSchoolDmsEnabled: (crossSchoolDmsEnabled) => set({ crossSchoolDmsEnabled }),
  setIsMinor: (isMinor) => set({ isMinor }),
}));
