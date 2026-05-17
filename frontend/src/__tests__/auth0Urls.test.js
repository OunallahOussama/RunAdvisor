import { getAuth0LogoutReturnUrl, getAuth0ReturnToOrigin } from '../utils/auth0Urls';

describe('auth0Urls', () => {
  const originalSiteUrl = process.env.REACT_APP_SITE_URL;
  const originalCallback = process.env.REACT_APP_AUTH0_CALLBACK_URL;
  const originalLogout = process.env.REACT_APP_AUTH0_LOGOUT_RETURN_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.REACT_APP_SITE_URL;
    } else {
      process.env.REACT_APP_SITE_URL = originalSiteUrl;
    }
    if (originalCallback === undefined) {
      delete process.env.REACT_APP_AUTH0_CALLBACK_URL;
    } else {
      process.env.REACT_APP_AUTH0_CALLBACK_URL = originalCallback;
    }
    if (originalLogout === undefined) {
      delete process.env.REACT_APP_AUTH0_LOGOUT_RETURN_URL;
    } else {
      process.env.REACT_APP_AUTH0_LOGOUT_RETURN_URL = originalLogout;
    }
  });

  it('uses configured site URL origin for logout return', () => {
    delete process.env.REACT_APP_AUTH0_LOGOUT_RETURN_URL;
    process.env.REACT_APP_SITE_URL = 'https://runadvisor.fit';
    expect(getAuth0ReturnToOrigin()).toBe('https://runadvisor.fit');
    expect(getAuth0LogoutReturnUrl()).toBe('https://runadvisor.fit/login');
  });

  it('honors explicit logout return URL', () => {
    process.env.REACT_APP_AUTH0_LOGOUT_RETURN_URL = 'https://runadvisor.fit';
    expect(getAuth0LogoutReturnUrl()).toBe('https://runadvisor.fit');
  });
});
