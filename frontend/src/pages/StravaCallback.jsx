import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { stravaApi } from '../services/api';
import {
  captureStravaOAuthFromUrl,
  clearStravaOAuthSession,
  getStravaConnectionErrorMessage,
  getStravaRedirectUri,
  readStravaOAuthCode,
  readStravaOAuthRedirectUri
} from '../utils/strava';

/**
 * Strava OAuth codes are single-use. React 18 Strict Mode runs effects twice and may
 * remount the route while auth is in flight. A module-scoped promise per code ensures:
 * - only one token exchange runs
 * - every mount can attach to the same promise and update UI when it settles
 */
const stravaTokenExchangeByCode = new Map();

function getOrStartStravaTokenExchange(code, redirectUri) {
  const existing = stravaTokenExchangeByCode.get(code);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      await stravaApi.authenticate(code, redirectUri);
      return { ok: true };
    } catch (err) {
      console.error('Strava callback error:', err.response?.data || err.message || err);
      return { ok: false, err };
    } finally {
      stravaTokenExchangeByCode.delete(code);
    }
  })();

  stravaTokenExchangeByCode.set(code, promise);
  return promise;
}

function StravaCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const [status, setStatus] = useState('Connecting to Strava…');
  const [failed, setFailed] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    captureStravaOAuthFromUrl();
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      setFailed(true);
      setNeedsSignIn(false);
      setStatus(`Strava authorization failed: ${errorDescription || error}`);
      return undefined;
    }

    const code = readStravaOAuthCode(location.search);

    if (!code) {
      setFailed(true);
      setNeedsSignIn(false);
      const redirectUri = getStravaRedirectUri();
      setStatus(
        `No authorization code received from Strava. Confirm your Strava app Authorization Callback Domain matches this app (${redirectUri}), then use Connect with Strava again.`
      );
      return undefined;
    }

    if (authLoading) {
      setStatus('Checking your RunAdvisor session…');
      setFailed(false);
      setNeedsSignIn(false);
      return undefined;
    }

    if (!isAuthenticated) {
      setFailed(false);
      setNeedsSignIn(true);
      setStatus('Sign in to RunAdvisor to finish connecting your Strava account.');
      return undefined;
    }

    const stravaRedirectUri = readStravaOAuthRedirectUri();
    setStatus('Connecting your Strava account...');
    setFailed(false);
    setNeedsSignIn(false);

    const exchange = getOrStartStravaTokenExchange(code, stravaRedirectUri);

    exchange.then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        const detail = getStravaConnectionErrorMessage(result.err);
        setFailed(true);
        setNeedsSignIn(false);
        setStatus(`Failed to connect to Strava. ${detail}`);
        return;
      }

      clearStravaOAuthSession();
      setStatus('Strava connected. Syncing your recent activities in the background...');
      setTimeout(() => navigate('/strava-connect?sync=background'), 1200);
    });

    return () => {
      cancelled = true;
    };
  }, [location.search, navigate, isAuthenticated, authLoading]);

  const handleSignIn = () => {
    loginWithRedirect({
      appState: { returnTo: '/callback' }
    });
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
      <Card variant="outlined" sx={{ maxWidth: 480, width: 1 }}>
        <CardContent>
          <Stack spacing={2} alignItems="center" textAlign="center">
            {!failed && !needsSignIn && <CircularProgress size={32} />}
            <Typography variant="h5" component="h1" fontWeight={600}>
              Strava Callback
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {status}
            </Typography>
            {needsSignIn && (
              <Button variant="contained" onClick={handleSignIn}>
                Sign in to continue
              </Button>
            )}
            {failed && (
              <Stack direction="row" spacing={1}>
                <Button component={RouterLink} to="/strava-connect" variant="contained">
                  Back to Strava
                </Button>
                <Button component={RouterLink} to="/dashboard" variant="outlined">
                  Dashboard
                </Button>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default StravaCallback;
