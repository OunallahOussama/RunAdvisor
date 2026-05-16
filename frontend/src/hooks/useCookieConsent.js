import { useCallback, useEffect, useState } from 'react';

export const COOKIE_CONSENT_KEY = 'runadvisor.cookieConsent';
export const COOKIE_CONSENT_VERSION = '1';

function readConsent() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (parsed?.version === COOKIE_CONSENT_VERSION && parsed?.status === 'accepted') {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export function useCookieConsent() {
  const [consent, setConsent] = useState(readConsent);
  const [bannerOpen, setBannerOpen] = useState(() => !readConsent());

  useEffect(() => {
    setBannerOpen(!readConsent());
  }, []);

  const acceptCookies = useCallback(() => {
    const record = {
      status: 'accepted',
      version: COOKIE_CONSENT_VERSION,
      acceptedAt: new Date().toISOString()
    };

    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
    setConsent(record);
    setBannerOpen(false);
  }, []);

  return {
    consent,
    bannerOpen,
    acceptCookies,
    hasAccepted: Boolean(consent)
  };
}
