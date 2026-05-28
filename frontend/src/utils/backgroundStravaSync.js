const PERIODIC_SYNC_TAG = 'strava-activities-sync';
const MIN_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Ask the service worker to nudge open clients to run a Strava sync (PWA / mobile).
 */
export async function registerStravaPeriodicSync() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('periodicSync' in registration) {
      const tags = await registration.periodicSync.getTags();
      if (!tags.includes(PERIODIC_SYNC_TAG)) {
        await registration.periodicSync.register(PERIODIC_SYNC_TAG, {
          minInterval: MIN_INTERVAL_MS
        });
      }
      return true;
    }
  } catch {
    // Permission denied or unsupported — foreground sync still runs.
  }

  return false;
}

export async function unregisterStravaPeriodicSync() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('periodicSync' in registration) {
      await registration.periodicSync.unregister(PERIODIC_SYNC_TAG);
    }
  } catch {
    // ignore
  }
}

/**
 * Listen for background sync messages from the service worker.
 */
export function listenForBackgroundStravaSync(onSync) {
  if (!('serviceWorker' in navigator) || typeof onSync !== 'function') {
    return () => {};
  }

  const handler = (event) => {
    if (event?.data?.type === 'RUN_STRAVA_SYNC') {
      onSync({ source: event.data.source || 'service-worker' });
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') {
    return false;
  }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}
