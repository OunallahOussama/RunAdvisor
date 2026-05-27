import { useCallback, useEffect, useRef } from 'react';
import { stravaApi } from '../services/api';
import { showTrainingNotification } from '../utils/notifications';

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

export function useTrainingSync({ enabled, stravaConnected, onSynced }) {
  const syncingRef = useRef(false);

  const runSync = useCallback(async ({ notify = false } = {}) => {
    if (!enabled || !stravaConnected || !window.navigator.onLine || syncingRef.current) {
      return null;
    }

    if (!shouldRunAutoSync() && notify === false) {
      return null;
    }

    syncingRef.current = true;

    try {
      const response = await stravaApi.syncRecentActivities(24);
      markAutoSync();
      const count = response.data?.synced ?? response.data?.count ?? 0;

      if (notify && count > 0) {
        await showTrainingNotification({
          title: 'RunAdvisor sync complete',
          body: `${count} recent activit${count === 1 ? 'y' : 'ies'} updated. Check your progress.`,
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
  }, [enabled, onSynced, stravaConnected]);

  useEffect(() => {
    if (!enabled || !stravaConnected) {
      return undefined;
    }

    runSync();

    const intervalId = window.setInterval(() => {
      runSync({ notify: true });
    }, SYNC_INTERVAL_MS);

    const handleOnline = () => runSync({ notify: false });
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, runSync, stravaConnected]);

  return { runSync };
}
