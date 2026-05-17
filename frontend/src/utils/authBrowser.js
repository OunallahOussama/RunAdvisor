/**
 * Google OAuth blocks embedded / in-app browsers (403 disallowed_useragent).
 * @see https://developers.google.com/identity/protocols/oauth2/policies#secure-browser
 */

const IN_APP_UA_PATTERNS = [
  /FBAN|FBAV|FB_IAB/i,
  /Instagram/i,
  /Twitter/i,
  /Line\//i,
  /MicroMessenger/i,
  /Snapchat/i,
  /LinkedInApp/i,
  /WhatsApp/i,
  /BytedanceWebview|TikTok/i,
  /; wv\)/i,
  /\bWebView\b/i,
  /Electron/i
];

export function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    window.navigator.standalone === true
  );
}

export function isRestrictedAuthBrowser(userAgent) {
  if (typeof navigator === 'undefined' && !userAgent) {
    return false;
  }

  const ua = userAgent ?? navigator.userAgent ?? '';

  if (IN_APP_UA_PATTERNS.some((pattern) => pattern.test(ua))) {
    return true;
  }

  // iOS home-screen PWAs use WKWebView for OAuth redirects.
  if (!userAgent && isStandaloneDisplayMode() && /iPhone|iPad|iPod/i.test(ua)) {
    return true;
  }

  // Android installed PWAs often use a WebView Google rejects.
  if (!userAgent && isStandaloneDisplayMode() && /Android/i.test(ua)) {
    return true;
  }

  return false;
}

export const isGoogleOAuthRestrictedBrowser = isRestrictedAuthBrowser;

export function isGoogleDisallowedUserAgentError(message = '') {
  const text = String(message || '').toLowerCase();
  return text.includes('disallowed_useragent') || text.includes('use secure browsers');
}

export function getPreferredBrowserName() {
  if (typeof navigator === 'undefined') {
    return 'your browser';
  }

  const ua = navigator.userAgent || '';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'Safari';
  }

  if (/Android/i.test(ua)) {
    return 'Chrome';
  }

  return 'Chrome, Safari, or Firefox';
}

export function getRestrictedAuthBrowserMessage() {
  if (typeof navigator === 'undefined') {
    return 'Open RunAdvisor in Chrome, Safari, or Firefox — not inside another app’s built-in browser.';
  }

  const ua = navigator.userAgent || '';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'Google sign-in must be completed in Safari. Open RunAdvisor there, then try again.';
  }

  if (/Android/i.test(ua)) {
    return 'Google sign-in must be completed in Chrome. Open RunAdvisor there, then try again.';
  }

  return 'Open RunAdvisor in Chrome, Safari, or Firefox — not inside another app’s built-in browser.';
}

export const getGoogleAuthRestrictionMessage = getRestrictedAuthBrowserMessage;

export function getPublicLoginUrl(path = '/login') {
  if (typeof window === 'undefined') {
    return path.startsWith('/') ? path : `/${path}`;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalizedPath}`;
}

export const getSignInPageUrl = getPublicLoginUrl;

/**
 * Try to leave an in-app / WebView context before hitting Google OAuth.
 */
export function openAuthUrlExternally(url) {
  if (typeof window === 'undefined' || !url) {
    return;
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);

  if (isAndroid) {
    const chromeNavigate = `googlechrome://navigate?url=${encodeURIComponent(url)}`;
    const pathAndQuery = url.replace(/^https?:\/\//, '');
    const chromeIntent = `intent://${pathAndQuery}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`;

    window.location.href = chromeNavigate;

    window.setTimeout(() => {
      if (document.visibilityState !== 'hidden') {
        window.location.href = chromeIntent;
      }
    }, 700);

    window.setTimeout(() => {
      if (document.visibilityState !== 'hidden') {
        window.location.assign(url);
      }
    }, 1400);

    return;
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export const openUrlInSystemBrowser = openAuthUrlExternally;
