const { buildRecommendations } = require('../services/mlService');

describe('buildRecommendations', () => {
  const recentActivities = [
    { distance: 10000, pace: 5.2, date: new Date(), _id: '1' },
    { distance: 8500, pace: 5.5, date: new Date(), _id: '2' },
    { distance: 12000, pace: 5.0, date: new Date(), _id: '3' }
  ];

  it('returns recovery and endurance recommendations when intensity is high', () => {
    const recommendations = buildRecommendations('user1', recentActivities, {}, {});
    expect(recommendations.some((rec) => rec.type === 'recovery')).toBe(true);
    expect(recommendations.some((rec) => rec.type === 'training_plan')).toBe(true);
  });

  it('creates race-specific recommendations when race context is provided', () => {
    const raceDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const recommendations = buildRecommendations('user1', recentActivities, {}, {
      raceDistance: 21.1,
      raceDate
    });

    expect(recommendations.some((rec) => rec.title.includes('Race'))).toBe(true);
    expect(recommendations.some((rec) => rec.reasoning.includes('race'))).toBe(true);
  });
});
