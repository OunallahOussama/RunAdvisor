import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { MoonIcon, SunIcon } from './icons';

function ThemeToggleButton({ className = '', compact = false }) {
  const { isDarkTheme, toggleTheme } = useTheme();
  const nextThemeLabel = isDarkTheme ? 'light' : 'dark';
  const Icon = isDarkTheme ? SunIcon : MoonIcon;

  return (
    <button
      aria-label={`Switch to ${nextThemeLabel} mode`}
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''} ${className}`.trim()}
      onClick={toggleTheme}
      title={`Switch to ${nextThemeLabel} mode`}
      type="button"
    >
      <Icon size={18} />
      <span>{isDarkTheme ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}

export default ThemeToggleButton;
