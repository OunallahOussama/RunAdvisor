import React from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '../context/ThemeContext';
import { MoonIcon, SunIcon } from './icons';

function ThemeToggleButton({ className = '', compact = false }) {
  const { isDarkTheme, toggleTheme } = useTheme();
  const nextThemeLabel = isDarkTheme ? 'light' : 'dark';
  const Icon = isDarkTheme ? SunIcon : MoonIcon;

  return (
    <Tooltip title={`Switch to ${nextThemeLabel} mode`}>
      <span className={className}>
        <IconButton
          aria-label={`Switch to ${nextThemeLabel} mode`}
          color="inherit"
          edge={compact ? false : 'end'}
          onClick={toggleTheme}
          size={compact ? 'medium' : 'large'}
        >
          <Icon size={20} />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default ThemeToggleButton;
