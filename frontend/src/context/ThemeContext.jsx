import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { getTheme, resolveColorMode } from '../theme';

/**
 * Single source of truth for theme preferences. Persists a user
 * preference of 'system' | 'light' | 'dark' under
 * `runadvisor.theme.mode` and resolves it against the current
 * `prefers-color-scheme` for `system`.
 */
const THEME_PREFERENCE_KEY = 'runadvisor.theme.mode';
const LEGACY_THEME_KEY = 'runadvisor-theme';

const ThemeContext = createContext(null);

const VALID_PREFERENCES = new Set(['system', 'light', 'dark']);

function getStoredPreference() {
  if (typeof window === 'undefined') {
    return 'system';
  }

  try {
    const stored = window.localStorage.getItem(THEME_PREFERENCE_KEY);
    if (VALID_PREFERENCES.has(stored)) {
      return stored;
    }

    // Migrate legacy hard-light/dark preference from earlier builds.
    const legacy = window.localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy === 'light' || legacy === 'dark') {
      window.localStorage.setItem(THEME_PREFERENCE_KEY, legacy);
      return legacy;
    }
  } catch {
    // ignore — fall through to system
  }

  return 'system';
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getStoredPreference);
  const [resolvedMode, setResolvedMode] = useState(() => resolveColorMode(preference));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    try {
      window.localStorage.setItem(THEME_PREFERENCE_KEY, preference);
    } catch {
      /* ignore */
    }

    const next = resolveColorMode(preference);
    setResolvedMode(next);

    const root = document.documentElement;
    root.dataset.theme = next;
    root.dataset.themePreference = preference;

    const themeMetaTag = document.querySelector('meta[name="theme-color"]');
    if (themeMetaTag) {
      themeMetaTag.setAttribute('content', next === 'dark' ? '#1a120c' : '#fef7f1');
    }
  }, [preference]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const handle = () => {
      if (preference === 'system') {
        setResolvedMode(media.matches ? 'dark' : 'light');
      }
    };

    if (media.addEventListener) {
      media.addEventListener('change', handle);
      return () => media.removeEventListener('change', handle);
    }

    media.addListener(handle);
    return () => media.removeListener(handle);
  }, [preference]);

  const setMode = useCallback((next) => {
    if (VALID_PREFERENCES.has(next)) {
      setPreference(next);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference((current) => {
      const currentResolved = current === 'system' ? resolveColorMode(current) : current;
      return currentResolved === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const value = useMemo(() => ({
    mode: preference,
    resolvedMode,
    isDarkTheme: resolvedMode === 'dark',
    setMode,
    toggleTheme,
    theme: resolvedMode
  }), [preference, resolvedMode, setMode, toggleTheme]);

  const muiTheme = useMemo(() => getTheme(resolvedMode), [resolvedMode]);

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

export const useColorMode = useTheme;
export { THEME_PREFERENCE_KEY };
