/**
 * Canonical Auth0 redirect / logout URLs must match Auth0 Application settings exactly.
 */

function parseOrigin(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    return new URL(url.trim()).origin;
  } catch {
    return null;
  }
}

export function getAuth0ReturnToOrigin() {
  const configured =
    process.env.REACT_APP_AUTH0_LOGOUT_RETURN_URL ||
    process.env.REACT_APP_SITE_URL ||
    process.env.REACT_APP_AUTH0_CALLBACK_URL;

  const fromEnv = parseOrigin(configured);
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

/** URL passed to Auth0 logout `returnTo` (must be listed in Allowed Logout URLs). */
export function getAuth0LogoutReturnUrl() {
  const explicit = process.env.REACT_APP_AUTH0_LOGOUT_RETURN_URL;
  if (explicit && typeof explicit === 'string') {
    return explicit.trim();
  }

  return `${getAuth0ReturnToOrigin()}/login`;
}
