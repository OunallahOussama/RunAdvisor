const { buildActivityInsight } = require('../services/activityInsights');
const {
  buildStravaInsightDescription,
  descriptionHasRunAdvisorInsight,
  stripRunAdvisorBlock
} = require('../utils/stravaInsightDescription');

describe('stravaInsightDescription', () => {
  test('builds two-line description with RunAdvisor site link', () => {
    const activity = {
      distance: 8100,
      movingTime: 2520,
      pace: 5.17,
      elevationGain: 95,
      avgHeartRate: 148
    };
    const stravaDetail = {
      splits_metric: [
        { distance: 1000, moving_time: 320 },
        { distance: 1000, moving_time: 310 },
        { distance: 1000, moving_time: 300 },
        { distance: 1000, moving_time: 295 }
      ],
      total_elevation_gain: 95,
      average_heartrate: 148,
      max_heartrate: 168,
      suffer_score: 42
    };

    const insight = buildActivityInsight(activity, stravaDetail);
    const description = buildStravaInsightDescription(
      insight,
      'My own notes from the run.',
      'https://runadvisor.fit'
    );

    const lines = description.split('\n');
    expect(lines[0]).toMatch(/Negative split/i);
    expect(lines[0]).not.toMatch(/\d+\.?\d*\s*km/i);
    expect(lines[1]).toBe('RunAdvisor · https://runadvisor.fit');
    expect(description).not.toMatch(/Tech:/);
    expect(description).toMatch(/My own notes from the run/);
    expect(descriptionHasRunAdvisorInsight(description)).toBe(true);
  });

  test('stripRunAdvisorBlock preserves athlete notes', () => {
    const text = 'Negative split — you ran the second half faster.\nRunAdvisor · https://runadvisor.fit\n\n---\nFelt great today';
    expect(stripRunAdvisorBlock(text)).toBe('Felt great today');
  });
});
