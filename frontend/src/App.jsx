import React, { useEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Activities from './pages/Activities';
import ActivityDetail from './pages/ActivityDetail';
import Recommendations from './pages/Recommendations';
import StravaConnect from './pages/StravaConnect';
import StravaCallback from './pages/StravaCallback';
import TrainingProfile from './pages/TrainingProfile';
import AdminDashboard from './pages/AdminDashboard';
import About from './pages/legal/About';
import Cookies from './pages/legal/Cookies';
import Privacy from './pages/legal/Privacy';
import Navbar from './components/Navbar';
import AppFooter from './components/AppFooter';
import CookieConsentBanner from './components/CookieConsentBanner';
import { OfflineIcon } from './components/icons';
import { useCookieConsent } from './hooks/useCookieConsent';
import { authApi, setAccessTokenGetter, setAccessTokenRefresher, setApiNotifier } from './services/api';
import { ApiNotificationProvider, useApiNotification } from './context/ApiNotificationContext';
import { RunAdvisorProfileProvider } from './context/RunAdvisorProfileContext';
import { usePwaInstallPrompt } from './hooks/usePwaInstallPrompt';
import TrainingSyncManager from './components/TrainingSyncManager';
import SecureBrowserAuthNotice from './components/SecureBrowserAuthNotice';
import { useGoogleAuthLogin } from './hooks/useGoogleAuthLogin';
import { getGoogleAuthRestrictionMessage, isGoogleDisallowedUserAgentError } from './utils/authBrowser';
import './App.css';

function LoadingScreen({ message }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2
      }}
    >
      <Paper elevation={3} sx={{ maxWidth: 420, width: 1, py: 4, px: 3, textAlign: 'center' }}>
        <CircularProgress color="primary" sx={{ mb: 2 }} />
        <Typography variant="body1" fontWeight={600}>
          {message}
        </Typography>
      </Paper>
    </Box>
  );
}

function AppContent() {
  const {
    error,
    getAccessTokenSilently,
    isAuthenticated,
    isLoading,
    logout,
    user
  } = useAuth0();
  const { restricted: authBrowserRestricted, openSignInInSystemBrowser } = useGoogleAuthLogin();
  const { showNotification } = useApiNotification();
  const [profileError, setProfileError] = useState('');
  const [profileSyncing, setProfileSyncing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const syncedAuth0UserRef = useRef('');
  const { canInstall, promptToInstall } = usePwaInstallPrompt();
  const { bannerOpen, acceptCookies } = useCookieConsent();
  useEffect(() => {
    setApiNotifier(showNotification);

    return () => {
      setApiNotifier(null);
    };
  }, [showNotification]);

  useEffect(() => {
    setAccessTokenGetter(async () => {
      if (!isAuthenticated) {
        return null;
      }

      return getAccessTokenSilently();
    });

    setAccessTokenRefresher(async () => {
      if (!isAuthenticated) {
        return null;
      }

      return getAccessTokenSilently({ cacheMode: 'off' });
    });

    return () => {
      setAccessTokenGetter(null);
      setAccessTokenRefresher(null);
    };
  }, [getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorDescription = params.get('error_description');
    const errorCode = params.get('error');

    if (errorDescription || errorCode) {
      const rawError = errorDescription || errorCode;
      if (isGoogleDisallowedUserAgentError(rawError)) {
        setAuthError(getGoogleAuthRestrictionMessage());
        return;
      }

      setAuthError(rawError);
      return;
    }

    setAuthError('');
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;

    async function syncProfile() {
      if (!isAuthenticated || !user?.sub || syncedAuth0UserRef.current === user.sub) {
        return;
      }

      try {
        setProfileSyncing(true);
        setProfileError('');
        await authApi.syncProfile({
          email: user.email,
          name: user.name,
          picture: user.picture
        });

        if (isMounted) {
          syncedAuth0UserRef.current = user.sub;
        }
      } catch (err) {
        if (isMounted) {
          setProfileError(err.response?.data?.error || 'Failed to sync your profile.');
        }
      } finally {
        if (isMounted) {
          setProfileSyncing(false);
        }
      }
    }

    if (!isAuthenticated) {
      syncedAuth0UserRef.current = '';
      setProfileError('');
      setProfileSyncing(false);
    } else {
      syncProfile();
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (error?.message) {
      setAuthError(
        isGoogleDisallowedUserAgentError(error.message)
          ? getGoogleAuthRestrictionMessage()
          : error.message
      );
    }
  }, [error]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    syncedAuth0UserRef.current = '';
    setAccessTokenGetter(null);
    logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  };

  if (isLoading) {
    return <LoadingScreen message="Checking your Auth0 session..." />;
  }

  if (isAuthenticated && profileSyncing && !syncedAuth0UserRef.current) {
    return <LoadingScreen message="Preparing your RunAdvisor profile..." />;
  }

  return (
    <RunAdvisorProfileProvider enabled={isAuthenticated}>
      <Router>
        <Box className="App" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <TrainingSyncManager enabled={isAuthenticated} />
          {isAuthenticated && (
            <Navbar
              canInstall={canInstall}
              onInstall={promptToInstall}
              onLogout={handleLogout}
              user={user}
            />
          )}
          <Container maxWidth="lg" sx={{ pt: isAuthenticated ? 2 : 0, pb: 4, flex: 1 }}>
            <Stack spacing={2} sx={{ mb: 2 }}>
              {!isOnline && (
                <Alert icon={<OfflineIcon size={20} />} severity="warning">
                  Offline mode is active. RunAdvisor will use saved pages and your most recent cached training data when
                  available.
                </Alert>
              )}
              {profileError && <Alert severity="error">{profileError}</Alert>}
              {authError && (
                isGoogleDisallowedUserAgentError(authError) || authBrowserRestricted ? (
                  <SecureBrowserAuthNotice
                    onOpenInBrowser={openSignInInSystemBrowser}
                    severity="warning"
                  />
                ) : (
                  <Alert severity="warning">Sign-in error: {authError}</Alert>
                )
              )}
              {!authError && authBrowserRestricted && !isAuthenticated && (
                <SecureBrowserAuthNotice onOpenInBrowser={openSignInInSystemBrowser} />
              )}
            </Stack>
            <Routes>
              <Route path="/about" element={<About />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route
                path="/login"
                element={
                  isAuthenticated ? (
                    <Navigate to="/dashboard" />
                  ) : (
                    <Login />
                  )
                }
              />
              <Route
                path="/register"
                element={
                  isAuthenticated ? (
                    <Navigate to="/dashboard" />
                  ) : (
                    <Register />
                  )
                }
              />
              <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/activities/:id" element={isAuthenticated ? <ActivityDetail /> : <Navigate to="/login" />} />
              <Route path="/activities" element={isAuthenticated ? <Activities /> : <Navigate to="/login" />} />
              <Route path="/recommendations" element={isAuthenticated ? <Recommendations /> : <Navigate to="/login" />} />
              <Route path="/strava-connect" element={isAuthenticated ? <StravaConnect /> : <Navigate to="/login" />} />
              <Route path="/profile" element={isAuthenticated ? <TrainingProfile /> : <Navigate to="/login" />} />
              <Route path="/admin" element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/login" />} />
              <Route path="/callback" element={<StravaCallback />} />
              <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
            </Routes>
          </Container>
          <AppFooter />
          <CookieConsentBanner onAccept={acceptCookies} open={bannerOpen} />
        </Box>
      </Router>
    </RunAdvisorProfileProvider>
  );
}

function App() {
  return (
    <ApiNotificationProvider>
      <AppContent />
    </ApiNotificationProvider>
  );
}

export default App;
