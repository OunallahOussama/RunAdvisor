import { useCallback, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  getPublicLoginUrl,
  isRestrictedAuthBrowser,
  openAuthUrlExternally
} from '../utils/authBrowser';

const GOOGLE_CONNECTION = 'google-oauth2';

export function useGoogleAuthLogin({ signInPath = '/login' } = {}) {
  const { loginWithRedirect } = useAuth0();

  const restricted = useMemo(() => isRestrictedAuthBrowser(), []);
  const signInPageUrl = useMemo(() => getPublicLoginUrl(signInPath), [signInPath]);

  const openSignInInSystemBrowser = useCallback(() => {
    openAuthUrlExternally(signInPageUrl);
  }, [signInPageUrl]);

  const startGoogleLogin = useCallback(
    (options = {}) => {
      const returnTo =
        options.appState?.returnTo ?? `${window.location.pathname}${window.location.search}`;

      loginWithRedirect({
        ...options,
        appState: {
          returnTo,
          ...options.appState
        },
        authorizationParams: {
          connection: GOOGLE_CONNECTION,
          ...options.authorizationParams
        },
        openUrl(url) {
          if (isRestrictedAuthBrowser()) {
            openAuthUrlExternally(url);
            return;
          }

          window.location.assign(url);
        }
      });
    },
    [loginWithRedirect]
  );

  return {
    restricted,
    signInPageUrl,
    openSignInInSystemBrowser,
    startGoogleLogin
  };
}
