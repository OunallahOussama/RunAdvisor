import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Activities from './pages/Activities';
import ActivityDetail from './pages/ActivityDetail';
import Recommendations from './pages/Recommendations';
import TrainingReport from './pages/TrainingReport';
import StravaConnect from './pages/StravaConnect';
import StravaCallback from './pages/StravaCallback';
import TrainingProfile from './pages/TrainingProfile';
import AdminDashboard from './pages/AdminDashboard';
import About from './pages/legal/About';
import Cookies from './pages/legal/Cookies';
import Privacy from './pages/legal/Privacy';
import AppFooter from './components/AppFooter';
import CookieConsentBanner from './components/CookieConsentBanner';
import { OfflineIcon } from './components/icons';
import { useCookieConsent } from './hooks/useCookieConsent';
import {
  authApi,
  setAccessTokenGetter,
  setAccessTokenRefresher,
  setApiNotifier,
  usersApi
} from './services/api';
import { ApiNotificationProvider, useApiNotification } from './context/ApiNotificationContext';
import { RunAdvisorProfileProvider } from './context/RunAdvisorProfileContext';
import { AppShellProvider, useAppShell } from './context/AppShellContext';
import AppShell from './components/shell/AppShell';
import OnboardingStepper from './components/onboarding/OnboardingStepper';
import { usePwaInstallPrompt } from './hooks/usePwaInstallPrompt';
import TrainingSyncManager from './components/TrainingSyncManager';
import AuthInAppBrowserNotice from './components/AuthInAppBrowserNotice';
import { getGoogleAuthRestrictionMessage, isGoogleDisallowedUserAgentError, isRestrictedAuthBrowser } from './utils/authBrowser';
import { getAuth0LogoutReturnUrl } from './utils/auth0Urls';
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

function AuthenticatedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/recommendations" element={<Recommendations />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/activities/:id" element={<ActivityDetail />} />
      <Route path="/activities" element={<Activities />} />
      <Route path="/training-report" element={<TrainingReport />} />
      <Route path="/strava-connect" element={<StravaConnect />} />
      <Route path="/profile" element={<TrainingProfile />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/about" element={<About />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function UnauthenticatedRoutes() {
  return (
    <Routes>
      <Route path="/about" element={<About />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/callback" element={<StravaCallback />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

function AuthenticatedShell({ user, onLogout }) {
  const [consent, setConsent] = useState(null);
  const [onboardingNeeded, setOnboardingNeeded] = useState(false);
  const { openOnboarding, closeOnboarding, onboardingOpen } = useAppShell();
  const location = useLocation();

  const refreshSelf = useCallback(async () => {
    try {
      const res = await usersApi.getMe();
      const profile = res?.data?.profile || null;
      setConsent(res?.data?.consent || null);
      setOnboardingNeeded(!profile?.onboardingCompletedAt);
    } catch {
      /* ignore — user can still use the app */
    }
  }, []);

  useEffect(() => {
    refreshSelf();
  }, [refreshSelf]);

  useEffect(() => {
    if (onboardingNeeded) {
      openOnboarding();
    } else {
      closeOnboarding();
    }
  }, [onboardingNeeded, openOnboarding, closeOnboarding]);

  // Replay-tour: clear onboarding then re-open
  const handleReplayTour = useCallback(async () => {
    try {
      await usersApi.completeOnboarding({ reset: true });
    } catch {
      /* ignore — still try to open */
    }
    setOnboardingNeeded(true);
    openOnboarding();
  }, [openOnboarding]);

  const handleOnboardingComplete = async () => {
    closeOnboarding();
    setOnboardingNeeded(false);
    await refreshSelf();
  };

  const handleOnboardingSkip = async () => {
    closeOnboarding();
    setOnboardingNeeded(false);
  };

  // Don't render the legacy unauthenticated app frame inside the shell
  // for /login etc; AuthenticatedShell only mounts for logged-in routes.
  // The /callback Strava OAuth handler still works because StravaCallback
  // is rendered inside the shell when authenticated.
  return (
    <>
      <AppShell user={user} consent={consent} onLogout={onLogout} onReplayTour={handleReplayTour}>
        <Routes location={location}>
          <Route path="/callback" element={<StravaCallback />} />
          <Route path="/*" element={<AuthenticatedRoutes />} />
        </Routes>
      </AppShell>
      <OnboardingStepper
        open={onboardingOpen}
        user={user}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </>
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
  const authBrowserRestricted = isRestrictedAuthBrowser();
  const { showNotification } = useApiNotification();
  const [profileError, setProfileError] = useState('');
  const [profileSyncing, setProfileSyncing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);
  const syncedAuth0UserRef = useRef('');
  usePwaInstallPrompt();
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
        returnTo: getAuth0LogoutReturnUrl()
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
          {!isOnline ? (
            <Box sx={{ px: 2, pt: 1 }}>
              <Alert icon={<OfflineIcon size={20} />} severity="warning" sx={{ mb: 1 }}>
                Offline mode is active. RunAdvisor will use saved pages and your most recent cached training data when
                available.
              </Alert>
            </Box>
          ) : null}
          {profileError ? (
            <Box sx={{ px: 2, pt: 1 }}>
              <Alert severity="error" sx={{ mb: 1 }}>{profileError}</Alert>
            </Box>
          ) : null}
          {authError && !isGoogleDisallowedUserAgentError(authError) ? (
            <Box sx={{ px: 2, pt: 1 }}>
              <Alert severity="warning" sx={{ mb: 1 }}>Sign-in error: {authError}</Alert>
            </Box>
          ) : null}
          {(isGoogleDisallowedUserAgentError(authError) || authBrowserRestricted) && !isAuthenticated ? (
            <Container maxWidth="sm" sx={{ px: 2, pt: 1 }}>
              <AuthInAppBrowserNotice loginPath="/login" />
            </Container>
          ) : null}

          {isAuthenticated ? (
            <AuthenticatedShell user={user} onLogout={handleLogout} />
          ) : (
            <Container maxWidth="lg" sx={{ pt: 2, pb: 4, flex: 1 }}>
              <UnauthenticatedRoutes />
            </Container>
          )}
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
      <AppShellProvider>
        <AppContent />
      </AppShellProvider>
    </ApiNotificationProvider>
  );
}

export default App;
