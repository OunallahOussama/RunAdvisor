const { buildCoachReview } = require('../services/trainingInsights');

describe('buildCoachReview', () => {
  it('returns summary metrics, trend points, and actionable coach review bullets', () => {
    const activities = [
      {
        type: 'run',
        distance: 12000,
        movingTime: 3600,
        pace: 5,
        avgHeartRate: 150,
        date: new Date('2026-05-01T07:00:00Z')
      },
      {
        type: 'run',
        distance: 8000,
        movingTime: 2700,
        pace: 5.6,
        avgHeartRate: 148,
        date: new Date('2026-05-04T07:00:00Z')
      },
      {
        type: 'run',
        distance: 15000,
        movingTime: 4950,
        pace: 5.5,
        avgHeartRate: 152,
        date: new Date('2026-05-09T07:00:00Z')
      }
    ];

    const result = buildCoachReview(activities, {
      stravaId: '123',
      trainingPlans: [{ fileName: 'plan.pdf' }]
    }, {
      days: 28
    });

    expect(result.summary.totalDistanceKm).toBeGreaterThan(30);
    expect(result.summary.stravaConnected).toBe(true);
    expect(result.trend.length).toBe(6);
    expect(result.coachReview.headline).toBeTruthy();
    expect(result.coachReview.nextFocus.length).toBeGreaterThan(0);
  });

  it('returns daily metrics, last-week summary, and race pace fields when race distance is set', () => {
    const now = Date.now();
    const dayAgo = (n) => new Date(now - n * 86400000);

    const activities = [
      {
        type: 'run',
        distance: 12000,
        movingTime: 3600,
        pace: 5,
        avgHeartRate: 150,
        date: dayAgo(10)
      },
      {
        type: 'run',
        distance: 21000,
        movingTime: 7200,
        pace: 5.7,
        avgHeartRate: 148,
        date: dayAgo(2)
      }
    ];

    const result = buildCoachReview(activities, {}, {
      days: 28,
      raceDistance: 42.2
    });

    expect(result.dailyMetrics.length).toBe(28);
    expect(result.lastWeekSummary.activityCount).toBeGreaterThan(0);
    expect(result.racePacePrediction.raceDistanceKm).toBe(42.2);
    expect(result.racePacePrediction.predictedPaceMinPerKm).toBeTruthy();
    expect(result.weeklyRacePaceProjection.length).toBe(6);
  });
});
