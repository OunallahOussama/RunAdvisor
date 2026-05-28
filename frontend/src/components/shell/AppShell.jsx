import React, { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import HomeIcon from '@mui/icons-material/Home';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import StravaStatusIndicator from '../StravaStatusIndicator';
import ThemeToggleButton from '../ThemeToggleButton';
import NotificationBell from './NotificationBell';
import MemberSearchButton from './MemberSearchButton';
import CoachChatWidget from '../coach/CoachChatWidget';
import { useAppShell } from '../../context/AppShellContext';
import { RunAdvisorMark } from '../icons';

const NAV_ITEMS = [
  { value: '/', label: 'Home', Icon: HomeIcon, match: (p) => p === '/' || p === '/recommendations' },
  { value: '/activities', label: 'Activities', Icon: DirectionsRunIcon, match: (p) => p.startsWith('/activities') },
  { value: '/community', label: 'Community', Icon: PeopleIcon, match: (p) => p.startsWith('/community') },
  { value: '/training-report', label: 'Stats', Icon: AssessmentIcon, match: (p) => p.startsWith('/training-report') },
  { value: '/profile', label: 'Profile', Icon: PersonIcon, match: (p) => p.startsWith('/profile') }
];

function activeNavIndex(pathname) {
  return NAV_ITEMS.findIndex((item) => item.match(pathname));
}

function getInitials(user) {
  const name = user?.name || user?.email || '';
  if (!name) return 'R';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function ProfileMenu({ user, onLogout, onReplayTour }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();
  const close = () => setAnchorEl(null);

  return (
    <>
      <IconButton
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-controls={open ? 'profile-menu' : undefined}
        aria-expanded={open ? 'true' : 'false'}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        color="inherit"
        size="small"
      >
        <Avatar
          src={user?.picture}
          alt={user?.name || ''}
          sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 14 }}
        >
          {getInitials(user)}
        </Avatar>
      </IconButton>
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { mt: 1, minWidth: 240, borderRadius: 3 } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" noWrap>{user?.name || 'Runner'}</Typography>
          {user?.email ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {user.email}
            </Typography>
          ) : null}
        </Box>
        <Divider />
        <MenuItem
          onClick={() => { close(); navigate('/profile'); }}
        >
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => { close(); navigate('/profile?tab=privacy'); }}
        >
          <ListItemIcon><ShieldOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Privacy &amp; notifications</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { close(); onReplayTour?.(); }}>
          <ListItemIcon><ReplayIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Replay tour</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { close(); onLogout?.(); }}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

function AppShell({ user, consent, onLogout, onReplayTour, children }) {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { title, primaryAction } = useAppShell();
  const navIndex = activeNavIndex(location.pathname);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Toolbar
          sx={{
            gap: 1,
            px: { xs: 1.5, md: 3 },
            minHeight: { xs: 52, md: 64 },
            pt: 'env(safe-area-inset-top, 0px)'
          }}
        >
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: { xs: 'inline-flex', md: 'inline-flex' },
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              color: 'inherit',
              flexShrink: 0
            }}
            aria-label="Go to home"
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText'
              }}
            >
              <RunAdvisorMark size={20} />
            </Box>
            {!isMobile ? (
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                RunAdvisor
              </Typography>
            ) : null}
          </Box>
          <Typography
            variant={isMobile ? 'subtitle1' : 'h6'}
            component="h1"
            sx={{
              flex: 1,
              fontWeight: 600,
              ml: isMobile ? 0.5 : 2,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: isMobile ? 'center' : 'left'
            }}
          >
            {title}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.25}>
            {!isMobile ? <StravaStatusIndicator compact /> : null}
            {user ? <MemberSearchButton /> : null}
            {!isMobile ? <ThemeToggleButton /> : null}
            <NotificationBell enabled={Boolean(user)} consent={consent} />
            <ProfileMenu user={user} onLogout={onLogout} onReplayTour={onReplayTour} />
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!isMobile ? (
          <Paper
            elevation={0}
            square
            sx={{
              width: 88,
              borderRight: 1,
              borderColor: 'divider',
              flexShrink: 0,
              position: 'sticky',
              top: 64,
              alignSelf: 'flex-start',
              maxHeight: 'calc(100vh - 64px)',
              py: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: 'background.surface'
            }}
          >
            {NAV_ITEMS.map(({ value, label, Icon, match }) => {
              const active = match(location.pathname);
              return (
                <Box
                  key={value}
                  component={RouterLink}
                  to={value}
                  sx={{
                    width: 64,
                    py: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    textDecoration: 'none',
                    color: active ? 'primary.main' : 'text.secondary',
                    borderRadius: 2,
                    '&:hover': { color: 'primary.main' }
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 32,
                      borderRadius: 999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: active ? 'action.selected' : 'transparent'
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: active ? 700 : 500 }}>
                    {label}
                  </Typography>
                </Box>
              );
            })}
          </Paper>
        ) : null}
        <Container
          maxWidth="lg"
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 1.5, md: 3 },
            pt: { xs: 1.5, md: 3 },
            pb: {
              xs: 'calc(72px + env(safe-area-inset-bottom, 0px))',
              md: 4
            }
          }}
        >
          {children}
        </Container>
      </Box>

      {isMobile && primaryAction ? (
        <Fab
          aria-label={primaryAction.label}
          onClick={primaryAction.onClick}
          color="primary"
          sx={{
            position: 'fixed',
            right: 16,
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            zIndex: (t) => t.zIndex.appBar
          }}
          data-testid="appshell-fab"
        >
          {primaryAction.icon || <MenuIcon />}
        </Fab>
      ) : null}

      {isMobile ? (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.appBar,
            borderRadius: '16px 16px 0 0',
            borderTop: 1,
            borderColor: 'divider',
            pb: 'env(safe-area-inset-bottom, 0px)',
            bgcolor: 'background.paper'
          }}
        >
          <BottomNavigation
            showLabels
            value={navIndex === -1 ? false : navIndex}
            onChange={(_, value) => {
              const target = NAV_ITEMS[value];
              if (target) navigate(target.value);
            }}
            sx={{
              height: 64,
              '& .MuiBottomNavigationAction-root': {
                minWidth: 0,
                py: 0.75,
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: 'primary.main'
                }
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.65rem',
                fontWeight: 500,
                '&.Mui-selected': {
                  fontSize: '0.65rem',
                  fontWeight: 700
                }
              }
            }}
          >
            {NAV_ITEMS.map(({ value, label, Icon }) => (
              <BottomNavigationAction
                key={value}
                label={label}
                icon={<Icon sx={{ fontSize: 22 }} />}
                value={NAV_ITEMS.findIndex((n) => n.value === value)}
              />
            ))}
          </BottomNavigation>
        </Paper>
      ) : null}

      <CoachChatWidget enabled={Boolean(user)} />
    </Box>
  );
}

export default AppShell;
