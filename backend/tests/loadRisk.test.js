const { buildLoadRiskAssessment } = require('../services/loadRisk');

describe('buildLoadRiskAssessment', () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  it('flags elevated risk when acute load spikes', () => {
    const activities = [
      { date: new Date(now - day), distance: 15000 },
      { date: new Date(now - 2 * day), distance: 14000 },
      { date: new Date(now - 3 * day), distance: 12000 },
      { date: new Date(now - 20 * day), distance: 5000 }
    ];

    const result = buildLoadRiskAssessment(activities, { weeklyTrainingLoadKm: 30 });
    expect(['moderate', 'elevated']).toContain(result.risk);
    expect(result.acuteWeeklyKm).toBeGreaterThan(30);
  });

  it('reports low risk for balanced load', () => {
    const activities = [
      { date: new Date(now - 2 * day), distance: 10000 },
      { date: new Date(now - 9 * day), distance: 10000 },
      { date: new Date(now - 16 * day), distance: 10000 },
      { date: new Date(now - 23 * day), distance: 10000 }
    ];

    const result = buildLoadRiskAssessment(activities, { weeklyTrainingLoadKm: 40 });
    expect(result.risk).toBe('low');
    expect(result.acuteChronicRatio).toBeLessThanOrEqual(1.2);
  });
});
