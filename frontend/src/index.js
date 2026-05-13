import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import { RunAdvisorMark } from './components/icons';
import ThemeToggleButton from './components/ThemeToggleButton';
import { register } from './serviceWorkerRegistration';

const auth0Domain = process.env.REACT_APP_AUTH0_DOMAIN;
const auth0ClientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
const auth0Audience = process.env.REACT_APP_AUTH0_AUDIENCE;
const auth0CallbackUrl = process.env.REACT_APP_AUTH0_CALLBACK_URL || window.location.origin;
const missingAuth0Config = !auth0Domain || !auth0ClientId || !auth0Audience;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      {missingAuth0Config ? (
        <div className="app-shell flex min-h-screen items-center justify-center px-6">
          <div className="absolute right-4 top-4">
            <ThemeToggleButton compact />
          </div>
          <div className="section-card max-w-lg">
            <div className="mb-5 flex items-center gap-3">
              <span className="brand-mark" aria-hidden="true">
                <RunAdvisorMark size={24} />
              </span>
              <h1 className="m-0 text-3xl font-bold" style={{ color: 'var(--accent)' }}>RunAdvisor</h1>
            </div>
            <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Sign-in is not configured for the frontend yet. Add
              {' '}
              <code>REACT_APP_AUTH0_DOMAIN</code>
              ,
              {' '}
              <code>REACT_APP_AUTH0_CLIENT_ID</code>
              , and
              {' '}
              <code>REACT_APP_AUTH0_AUDIENCE</code>
              {' '}
              to start the app.
            </p>
          </div>
        </div>
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
        >
          <App />
        </Auth0Provider>
      )}
    </ThemeProvider>
  </React.StrictMode>
);

register();
