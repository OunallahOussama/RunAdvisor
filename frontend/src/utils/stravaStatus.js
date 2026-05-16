/**
 * Derive Strava connection / sync labels for compact UI (navbar, chips).
 */
export function formatStravaLastSync(value) {
  if (!value) {
    return 'Never synced';
  }

  return new Date(value).toLocaleString();
}

export function formatStravaLastSyncRelative(value) {
  if (!value) {
    return 'Never synced';
  }

  const then = new Date(value).getTime();
  const diffMs = Date.now() - then;

  if (diffMs < 60_000) {
    return 'Just now';
  }

  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 48) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 14) {
    return `${days}d ago`;
  }

  return new Date(value).toLocaleDateString();
}

export function getStravaConnectionStatus(profile) {
  const connected = Boolean(profile?.stravaId);
  const expiresAt = profile?.stravaExpiresAt ? new Date(profile.stravaExpiresAt) : null;
  const tokenExpired = connected && expiresAt && expiresAt.getTime() <= Date.now();

  if (!connected) {
    return {
      connected: false,
      severity: 'warning',
      shortLabel: 'Not linked',
      detail: 'Connect Strava to sync your activities into RunAdvisor.',
      lastSyncAt: null,
      lastSyncRelative: null,
      tokenExpired: false
    };
  }

  if (tokenExpired) {
    return {
      connected: true,
      severity: 'error',
      shortLabel: 'Reconnect',
      detail: 'Your Strava session expired. Open Strava sync to reconnect.',
      lastSyncAt: profile?.stravaLastSyncAt || null,
      lastSyncRelative: formatStravaLastSyncRelative(profile?.stravaLastSyncAt),
      tokenExpired: true
    };
  }

  const lastSyncRelative = formatStravaLastSyncRelative(profile?.stravaLastSyncAt);

  return {
    connected: true,
    severity: profile?.stravaLastSyncAt ? 'success' : 'info',
    shortLabel: profile?.stravaLastSyncAt ? lastSyncRelative : 'No sync yet',
    detail: profile?.stravaLastSyncAt
      ? `Last synced ${formatStravaLastSync(profile.stravaLastSyncAt)}`
      : 'Strava is linked. Run a sync to import recent activities.',
    lastSyncAt: profile?.stravaLastSyncAt || null,
    lastSyncRelative,
    tokenExpired: false
  };
}
