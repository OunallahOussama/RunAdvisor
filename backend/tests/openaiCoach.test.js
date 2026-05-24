jest.mock('../models/Report', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../services/analyticsService', () => ({
  buildAnalytics: jest.fn()
}));

jest.mock('../services/reportService', () => ({
  generateReport: jest.fn()
}));

const Report = require('../models/Report');
const { buildAnalytics } = require('../services/analyticsService');
const { generateReport } = require('../services/reportService');

const {
  buildFallbackWeeklySummary,
  generateWeeklySummaryReport,
  getOrCreateWeeklySummary,
  summarizeReportLegacy,
  clampWindowDays
} = require('../services/openaiCoach');

function makeAnalytics(overrides = {}) {
  return {
    window: { days: 7, activityCount: 4 },
    volume: {
      totalDistanceKm: 32.4,
      totalMovingMinutes: 188,
      runsPerWeek: 4,
      avgDistanceKm: 8.1,
      longestRunKm: 14.5,
      totalElevationM: 320
    },
    pace: { avgPaceMinPerKm: 5.2, fastestPaceMinPerKm: 4.4, slowestPaceMinPerKm: 6.1 },
    heartRate: { avgHeartRate: 148, maxHeartRate: 172 },
    intensityDistribution: { easy: 72, tempo: 14, threshold: 10, vo2: 4 },
    intensityDistributionMinutes: { easy: 135, tempo: 26, threshold: 19, vo2: 8 },
    trainingLoad: { weeklyLoad: 285, acwr: 1.18, monotony: 1.4, strain: 399 },
    trends: { distanceDeltaPctWoW: 8, distanceDeltaPct28d: 4, paceDeltaSecPerKmWoW: -2 },
    weeklyLoadSeries: [],
    perActivity: [],
    personalRecords: { longestRunKm: 14.5, biggestClimbM: 220 },
    dataQuality: { hasHeartRate: true, hasSplits: true, hasPower: false },
    ...overrides
  };
}

function makeReport(overrides = {}) {
  return {
    generatedAt: new Date().toISOString(),
    windowDays: 7,
    source: 'fallback',
    executiveSummary: {
      headline: 'Solid build week, recovery looks healthy.',
      readinessPhase: 'build',
      paragraph: 'You logged 4 runs for 32.4 km. ACWR 1.18 is in the healthy build zone.',
      goalRace: null
    },
    workloadAnalysis: { paragraph: 'Load looks balanced.', flags: [], acwr: 1.18, monotony: 1.4, strain: 399 },
    paceEffortAnalysis: { paragraph: 'Pace is on track.', intensityComment: '' },
    splitAnalysis: { paragraph: '', activities: [] },
    riskAndRecovery: { paragraph: 'Low risk.', injuryRiskLevel: 'low', recoveryActions: [] },
    nextSessionDetail: {
      title: 'Tempo intervals',
      objective: 'Build threshold',
      durationMinutes: 50,
      warmup: { durationMinutes: 15, description: 'Easy jog', targetPace: null, hrZone: 'Z2' },
      mainSet: { durationMinutes: 25, description: '3x8 min tempo', targetPace: null, hrZone: 'Z3-Z4', rpe: 7 },
      cooldown: { durationMinutes: 10, description: 'Easy jog', targetPace: null, hrZone: 'Z1-Z2' }
    },
    weeklyPlan: Array.from({ length: 7 }, (_, idx) => ({
      day: idx + 1,
      sessionType: idx === 1 ? 'rest_or_xt' : 'easy_run',
      title: `Day ${idx + 1}`,
      durationMinutes: 45,
      distanceKm: 8,
      targetPace: null,
      rpe: 4,
      description: 'Easy aerobic run.'
    })),
    fourWeekOutlook: Array.from({ length: 4 }, (_, idx) => ({
      week: idx + 1,
      focus: 'Build',
      volumeKm: 30,
      qualitySessions: 2,
      notes: ''
    })),
    keyMetrics: {},
    ...overrides
  };
}

describe('openaiCoach - clampWindowDays', () => {
  it('falls back to default when input is invalid', () => {
    expect(clampWindowDays(undefined)).toBe(7);
    expect(clampWindowDays(null)).toBe(7);
    expect(clampWindowDays('abc')).toBe(7);
    expect(clampWindowDays(0)).toBe(7);
  });

  it('caps the window at 84 days', () => {
    expect(clampWindowDays(200)).toBe(84);
    expect(clampWindowDays('84')).toBe(84);
  });

  it('respects a minimum of 7 days', () => {
    expect(clampWindowDays(3)).toBe(7);
    expect(clampWindowDays(7)).toBe(7);
    expect(clampWindowDays(28)).toBe(28);
  });
});

describe('openaiCoach - buildFallbackWeeklySummary (legacy compat)', () => {
  it('returns structured summary without OpenAI', () => {
    const summary = buildFallbackWeeklySummary({
      user: { goalPaceMinPerKm: 5.5, weeklyTrainingLoadKm: 35 },
      activities: [{ distance: 10000 }, { distance: 8000 }],
      progress: { loadProgressPct: 80, weeklyLoadTargetKm: 35 },
      coachReview: {
        headline: 'Solid week.',
        nextFocus: ['Keep easy days easy.']
      }
    });

    expect(summary.source).toBe('rules');
    expect(summary.headline).toBe('Solid week.');
    expect(summary.summary).toMatch(/2 run/);
    expect(summary.bullets.length).toBeGreaterThan(0);
  });
});

