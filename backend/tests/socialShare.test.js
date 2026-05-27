const { buildActivitySharePayload } = require('../services/socialService');

describe('buildActivitySharePayload', () => {
  test('builds share text and url for social platforms', () => {
    const payload = buildActivitySharePayload(
      {
        _id: 'abc123',
        name: 'Morning Run',
        distance: 8000,
        pace: 5.25
      },
      'https://app.runadvisor.test'
    );

    expect(payload.url).toBe('https://app.runadvisor.test/activities/abc123');
    expect(payload.title).toBe('Morning Run');
    expect(payload.text).toMatch(/8 km/);
    expect(payload.text).toMatch(/RunAdvisor/);
    expect(payload.hashtags).toContain('running');
  });
});
