import { getStravaRedirectUri } from './strava';

/** Scopes required for sync (read) and manual activity upload (write). */
export const STRAVA_OAUTH_SCOPES = 'activity:read_all,activity:write';

export function buildStravaAuthorizeUrl(clientId) {
  if (!clientId) {
    return '';
  }

  const redirectUri = getStravaRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: STRAVA_OAUTH_SCOPES,
    approval_prompt: 'auto'
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}
