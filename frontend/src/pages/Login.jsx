import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import GoogleIcon from '@mui/icons-material/Google';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { CoachIcon, RunAdvisorMark, TargetIcon, TrendIcon } from '../components/icons';
import AuthLegalNotice from '../components/AuthLegalNotice';
import AuthInAppBrowserNotice from '../components/AuthInAppBrowserNotice';
import { useGoogleAuthLogin } from '../hooks/useGoogleAuthLogin';

function Login() {
  const { restricted, startGoogleLogin } = useGoogleAuthLogin({ signInPath: '/login' });

  const handleGoogleLogin = () => {
    startGoogleLogin({ appState: { returnTo: '/dashboard' } });
  };
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggleButton compact />
      </Box>
      <Paper elevation={4} sx={{ maxWidth: 480, width: 1, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3} alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ display: 'inline-flex' }} aria-hidden>
              <RunAdvisorMark size={28} />
            </Box>
            <Typography variant="h4" component="h1" color="primary" fontWeight={700}>
              RunAdvisor
            </Typography>
          </Stack>
          <Typography variant="h5" component="h2" fontWeight={600}>
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Continue with your Google account to access RunAdvisor.
          </Typography>
          {restricted && <AuthInAppBrowserNotice loginPath="/login" />}
          <List dense disablePadding sx={{ width: 1 }}>
            <ListItem sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mb: 1, bgcolor: 'action.hover' }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <TrendIcon size={18} />
              </ListItemIcon>
              <ListItemText primary="Trend-aware training review" />
            </ListItem>
            <ListItem sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mb: 1, bgcolor: 'action.hover' }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <TargetIcon size={18} />
              </ListItemIcon>
              <ListItemText primary="Race planning and pacing detail" />
            </ListItem>
            <ListItem sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CoachIcon size={18} />
              </ListItemIcon>
              <ListItemText primary="Install on your phone for quick access" />
            </ListItem>
          </List>
          <Button
            fullWidth
            size="large"
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
          >
            {restricted ? 'Open Google sign-in in browser' : 'Continue with Google'}
          </Button>
          <Divider sx={{ width: 1 }} />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Need an account?{' '}
            <Link component={RouterLink} to="/register" fontWeight={700}>
              Create one here
            </Link>
          </Typography>
          <AuthLegalNotice />
        </Stack>
      </Paper>
    </Box>
    </Box>
  );
}

export default Login;
