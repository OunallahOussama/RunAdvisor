const {
  buildStravaCreateForm,
  toStravaSportType,
  mapStravaUploadError
} = require('../utils/stravaActivityPayload');

describe('stravaCreateActivity', () => {
  test('maps activity types to Strava sport types', () => {
    expect(toStravaSportType('trail run')).toBe('TrailRun');
    expect(toStravaSportType('walk')).toBe('Walk');
    expect(toStravaSportType('run')).toBe('Run');
  });

  test('builds Strava create form payload', () => {
    const form = buildStravaCreateForm({
      name: 'Morning run',
      type: 'run',
      date: new Date('2026-05-16T00:00:00.000Z'),
      duration: 3120,
      distance: 8500,
      notes: 'Felt good',
      visibility: 'only_me'
    });

    expect(form.get('name')).toBe('Morning run');
    expect(form.get('sport_type')).toBe('Run');
    expect(form.get('elapsed_time')).toBe('3120');
    expect(form.get('distance')).toBe('8500');
    expect(form.get('description')).toBe('Felt good');
    expect(form.get('visibility')).toBe('only_me');
    expect(form.get('start_date_local')).toMatch(/2026-05-16T09:00:00Z/);
  });

  test('maps forbidden Strava response to reconnect guidance', () => {
    const result = mapStravaUploadError({
      response: { status: 403, data: { message: 'Forbidden' } }
    });

    expect(result.posted).toBe(false);
    expect(result.needsReconnect).toBe(true);
  });
});
