const {
  normalizeVisibility,
  visibilityFromStravaActivity
} = require('../utils/activityVisibility');

describe('activityVisibility', () => {
  test('maps Strava private flag to only_me', () => {
    expect(visibilityFromStravaActivity({ private: true, visibility: 'everyone' })).toBe('only_me');
  });

  test('uses Strava visibility when not private', () => {
    expect(visibilityFromStravaActivity({ private: false, visibility: 'followers_only' })).toBe(
      'followers_only'
    );
  });

  test('normalizes aliases', () => {
    expect(normalizeVisibility('public')).toBe('everyone');
    expect(normalizeVisibility('private')).toBe('only_me');
  });
});
