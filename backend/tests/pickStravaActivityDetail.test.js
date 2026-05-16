const { pickStravaActivityDetail } = require('../utils/pickStravaActivityDetail');

describe('pickStravaActivityDetail', () => {
  it('returns null for non-objects', () => {
    expect(pickStravaActivityDetail(null)).toBeNull();
    expect(pickStravaActivityDetail(undefined)).toBeNull();
    expect(pickStravaActivityDetail('x')).toBeNull();
  });

  it('maps core fields and map subset', () => {
    const raw = {
      id: 123,
      name: 'Morning Run',
      type: 'Run',
      distance: 10000,
      moving_time: 3600,
      elapsed_time: 3700,
      total_elevation_gain: 120,
      start_date: '2026-05-01T10:00:00Z',
      timezone: '(GMT+00:00) Europe/London',
      average_heartrate: 145,
      map: {
        id: 'm1',
        summary_polyline: 'abc',
        polyline: 'def',
        resource_state: 2
      },
      splits_metric: [{ distance: 1000, elevation_difference: 10 }]
    };

    const picked = pickStravaActivityDetail(raw);

    expect(picked.id).toBe(123);
    expect(picked.name).toBe('Morning Run');
    expect(picked.map.summary_polyline).toBe('abc');
    expect(picked.map.polyline).toBe('def');
    expect(picked.splits_metric).toEqual(raw.splits_metric);
  });

  it('handles missing map', () => {
    const picked = pickStravaActivityDetail({ id: 1, name: 'Walk', type: 'Walk' });
    expect(picked.map).toBeNull();
  });
});
