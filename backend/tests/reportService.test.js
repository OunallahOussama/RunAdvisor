const { buildFallbackReport, paceLabel, paceBand, fallbackKeyMetrics } = require('../services/reportService');

describe('reportService - helpers', () => {
  it('paceLabel formats min/km as mm:ss /km', () => {
    expect(paceLabel(5.5)).toBe('5:30 min/km');
    expect(paceLabel(4)).toBe('4:00 min/km');
    expect(paceLabel(0)).toBe('n/a');
  });

  it('paceBand returns lower/upper around the center', () => {
    const band = paceBand(5.0, 0.2);
    expect(band.lowerMinPerKm).toBeCloseTo(4.8, 2);
    expect(band.upperMinPerKm).toBeCloseTo(5.2, 2);
    expect(band.label).toContain('min/km');
  });
});

describe('reportService - fallback report', () => {
  const analytics = {
    window: { days: 84, activityCount: 18 },
    volume: {
      totalDistanceKm: 180,
      totalMovingMinutes: 900,
      runsPerWeek: 4.5,
      avgDistanceKm: 10,
      longestRunKm: 22,
      totalElevationM: 1200
    },
    pace: { avgPaceMinPerKm: 5.5, fastestPaceMinPerKm: 4.5, slowestPaceMinPerKm: 6.5 },
    heartRate: { avgHeartRate: 152, maxHeartRate: 178 },
    intensityDistribution: { easy: 70, tempo: 15, threshold: 10, vo2: 5 },
    intensityDistributionMinutes: { easy: 630, tempo: 135, threshold: 90, vo2: 45 },
    trainingLoad: { weeklyLoad: 320, acwr: 1.15, monotony: 1.3, strain: 416, acuteLoad: 320, chronicLoad: 280 },
    trends: { distanceDeltaPctWoW: 8, distanceDeltaPct28d: 5, paceDeltaSecPerKmWoW: -3 },
    weeklyLoadSeries: [],
    perActivity: [
      {
        activityId: 'a1',
        name: 'Long run',
        date: new Date().toISOString(),
        distanceKm: 18,
        avgPaceMinPerKm: 5.4,
        splitProfile: 'negative',
        fastestKilometer: { km: 17, pace: 4.8 },
        slowestKilometer: { km: 3, pace: 5.9 },
        hrDriftBpm: 4,
        estimatedRpe: 6
      }
    ],
    personalRecords: { longestRunKm: 22, biggestClimbM: 300, fastestPaceMinPerKm: 4.5 },
    dataQuality: { hasHeartRate: true, hasSplits: true, hasPower: false }
  };

  it('builds a structured report with all required sections', () => {
    const report = buildFallbackReport(analytics, {});

    expect(report.executiveSummary).toBeDefined();
    expect(report.executiveSummary.headline).toEqual(expect.any(String));
    expect(report.executiveSummary.readinessPhase).toEqual(expect.any(String));
    expect(report.workloadAnalysis).toBeDefined();
    expect(report.paceEffortAnalysis).toBeDefined();
    expect(report.splitAnalysis).toBeDefined();
    expect(report.riskAndRecovery).toBeDefined();
    expect(report.nextSessionDetail).toBeDefined();
    expect(Array.isArray(report.weeklyPlan)).toBe(true);
    expect(report.weeklyPlan.length).toBe(7);
    expect(report.planPeriod).toMatchObject({
      basedOnLastDays: analytics.window.days,
      rollingDays: 7
    });
    expect(report.planPeriod.startsAt).toBeTruthy();
    expect(report.planPeriod.endsAt).toBeTruthy();
    expect(Array.isArray(report.fourWeekOutlook)).toBe(true);
    expect(report.fourWeekOutlook.length).toBe(4);
    expect(report.keyMetrics).toBeDefined();
  });

  it('next session has warmup, mainSet and cooldown', () => {
    const report = buildFallbackReport(analytics, {});
    expect(report.nextSessionDetail.warmup).toBeDefined();
    expect(report.nextSessionDetail.mainSet).toBeDefined();
    expect(report.nextSessionDetail.cooldown).toBeDefined();
    expect(report.nextSessionDetail.mainSet.targetPace).toBeDefined();
  });

  it('marks risk as high when ACWR is excessive', () => {
    const overload = {
      ...analytics,
      trainingLoad: { ...analytics.trainingLoad, acwr: 1.7, monotony: 2.1 }
    };
    const report = buildFallbackReport(overload, {});
    expect(report.riskAndRecovery.injuryRiskLevel).toBe('high');
    expect(report.executiveSummary.readinessPhase).toBe('recover');
  });
});

describe('reportService - fallbackKeyMetrics', () => {
  it('mirrors the analytics inputs without inventing data', () => {
    const analytics = {
      window: { days: 28, activityCount: 6 },
      volume: { totalDistanceKm: 60, totalMovingMinutes: 320, runsPerWeek: 1.5, longestRunKm: 16, totalElevationM: 400 },
      pace: { avgPaceMinPerKm: 5.4 },
      heartRate: { avgHeartRate: 148 },
      intensityDistribution: { easy: 70, tempo: 20, threshold: 5, vo2: 5 },
      trainingLoad: { weeklyLoad: 200, acwr: 1.1, monotony: 1.4, strain: 280 },
      trends: { distanceDeltaPctWoW: 4, distanceDeltaPct28d: 2 }
    };
    const km = fallbackKeyMetrics(analytics);
    expect(km.windowDays).toBe(28);
    expect(km.activityCount).toBe(6);
    expect(km.totalDistanceKm).toBe(60);
    expect(km.acwr).toBe(1.1);
    expect(km.intensityPct).toEqual({ easy: 70, tempo: 20, threshold: 5, vo2: 5 });
  });
});
