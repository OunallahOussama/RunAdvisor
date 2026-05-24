import React from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useColorMode } from '../context/ThemeContext';

function ThemeToggleButton({ size = 'medium' }) {
  const { resolvedMode, toggleTheme } = useColorMode();
  const isDark = resolvedMode === 'dark';
  const Icon = isDark ? LightModeIcon : DarkModeIcon;
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        color="inherit"
        onClick={toggleTheme}
        size={size}
        data-testid="theme-toggle-button"
      >
        <Icon fontSize="small" data-testid={isDark ? 'theme-icon-light' : 'theme-icon-dark'} />
      </IconButton>
    </Tooltip>
  );
}

export default ThemeToggleButton;
