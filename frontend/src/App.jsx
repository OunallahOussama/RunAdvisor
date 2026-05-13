import React, { useEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Activities from './pages/Activities';
import Recommendations from './pages/Recommendations';
import StravaConnect from './pages/StravaConnect';
import StravaCallback from './pages/StravaCallback';
import Navbar from './components/Navbar';
import { OfflineIcon } from './components/icons';
import { authApi, setAccessTokenGetter } from './services/api';
import { usePwaInstallPrompt } from './hooks/usePwaInstallPrompt';
import './App.css';

function LoadingScreen({ message }) {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-6">
      <div className="section-card max-w-md px-8 py-6 text-center">
        <p className="text-lg font-semibold text-[color:var(--text-primary)]">{message}</p>
      </div>
    </div>
  );
}

function App() {
  const {
    error,
    getAccessTokenSilently,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user
  } = useAuth0();
  const [profileError, setProfileError] = useState('');
  const [profileSyncing, setProfileSyncing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const syncedAuth0UserRef = useRef('');
  const { canInstall, promptToInstall } = usePwaInstallPrompt();

  useEffect(() => {
    setAccessTokenGetter(async () => {
      if (!isAuthenticated) {
        return null;
      }

      return getAccessTokenSilently();
    });

    return () => {
      setAccessTokenGetter(null);
    };
  }, [getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorDescription = params.get('error_description');
    const errorCode = params.get('error');

    if (errorDescription || errorCode) {
      setAuthError(errorDescription || errorCode);
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
      } catch (error) {
        if (isMounted) {
          setProfileError(error.response?.data?.error || 'Failed to sync your profile.');
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
      setAuthError(error.message);
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
    <Router>
      <div className="App app-shell">
        {isAuthenticated && (
          <Navbar
            canInstall={canInstall}
            onInstall={promptToInstall}
            onLogout={handleLogout}
            user={user}
          />
        )}
        {!isOnline && (
          <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
            <div className="page-banner page-banner-warning flex items-center gap-3">
              <OfflineIcon size={18} />
              <span>Offline mode is active. RunAdvisor will use saved pages and your most recent cached training data when available.</span>
            </div>
          </div>
        )}
        {profileError && (
          <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
            <div className="page-banner page-banner-danger text-sm">
              {profileError}
            </div>
          </div>
        )}
        {authError && (
          <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
            <div className="page-banner page-banner-warning text-sm">
              Sign-in error: {authError}
            </div>
          </div>
        )}
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Login
                  onGoogleLogin={() => loginWithRedirect()}
                />
              )
            }
          />
          <Route 
            path="/register" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Register
                  onGoogleSignup={() => loginWithRedirect()}
                />
              )
            }
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/activities" 
            element={isAuthenticated ? <Activities /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/recommendations" 
            element={isAuthenticated ? <Recommendations /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/strava-connect" 
            element={isAuthenticated ? <StravaConnect /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/callback" 
            element={isAuthenticated ? <StravaCallback /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
