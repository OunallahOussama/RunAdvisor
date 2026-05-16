import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggleButton from './ThemeToggleButton';
import StravaStatusIndicator from './StravaStatusIndicator';
import {
  ActivityIcon,
  CoachIcon,
  DashboardIcon,
  InstallIcon,
  RunAdvisorMark,
  SyncIcon
} from './icons';

const navigationItems = [
  { icon: DashboardIcon, label: 'Dashboard', to: '/dashboard' },
  { icon: ActivityIcon, label: 'Activities', to: '/activities' },
  { icon: CoachIcon, label: 'Coach Review', to: '/recommendations' },
  { icon: SyncIcon, label: 'Strava', to: '/strava-connect' }
];

function Navbar({ onLogout, user, canInstall, onInstall }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useMuiTheme();
  const isSmUp = useMediaQuery(muiTheme.breakpoints.up('sm'));
  const displayName = user?.name || user?.email || 'Runner';

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const closeDrawer = () => setMobileOpen(false);

  const drawer = (
    <Box onClick={closeDrawer} sx={{ width: 280, pt: 1 }}>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="subtitle2" color="text.secondary" noWrap>
          {displayName}
        </Typography>
        <Box sx={{ mt: 1.5 }}>
          <StravaStatusIndicator compact />
        </Box>
      </Box>
      <Divider />
      <List>
        {navigationItems.map(({ icon: Icon, label, to }) => (
          <ListItemButton
            key={to}
            component={RouterLink}
            selected={location.pathname === to}
            to={to}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Icon size={20} />
            </ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
        {canInstall && (
          <ListItemButton
            onClick={() => {
              closeDrawer();
              onInstall();
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <InstallIcon size={20} />
            </ListItemIcon>
            <ListItemText primary="Install app" />
          </ListItemButton>
        )}
      </List>
      <Divider />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 1 }}>
        <ThemeToggleButton />
        <Button variant="contained" color="primary" onClick={handleLogout}>
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <AppBar color="inherit" elevation={0} position="sticky">
      <Toolbar sx={{ maxWidth: 1280, width: 1, mx: 'auto', gap: 2, flexWrap: 'wrap' }}>
        <Box
          component={RouterLink}
          to="/dashboard"
          onClick={closeDrawer}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            textDecoration: 'none',
            color: 'text.primary',
            mr: 'auto'
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
              border: 1,
              borderColor: 'divider'
            }}
          >
            <RunAdvisorMark size={22} />
          </Box>
          <Box>
            <Typography component="span" variant="h6" fontWeight={700}>
              RunAdvisor
            </Typography>
            {isSmUp && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Mobile coach
              </Typography>
            )}
          </Box>
        </Box>

        {!isSmUp && (
          <IconButton color="inherit" edge="end" aria-label="open menu" onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </IconButton>
        )}

        {isSmUp && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <StravaStatusIndicator />
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }} noWrap>
              {displayName}
            </Typography>
            {navigationItems.map(({ icon: Icon, label, to }) => {
              const active = location.pathname === to;
              return (
                <Button
                  key={to}
                  color={active ? 'primary' : 'inherit'}
                  component={RouterLink}
                  startIcon={<Icon size={18} />}
                  to={to}
                  variant={active ? 'contained' : 'text'}
                >
                  {label}
                </Button>
              );
            })}
            {canInstall && (
              <Button color="inherit" onClick={onInstall} startIcon={<InstallIcon size={18} />} variant="outlined">
                Install app
              </Button>
            )}
            <ThemeToggleButton />
            <Button color="primary" onClick={handleLogout} variant="contained">
              Logout
            </Button>
          </Box>
        )}
      </Toolbar>

      <Drawer anchor="right" onClose={closeDrawer} open={mobileOpen}>
        {drawer}
      </Drawer>
    </AppBar>
  );
}

export default Navbar;
