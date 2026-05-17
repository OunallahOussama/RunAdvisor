import {
  getGoogleAuthRestrictionMessage,
  isGoogleDisallowedUserAgentError,
  isRestrictedAuthBrowser
} from '../utils/authBrowser';

describe('authBrowser', () => {
  it('flags restricted environments for Google OAuth', () => {
    expect(isRestrictedAuthBrowser('Mozilla/5.0 FBAN/FBIOS')).toBe(true);
    expect(isRestrictedAuthBrowser('Mozilla/5.0 (Linux; Android 10; wv) AppleWebKit')).toBe(true);
    expect(isRestrictedAuthBrowser('Mozilla/5.0 Electron/28.0.0')).toBe(true);
    expect(
      isRestrictedAuthBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });

  it('recognizes Google disallowed_useragent errors', () => {
    expect(isGoogleDisallowedUserAgentError('Error 403: disallowed_useragent')).toBe(true);
    expect(isGoogleDisallowedUserAgentError('Use secure browsers policy')).toBe(true);
    expect(isGoogleDisallowedUserAgentError('access_denied')).toBe(false);
  });

  it('returns a helpful restriction message', () => {
    expect(getGoogleAuthRestrictionMessage()).toMatch(/Google sign-in must be completed|Open RunAdvisor/);
  });
});
