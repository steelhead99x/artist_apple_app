import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Theme } from './index';
import { useAppTheme } from './ThemeProvider';

export const makeStyles = <T extends StyleSheet.NamedStyles<T>>(creator: (theme: Theme) => T) => {
  return () => {
    const { theme } = useAppTheme();
    return useMemo(() => StyleSheet.create(creator(theme)), [theme]);
  };
};

