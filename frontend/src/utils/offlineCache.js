const CACHE_PREFIX = 'runadvisor-offline:';

export function saveSnapshot(key, data) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({
    data,
    savedAt: new Date().toISOString()
  }));
}

export function loadSnapshot(key) {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawSnapshot = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);

  if (!rawSnapshot) {
    return null;
  }

  try {
    return JSON.parse(rawSnapshot);
  } catch (error) {
    window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return null;
  }
}

export function formatSnapshotTimestamp(value) {
  if (!value) {
    return 'an earlier session';
  }

  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}
