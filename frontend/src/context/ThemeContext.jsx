import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../theme/muiAppTheme';

const THEME_STORAGE_KEY = 'runadvisor-theme';
const ThemeContext = createContext(null);

function getStoredTheme() {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    const rootElement = document.documentElement;
    const themeColor = theme === 'light' ? '#fff7ed' : '#08111f';
    const themeMetaTag = document.querySelector('meta[name="theme-color"]');

    rootElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);

    if (themeMetaTag) {
      themeMetaTag.setAttribute('content', themeColor);
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');

    const handlePreferenceChange = (event) => {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

      if (storedTheme) {
        return;
      }

      setTheme(event.matches ? 'light' : 'dark');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handlePreferenceChange);

      return () => mediaQuery.removeEventListener('change', handlePreferenceChange);
    }

    mediaQuery.addListener(handlePreferenceChange);

    return () => mediaQuery.removeListener(handlePreferenceChange);
  }, []);

  const value = useMemo(() => ({
    isDarkTheme: theme === 'dark',
    theme,
    toggleTheme: () => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }), [theme]);

  const muiTheme = useMemo(() => createAppTheme(theme), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider.');
  }

  return context;
}
