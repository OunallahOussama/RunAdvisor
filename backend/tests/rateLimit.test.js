const { decodeJwtPayload, getClientKey } = require('../middleware/rateLimit');

function makeToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

describe('rateLimit key generation', () => {
  test('decodeJwtPayload returns parsed claims', () => {
    const token = makeToken({ sub: 'auth0|abc123', email: 'runner@example.com' });
    expect(decodeJwtPayload(token)).toEqual({
      sub: 'auth0|abc123',
      email: 'runner@example.com'
    });
  });

  test('getClientKey prefers Auth0 subject from bearer token', () => {
    const token = makeToken({ sub: 'auth0|user-42' });
    const req = {
      ip: '203.0.113.10',
      headers: { authorization: `Bearer ${token}` }
    };

    expect(getClientKey(req)).toBe('auth0:auth0|user-42');
  });

  test('getClientKey falls back to IP without bearer token', () => {
    const req = {
      ip: '203.0.113.10',
      headers: {}
    };

    expect(getClientKey(req)).toBe('203.0.113.10');
  });
});
