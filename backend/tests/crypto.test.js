const { encrypt, decrypt, isEncrypted } = require('../utils/crypto');

describe('crypto', () => {
  const originalKey = process.env.STRAVA_TOKEN_ENCRYPTION_KEY;
  const originalSecret = process.env.STRAVA_CLIENT_SECRET;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.STRAVA_TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    delete process.env.STRAVA_CLIENT_SECRET;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;

    if (originalKey == null) {
      delete process.env.STRAVA_TOKEN_ENCRYPTION_KEY;
    } else {
      process.env.STRAVA_TOKEN_ENCRYPTION_KEY = originalKey;
    }

    if (originalSecret == null) {
      delete process.env.STRAVA_CLIENT_SECRET;
    } else {
      process.env.STRAVA_CLIENT_SECRET = originalSecret;
    }
  });

  test('encrypts and decrypts Strava tokens', () => {
    const token = 'strava-access-token-value';
    const encrypted = encrypt(token);

    expect(isEncrypted(encrypted)).toBe(true);
    expect(decrypt(encrypted)).toBe(token);
  });

  test('passes through legacy plaintext tokens', () => {
    const token = 'legacy-plain-token';
    expect(decrypt(token)).toBe(token);
  });
});
