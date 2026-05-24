import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { ThemeProvider, THEME_PREFERENCE_KEY } from '../context/ThemeContext';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {}
    })
  });
});

describe('ThemeToggleButton', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  it('shows moon icon in light mode and sun icon in dark mode', () => {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, 'light');

    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-icon-dark')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('theme-toggle-button'));

    expect(screen.getByTestId('theme-icon-light')).toBeInTheDocument();
  });

  it('persists the toggled mode to localStorage and updates document data-theme', () => {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, 'light');

    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('theme-toggle-button'));

    expect(window.localStorage.getItem(THEME_PREFERENCE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    fireEvent.click(screen.getByTestId('theme-toggle-button'));

    expect(window.localStorage.getItem(THEME_PREFERENCE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('toggles from system-resolved dark to explicit light on first click', () => {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, 'system');
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {}
    }));

    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-icon-light')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('theme-toggle-button'));

    expect(window.localStorage.getItem(THEME_PREFERENCE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
