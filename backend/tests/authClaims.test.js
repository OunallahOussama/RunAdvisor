const { getClaimEmail } = require('../utils/authClaims');

describe('getClaimEmail', () => {
  const originalAudience = process.env.AUTH0_AUDIENCE;

  afterEach(() => {
    process.env.AUTH0_AUDIENCE = originalAudience;
  });

  it('reads standard email claim', () => {
    expect(getClaimEmail({ email: 'Runner@Example.com' })).toBe('runner@example.com');
  });

  it('reads audience-namespaced email claim', () => {
    process.env.AUTH0_AUDIENCE = 'https://runadvisor-api';
    expect(getClaimEmail({ 'https://runadvisor-api/email': 'admin@runadvisor.fit' })).toBe('admin@runadvisor.fit');
  });
});
