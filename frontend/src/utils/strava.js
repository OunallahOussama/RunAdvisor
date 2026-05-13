export function getStravaRedirectUri() {
  return process.env.REACT_APP_STRAVA_REDIRECT_URI || `${window.location.origin}/callback`;
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
  return (
    extractReadableMessage(error?.response?.data) ||
    extractReadableMessage(error?.message) ||
    'Please verify your Strava settings and try again.'
  );
}
