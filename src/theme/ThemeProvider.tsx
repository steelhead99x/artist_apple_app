import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeMode, getTheme } from './index';

type ThemePreference = ThemeMode | 'system';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemePreference;
  resolvedMode: ThemeMode;
  setMode: (nextMode: ThemePreference) => Promise<void>;
}

const STORAGE_KEY = '@artist-space/theme-preference';

const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme('light'),
  mode: 'system',
  resolvedMode: 'light',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setMode: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ThemeMode>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      } catch {
        // ignore storage errors
      }
    };

    loadPreference();
  }, []);

  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }: { colorScheme: ColorSchemeName }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });

    return () => listener.remove();
  }, []);

  const resolvedMode: ThemeMode = mode === 'system' ? systemScheme : mode;
  const theme = useMemo(() => getTheme(resolvedMode), [resolvedMode]);

  const setMode = useCallback(async (nextMode: ThemePreference) => {
    setModeState(nextMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // ignore storage errors
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      mode,
      resolvedMode,
      setMode,
    }),
    [theme, mode, resolvedMode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => useContext(ThemeContext);

export default ThemeProvider;


