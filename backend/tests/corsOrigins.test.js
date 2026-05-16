const { buildCorsOptions, parseOriginList } = require('../utils/corsOrigins');

describe('cors origins', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('parseOriginList splits comma-separated values', () => {
    expect(parseOriginList('https://a.test, https://b.test')).toEqual([
      'https://a.test',
      'https://b.test'
    ]);
  });

  test('allows configured production origins', (done) => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://runadvisor.fit';

    const { origin } = buildCorsOptions();
    origin('https://runadvisor.fit', (error, allowed) => {
      expect(error).toBeNull();
      expect(allowed).toBe(true);
      done();
    });
  });

  test('blocks unknown production origins', (done) => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://runadvisor.fit';

    const { origin } = buildCorsOptions();
    origin('https://evil.example', (error) => {
      expect(error).toBeInstanceOf(Error);
      done();
    });
  });
});
