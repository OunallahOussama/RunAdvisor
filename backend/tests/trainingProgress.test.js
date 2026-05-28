const {
  aggregateRunVolume,
  buildGamification,
  evaluateChallenge,
  normalizeChallengesInput,
  filterRunsInRange
} = require('../services/trainingProgress');

describe('trainingProgress', () => {
  const activities = [
    {
      type: 'Run',
      date: new Date('2026-05-20T10:00:00.000Z'),
      distance: 10000,
      movingTime: 3600,
      pace: 6
    },
    {
      type: 'Run',
      date: new Date('2026-05-22T10:00:00.000Z'),
      distance: 5000,
      movingTime: 1500,
      pace: 5
    }
  ];

  it('aggregates run volume in range', () => {
    const since = new Date('2026-05-01T00:00:00.000Z');
    const vol = aggregateRunVolume(activities, since);
    expect(vol.distanceKm).toBe(15);
    expect(vol.runCount).toBe(2);
  });

  it('filters runs only', () => {
    const mixed = [...activities, { type: 'Ride', date: new Date('2026-05-23'), distance: 20000 }];
    const runs = filterRunsInRange(mixed, new Date('2026-05-01'));
    expect(runs).toHaveLength(2);
  });

  it('builds gamification level from YTD km', () => {
    const g = buildGamification(120);
    expect(g.level).toBe(3);
    expect(g.xpInLevel).toBe(20);
  });

  it('evaluates monthly km challenge', () => {
    const ctx = {
      month: { distanceKm: 40 },
      year: { distanceKm: 200 },
      week: { distanceKm: 15 },
      monthlyGoalKm: 100,
      yearlyGoalKm: 500,
      weeklyGoalKm: 30,
      personalRecords: { longestRunKm: 12, fastestPaceMinPerKm: 5.2, biggestClimbM: 200 },
      racePrediction: { predictedPaceMinPerKm: 5.5, explanation: 'ok' }
    };
    const result = evaluateChallenge(
      { kind: 'monthly_km', targetKm: 80, title: 'May miles' },
      ctx
    );
    expect(result.percent).toBe(50);
    expect(result.status).toBe('active');
    expect(result.detail).toContain('40');
  });

  it('normalizes challenge input', () => {
    const list = normalizeChallengesInput([
      { kind: 'pace_cap', targetPaceMinPerKm: 5.5, title: 'Speed' },
      { kind: 'invalid' }
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].kind).toBe('pace_cap');
  });
});
