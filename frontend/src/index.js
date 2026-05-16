import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { Auth0Provider } from '@auth0/auth0-react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import App from './App';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { RunAdvisorMark } from './components/icons';
import ThemeToggleButton from './components/ThemeToggleButton';
import { register } from './serviceWorkerRegistration';
import { captureStravaOAuthFromUrl } from './utils/strava';

captureStravaOAuthFromUrl();

const auth0Domain = process.env.REACT_APP_AUTH0_DOMAIN;
const auth0ClientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
const auth0Audience = process.env.REACT_APP_AUTH0_AUDIENCE;
const auth0CallbackUrl = process.env.REACT_APP_AUTH0_CALLBACK_URL || window.location.origin;
const missingAuth0Config = !auth0Domain || !auth0ClientId || !auth0Audience;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
    <ThemeProvider>
      {missingAuth0Config ? (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
            position: 'relative'
          }}
        >
          <Box sx={{ position: 'absolute', right: 16, top: 16 }}>
            <ThemeToggleButton compact />
          </Box>
          <Paper elevation={3} sx={{ maxWidth: 520, width: 1, p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box component="span" aria-hidden sx={{ display: 'inline-flex' }}>
                <RunAdvisorMark size={24} />
              </Box>
              <Typography variant="h4" component="h1" color="primary" fontWeight={700}>
                RunAdvisor
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              Sign-in is not configured for the frontend yet. Add{' '}
              <Typography component="code" variant="caption" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 1 }}>
                REACT_APP_AUTH0_DOMAIN
              </Typography>
              ,{' '}
              <Typography component="code" variant="caption" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 1 }}>
                REACT_APP_AUTH0_CLIENT_ID
              </Typography>
              , and{' '}
              <Typography component="code" variant="caption" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 1 }}>
                REACT_APP_AUTH0_AUDIENCE
              </Typography>{' '}
              to start the app.
            </Typography>
          </Paper>
        </Box>
      ) : (
        <Auth0Provider
          domain={auth0Domain}
          clientId={auth0ClientId}
          cacheLocation="localstorage"
          useRefreshTokens
          authorizationParams={{
            redirect_uri: auth0CallbackUrl,
            audience: auth0Audience,
            scope: 'openid profile email'
          }}
          onRedirectCallback={(appState) => {
            const returnTo = appState?.returnTo;
            if (returnTo && typeof returnTo === 'string' && returnTo.startsWith('/')) {
              window.history.replaceState({}, document.title, returnTo);
            }
          }}
        >
          <App />
        </Auth0Provider>
      )}
    </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

register();
