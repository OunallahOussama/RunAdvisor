import { useCallback, useEffect, useRef } from 'react';
import { stravaApi } from '../services/api';
import { showTrainingNotification } from '../utils/notifications';
import {
  listenForBackgroundStravaSync,
  registerStravaPeriodicSync,
  unregisterStravaPeriodicSync
} from '../utils/backgroundStravaSync';

const SYNC_INTERVAL_MS = 30 * 60 * 1000;
const LAST_SYNC_KEY = 'runadvisor.lastAutoSync';

function shouldRunAutoSync() {
  try {
    const last = Number(window.localStorage.getItem(LAST_SYNC_KEY) || 0);
    return Date.now() - last >= SYNC_INTERVAL_MS;
  } catch {
    return true;
  }
}

function markAutoSync() {
  window.localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
}

export function useTrainingSync({
  enabled,
  stravaConnected,
  backgroundSyncEnabled = true,
  onSynced
}) {
  const syncingRef = useRef(false);

  const runSync = useCallback(async ({ notify = false, force = false } = {}) => {
    if (!enabled || !stravaConnected || !backgroundSyncEnabled || !window.navigator.onLine || syncingRef.current) {
      return null;
    }

    if (!force && !shouldRunAutoSync() && notify === false) {
      return null;
    }

    syncingRef.current = true;

    try {
      const response = await stravaApi.syncRecentActivities(24);
      markAutoSync();
      const count = response.data?.synced ?? response.data?.count ?? 0;

      if (notify && count > 0) {
        await showTrainingNotification({
          title: 'Strava sync complete',
          body: `${count} recent activit${count === 1 ? 'y' : 'ies'} updated from Strava.`,
          tag: 'runadvisor-sync'
        });
      }

      onSynced?.(response.data);
      return response.data;
    } catch {
      return null;
    } finally {
      syncingRef.current = false;
    }
  }, [backgroundSyncEnabled, enabled, onSynced, stravaConnected]);

  useEffect(() => {
    if (!enabled || !stravaConnected || !backgroundSyncEnabled) {
      unregisterStravaPeriodicSync();
      return undefined;
    }

    runSync({ force: true });

    const intervalId = window.setInterval(() => {
      runSync({ notify: true });
    }, SYNC_INTERVAL_MS);

    const handleOnline = () => runSync({ notify: false, force: true });
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runSync({ notify: false });
      }
    };
    const handleFocus = () => runSync({ notify: false });

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    registerStravaPeriodicSync();
    const removeSwListener = listenForBackgroundStravaSync(() => {
      runSync({ notify: true, force: true });
    });

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      removeSwListener();
      unregisterStravaPeriodicSync();
    };
  }, [backgroundSyncEnabled, enabled, runSync, stravaConnected]);

  return { runSync };
}
