import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import CheckIcon from '@mui/icons-material/Check';
import { useColorMode } from '../context/ThemeContext';

const MODE_OPTIONS = [
  { value: 'system', label: 'Match system', Icon: SettingsBrightnessIcon },
  { value: 'light', label: 'Light', Icon: LightModeIcon },
  { value: 'dark', label: 'Dark', Icon: DarkModeIcon }
];

function ThemeToggleButton({ size = 'medium' }) {
  const { mode, resolvedMode, setMode } = useColorMode();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const ActiveIcon = resolvedMode === 'dark' ? DarkModeIcon : LightModeIcon;

  const handleSelect = (value) => {
    setMode(value);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title="Theme">
        <IconButton
          aria-label="Open theme menu"
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : 'false'}
          aria-controls={open ? 'theme-menu' : undefined}
          color="inherit"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          size={size}
          data-testid="theme-toggle-button"
        >
          <ActiveIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { mt: 1, minWidth: 200, borderRadius: 3 } }}
      >
        {MODE_OPTIONS.map(({ value, label, Icon }) => {
          const selected = mode === value;
          return (
            <MenuItem
              key={value}
              onClick={() => handleSelect(value)}
              selected={selected}
              data-testid={`theme-option-${value}`}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={label} />
              {selected ? <CheckIcon fontSize="small" /> : null}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export default ThemeToggleButton;
