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
  });

  it('opens a menu with system / light / dark options', () => {
    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('theme-toggle-button'));

    expect(screen.getByTestId('theme-option-system')).toBeInTheDocument();
    expect(screen.getByTestId('theme-option-light')).toBeInTheDocument();
    expect(screen.getByTestId('theme-option-dark')).toBeInTheDocument();
  });

  it('persists the user choice to localStorage and updates document data-theme', () => {
    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('theme-toggle-button'));
    fireEvent.click(screen.getByTestId('theme-option-dark'));

    expect(window.localStorage.getItem(THEME_PREFERENCE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    fireEvent.click(screen.getByTestId('theme-toggle-button'));
    fireEvent.click(screen.getByTestId('theme-option-light'));

    expect(window.localStorage.getItem(THEME_PREFERENCE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
