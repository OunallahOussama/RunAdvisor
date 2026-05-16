const STRAVA_OAUTH_CODE_KEY = 'runadvisor.strava.oauth.code';
const STRAVA_OAUTH_REDIRECT_KEY = 'runadvisor.strava.oauth.redirectUri';

export function getStravaRedirectUri() {
  return process.env.REACT_APP_STRAVA_REDIRECT_URI || `${window.location.origin}/callback`;
}

/**
 * Persist Strava OAuth params as early as possible (before React routing / login redirects).
 */
export function captureStravaOAuthFromUrl() {
  if (typeof window === 'undefined' || window.location.pathname !== '/callback') {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (!code) {
    return;
  }

  sessionStorage.setItem(STRAVA_OAUTH_CODE_KEY, code);
  sessionStorage.setItem(STRAVA_OAUTH_REDIRECT_KEY, getStravaRedirectUri());
}

export function readStravaOAuthCode(search) {
  const params = new URLSearchParams(search || '');
  const fromUrl = params.get('code');

  if (fromUrl) {
    sessionStorage.setItem(STRAVA_OAUTH_CODE_KEY, fromUrl);
    sessionStorage.setItem(STRAVA_OAUTH_REDIRECT_KEY, getStravaRedirectUri());
    return fromUrl;
  }

  try {
    return sessionStorage.getItem(STRAVA_OAUTH_CODE_KEY);
  } catch {
    return null;
  }
}

export function readStravaOAuthRedirectUri() {
  try {
    return sessionStorage.getItem(STRAVA_OAUTH_REDIRECT_KEY) || getStravaRedirectUri();
  } catch {
    return getStravaRedirectUri();
  }
}

export function clearStravaOAuthSession() {
  try {
    sessionStorage.removeItem(STRAVA_OAUTH_CODE_KEY);
    sessionStorage.removeItem(STRAVA_OAUTH_REDIRECT_KEY);
  } catch {
    // ignore
  }
}

function formatProviderErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return '';
  }

  return errors
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return '';
      }

      return [entry.resource, entry.field, entry.code].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .join(', ');
}

export function extractReadableMessage(payload) {
  if (!payload) {
    return '';
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map(extractReadableMessage).filter(Boolean).join(', ');
  }

  if (typeof payload !== 'object') {
    return String(payload);
  }

  const providerErrors = formatProviderErrors(payload.errors);
  const nestedDetails =
    payload.details && payload.details !== payload
      ? extractReadableMessage(payload.details)
      : '';

  return [payload.message, payload.error, providerErrors, nestedDetails]
    .filter(Boolean)
    .join(' - ');
}

export function getStravaConnectionErrorMessage(error) {
  const message = error?.message || '';
  if (/missing refresh token/i.test(message)) {
    return 'Your sign-in session needs to be refreshed. Log out, sign in again, then retry Connect with Strava.';
  }

  return (
    extractReadableMessage(error?.response?.data) ||
    extractReadableMessage(message) ||
    'Please verify your Strava settings and try again.'
  );
}
