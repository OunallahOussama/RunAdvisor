const {
  buildAnalytics,
  analyzeActivity,
  estimateEffortIntensity,
  intensityBucketFromValue,
  trimpLikeLoad,
  computeAcwrMonotonyStrain,
  computeIntensityDistribution,
  computeTrends,
  computePersonalRecords,
  buildWeeklyLoadSeries
} = require('../services/analyticsService');

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const baseline = { avgPace: 5.5, maxHr: 190, restingHr: 55 };

function annotate(activities) {
  return activities.map((a) => {
    const intensity = estimateEffortIntensity(a, baseline);
    return {
      ...a,
      __intensity: intensity,
      __bucket: intensityBucketFromValue(intensity),
      __load: trimpLikeLoad(a, baseline)
    };
  });
}

describe('analyticsService - core helpers', () => {
  it('estimateEffortIntensity stays within [0, 1]', () => {
    const easy = estimateEffortIntensity({ pace: 6.5 }, baseline);
    const hard = estimateEffortIntensity({ pace: 4.0 }, baseline);

    expect(easy).toBeGreaterThanOrEqual(0);
    expect(easy).toBeLessThanOrEqual(1);
    expect(hard).toBeGreaterThan(easy);
    expect(hard).toBeLessThanOrEqual(1);
  });

  it('intensityBucketFromValue maps to expected buckets', () => {
    expect(intensityBucketFromValue(0.3)).toBe('easy');
    expect(intensityBucketFromValue(0.65)).toBe('tempo');
    expect(intensityBucketFromValue(0.8)).toBe('threshold');
    expect(intensityBucketFromValue(0.95)).toBe('vo2');
  });

  it('trimpLikeLoad scales with duration and intensity', () => {
    const short = trimpLikeLoad({ movingTime: 30 * 60, pace: 6.0 }, baseline);
    const long = trimpLikeLoad({ movingTime: 90 * 60, pace: 4.5 }, baseline);
    expect(long).toBeGreaterThan(short);
  });
});

describe('analyticsService - aggregates', () => {
  const activities = annotate([
    { _id: 'a1', type: 'run', distance: 10_000, movingTime: 3000, pace: 5.0, avgHeartRate: 160, maxHeartRate: 180, date: daysAgo(2), elevationGain: 80 },
    { _id: 'a2', type: 'run', distance: 6_000, movingTime: 2160, pace: 6.0, avgHeartRate: 140, maxHeartRate: 165, date: daysAgo(5), elevationGain: 30 },
    { _id: 'a3', type: 'run', distance: 16_000, movingTime: 5760, pace: 6.0, avgHeartRate: 150, maxHeartRate: 170, date: daysAgo(8), elevationGain: 200 },
    { _id: 'a4', type: 'run', distance: 8_000, movingTime: 2400, pace: 5.0, avgHeartRate: 165, maxHeartRate: 182, date: daysAgo(12), elevationGain: 40 },
    { _id: 'a5', type: 'run', distance: 14_000, movingTime: 5040, pace: 6.0, avgHeartRate: 145, maxHeartRate: 167, date: daysAgo(18), elevationGain: 100 },
    { _id: 'a6', type: 'run', distance: 6_000, movingTime: 2160, pace: 6.0, avgHeartRate: 140, maxHeartRate: 158, date: daysAgo(24), elevationGain: 25 }
  ]);

  it('computeAcwrMonotonyStrain returns numeric stats', () => {
    const result = computeAcwrMonotonyStrain(activities);
    expect(result).toHaveProperty('weeklyLoad');
    expect(result).toHaveProperty('acwr');
    expect(result).toHaveProperty('monotony');
    expect(result).toHaveProperty('strain');
    expect(result.weeklyLoad).toBeGreaterThan(0);
    expect(result.acwr).toBeGreaterThan(0);
  });

  it('computeIntensityDistribution sums to ~100%', () => {
    const dist = computeIntensityDistribution(activities);
    const total = dist.pct.easy + dist.pct.tempo + dist.pct.threshold + dist.pct.vo2;
    expect(total).toBeGreaterThanOrEqual(98);
    expect(total).toBeLessThanOrEqual(102);
  });

  it('computeTrends compares this week to last week', () => {
    const trends = computeTrends(activities);
    expect(trends).toHaveProperty('currentWeekDistanceKm');
    expect(trends).toHaveProperty('previousWeekDistanceKm');
    expect(typeof trends.currentWeekDistanceKm).toBe('number');
  });

  it('buildWeeklyLoadSeries produces one entry per week window', () => {
    const series = buildWeeklyLoadSeries(activities, 28);
    expect(series.length).toBe(4);
    series.forEach((week) => {
      expect(week).toHaveProperty('label');
      expect(week).toHaveProperty('load');
      expect(week).toHaveProperty('totalDistanceKm');
    });
  });

  it('computePersonalRecords identifies longest run', () => {
    const prs = computePersonalRecords(activities);
    expect(prs.longestRunKm).toBeCloseTo(16, 0);
    expect(prs.biggestClimbM).toBe(200);
  });
});

