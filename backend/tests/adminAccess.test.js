const { isAdminUser } = require('../utils/adminAccess');

describe('isAdminUser', () => {
  const originalEmails = process.env.ADMIN_EMAILS;
  const originalSubs = process.env.ADMIN_AUTH0_IDS;

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEmails;
    process.env.ADMIN_AUTH0_IDS = originalSubs;
  });

  it('returns true when user role is admin', () => {
    expect(isAdminUser({ role: 'admin', email: 'x@y.com' }, {})).toBe(true);
  });

  it('returns true when email is in ADMIN_EMAILS', () => {
    process.env.ADMIN_EMAILS = 'admin@runadvisor.fit,other@test.com';
    expect(isAdminUser({ email: 'Admin@RunAdvisor.fit' }, {})).toBe(true);
  });

  it('returns true when auth0 sub is listed', () => {
    process.env.ADMIN_AUTH0_IDS = 'auth0|abc123';
    expect(isAdminUser({}, { sub: 'auth0|abc123' })).toBe(true);
    expect(isAdminUser({ auth0UserId: 'auth0|abc123' }, {})).toBe(true);
  });

  it('returns false for regular users', () => {
    process.env.ADMIN_EMAILS = 'admin@runadvisor.fit';
    expect(isAdminUser({ email: 'runner@example.com' }, { sub: 'auth0|user' })).toBe(false);
  });
});