describe('openaiCoach - summarizeReportLegacy', () => {
  it('extracts headline + paragraph + intensity/load bullets from a structured report', () => {
    const analytics = makeAnalytics();
    const report = makeReport();
    const legacy = summarizeReportLegacy(report, analytics);

    expect(legacy.headline).toBe('Solid build week, recovery looks healthy.');
    expect(legacy.summary).toMatch(/ACWR 1\.18/);
    expect(legacy.bullets.some((b) => b.includes('ACWR'))).toBe(true);
    expect(legacy.bullets.some((b) => b.includes('Intensity'))).toBe(true);
    expect(legacy.bullets.some((b) => b.includes('Next session'))).toBe(true);
  });
});

describe('openaiCoach - generateWeeklySummaryReport', () => {
  beforeEach(() => {
    buildAnalytics.mockReset();
    generateReport.mockReset();
  });

  it('routes through analytics + reportService (does not hit OpenAI directly) and returns a structured payload', async () => {
    const analytics = makeAnalytics();
    const report = makeReport();
    buildAnalytics.mockResolvedValue(analytics);
    generateReport.mockResolvedValue(report);

    const result = await generateWeeklySummaryReport({
      userId: 'user-123',
      user: { goalRaceName: '10K' },
      windowDays: 7
    });

    expect(buildAnalytics).toHaveBeenCalledWith('user-123', expect.objectContaining({ windowDays: 7 }));
    expect(generateReport).toHaveBeenCalledWith(analytics, expect.any(Object), expect.any(Object));

    expect(result.windowDays).toBe(7);
    expect(result.analytics).toBe(analytics);
    expect(result.report).toBe(report);
    expect(result.analytics.trainingLoad).toBeDefined();
    expect(Array.isArray(result.report.weeklyPlan)).toBe(true);
    expect(result.report.weeklyPlan.length).toBe(7);
    expect(result.headline).toBe('Solid build week, recovery looks healthy.');
    expect(result.summary).toMatch(/ACWR 1\.18/);
  });

  it('clamps windowDays to the allowed range', async () => {
    buildAnalytics.mockResolvedValue(makeAnalytics({ window: { days: 84, activityCount: 0 } }));
    generateReport.mockResolvedValue(makeReport());

    await generateWeeklySummaryReport({ userId: 'u', windowDays: 999 });

    expect(buildAnalytics).toHaveBeenCalledWith('u', expect.objectContaining({ windowDays: 84 }));
  });
});

describe('openaiCoach - getOrCreateWeeklySummary cache behavior', () => {
  beforeEach(() => {
    Report.findOne.mockReset();
    Report.create.mockReset();
    buildAnalytics.mockReset();
    generateReport.mockReset();
  });

  function mockFindOne(result) {
    Report.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(result)
      })
    });
  }

  it('returns the cached report without calling the report service when within TTL', async () => {
    const analytics = makeAnalytics();
    const report = makeReport({ source: 'openai' });
    const cachedDoc = {
      _id: 'cached-id',
      userId: 'user-1',
      windowDays: 7,
      source: 'openai',
      generatedAt: new Date(),
      analytics,
      report
    };
    mockFindOne(cachedDoc);

    const result = await getOrCreateWeeklySummary({ userId: 'user-1', user: {}, windowDays: 7 });

    expect(Report.findOne).toHaveBeenCalledTimes(1);
    expect(buildAnalytics).not.toHaveBeenCalled();
    expect(generateReport).not.toHaveBeenCalled();
    expect(Report.create).not.toHaveBeenCalled();
    expect(result.fromCache).toBe(true);
    expect(result.id).toBe('cached-id');
    expect(result.analytics).toBe(analytics);
    expect(result.report).toBe(report);
    expect(result.report.weeklyPlan.length).toBe(7);
    expect(result.analytics.trainingLoad).toBeDefined();
    expect(result.summary).toMatch(/ACWR/);
  });

  it('bypasses the cache and regenerates when force=true', async () => {
    const analytics = makeAnalytics();
    const report = makeReport();
    buildAnalytics.mockResolvedValue(analytics);
    generateReport.mockResolvedValue(report);
    Report.create.mockResolvedValue({ _id: 'new-id', generatedAt: new Date() });

    const result = await getOrCreateWeeklySummary({
      userId: 'user-1',
      user: {},
      windowDays: 7,
      force: true
    });

    expect(Report.findOne).not.toHaveBeenCalled();
    expect(buildAnalytics).toHaveBeenCalledTimes(1);
    expect(generateReport).toHaveBeenCalledTimes(1);
    expect(Report.create).toHaveBeenCalledTimes(1);
    expect(result.fromCache).toBe(false);
    expect(result.id).toBe('new-id');
    expect(result.report.weeklyPlan.length).toBe(7);
    expect(result.analytics.trainingLoad).toBeDefined();
  });

  it('falls through to a fresh generation when no cached report is found', async () => {
    mockFindOne(null);
    const analytics = makeAnalytics();
    const report = makeReport();
    buildAnalytics.mockResolvedValue(analytics);
    generateReport.mockResolvedValue(report);
    Report.create.mockResolvedValue({ _id: 'fresh-id', generatedAt: new Date() });

    const result = await getOrCreateWeeklySummary({ userId: 'user-1', user: {}, windowDays: 7 });

    expect(Report.findOne).toHaveBeenCalledTimes(1);
    expect(buildAnalytics).toHaveBeenCalledTimes(1);
    expect(generateReport).toHaveBeenCalledTimes(1);
    expect(Report.create).toHaveBeenCalledTimes(1);
    expect(result.fromCache).toBe(false);
    expect(result.id).toBe('fresh-id');
  });
});
