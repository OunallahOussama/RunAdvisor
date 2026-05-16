const NOTIFICATION_PREF_KEY = 'runadvisor.notifications.enabled';

export function getNotificationPreference() {
  try {
    return window.localStorage.getItem(NOTIFICATION_PREF_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setNotificationPreference(enabled) {
  window.localStorage.setItem(NOTIFICATION_PREF_KEY, enabled ? 'true' : 'false');
}

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    setNotificationPreference(true);
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const result = await Notification.requestPermission();
  setNotificationPreference(result === 'granted');
  return result;
}

export async function showTrainingNotification({ title, body, tag }) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  if (!getNotificationPreference()) {
    return false;
  }

  const options = {
    body,
    tag: tag || 'runadvisor-training',
    icon: '/icon-192.svg',
    badge: '/favicon.svg',
    data: { url: '/dashboard' }
  };

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, options);
    return true;
  }

  // eslint-disable-next-line no-new
  new Notification(title, options);
  return true;
}
