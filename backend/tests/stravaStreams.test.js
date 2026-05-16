const { normalizeStreamPayload, downsampleSeries } = require('../services/stravaStreams');

describe('stravaStreams', () => {
  it('downsampleSeries reduces long arrays', () => {
    const input = Array.from({ length: 500 }, (_, i) => i);
    const output = downsampleSeries(input, 50);
    expect(output.length).toBeLessThanOrEqual(50);
  });

  it('normalizeStreamPayload builds pace from velocity', () => {
    const streams = [
      { type: 'time', data: [0, 60, 120] },
      { type: 'distance', data: [0, 500, 1000] },
      { type: 'velocity_smooth', data: [0, 3.5, 3.2] }
    ];

    const normalized = normalizeStreamPayload(streams);
    expect(normalized.pointCount).toBe(3);
    expect(normalized.paceMinPerKm.filter(Boolean).length).toBeGreaterThan(0);
  });
});