describe('analyticsService - analyzeActivity', () => {
  it('detects negative split when second half is faster', () => {
    const activity = {
      _id: 'split-neg',
      name: 'Negative split',
      distance: 5000,
      movingTime: 1500,
      pace: 5.0,
      date: daysAgo(1),
      splitsMetric: [
        { split: 1, distance: 1000, moving_time: 330, elevation_difference: 0 },
        { split: 2, distance: 1000, moving_time: 320, elevation_difference: 0 },
        { split: 3, distance: 1000, moving_time: 300, elevation_difference: 0 },
        { split: 4, distance: 1000, moving_time: 290, elevation_difference: 0 },
        { split: 5, distance: 1000, moving_time: 270, elevation_difference: 0 }
      ]
    };
    const result = analyzeActivity(activity, baseline);
    expect(result.splitProfile).toBe('negative');
    expect(result.splits.length).toBe(5);
    expect(result.fastestKilometer.km).toBe(5);
  });

  it('detects positive split when pace fades', () => {
    const activity = {
      _id: 'split-pos',
      name: 'Positive split',
      distance: 5000,
      movingTime: 1500,
      pace: 5.0,
      date: daysAgo(1),
      splitsMetric: [
        { split: 1, distance: 1000, moving_time: 270 },
        { split: 2, distance: 1000, moving_time: 280 },
        { split: 3, distance: 1000, moving_time: 300 },
        { split: 4, distance: 1000, moving_time: 320 },
        { split: 5, distance: 1000, moving_time: 340 }
      ]
    };
    const result = analyzeActivity(activity, baseline);
    expect(result.splitProfile).toBe('positive');
    expect(result.fastestKilometer.km).toBe(1);
    expect(result.slowestKilometer.km).toBe(5);
  });

  it('computes pace variability across splits', () => {
    const activity = {
      _id: 'var',
      distance: 3000,
      movingTime: 900,
      pace: 5.0,
      date: daysAgo(1),
      splitsMetric: [
        { split: 1, distance: 1000, moving_time: 280 },
        { split: 2, distance: 1000, moving_time: 320 },
        { split: 3, distance: 1000, moving_time: 300 }
      ]
    };
    const result = analyzeActivity(activity, baseline);
    expect(result.paceVariabilityMinPerKm).toBeGreaterThanOrEqual(0);
  });
});

describe('analyticsService - buildAnalytics (with in-memory activities)', () => {
  it('returns full analytics object when activities are provided directly', async () => {
    const activities = [
      { _id: 'x1', type: 'run', distance: 10000, movingTime: 3000, pace: 5.0, avgHeartRate: 160, maxHeartRate: 180, date: daysAgo(2), elevationGain: 80 },
      { _id: 'x2', type: 'run', distance: 8000, movingTime: 2400, pace: 5.0, avgHeartRate: 158, maxHeartRate: 178, date: daysAgo(6), elevationGain: 60 }
    ];
    const analytics = await buildAnalytics(activities, { windowDays: 28 });

    expect(analytics.window.activityCount).toBe(2);
    expect(analytics.volume.totalDistanceKm).toBeCloseTo(18, 0);
    expect(analytics.trainingLoad.weeklyLoad).toBeGreaterThan(0);
    expect(analytics.intensityDistribution).toHaveProperty('easy');
    expect(analytics.perActivity.length).toBe(2);
  });

  it('returns empty scaffold when no activities are in the window', async () => {
    const analytics = await buildAnalytics([], { windowDays: 28 });
    expect(analytics.window.activityCount).toBe(0);
    expect(analytics.volume.totalDistanceKm).toBe(0);
  });
});
