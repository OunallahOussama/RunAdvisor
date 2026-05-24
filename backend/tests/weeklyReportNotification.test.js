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

jest.mock('../services/notificationService', () => ({
  createNotification: jest.fn()
}));

const Report = require('../models/Report');
const { buildAnalytics } = require('../services/analyticsService');
const { generateReport } = require('../services/reportService');
const { createNotification } = require('../services/notificationService');
const { getOrCreateWeeklySummary } = require('../services/openaiCoach');

function makeAnalytics() {
  return {
    window: { days: 7, activityCount: 4 },
    volume: { totalDistanceKm: 32.4, runsPerWeek: 4, avgDistanceKm: 8, longestRunKm: 14, totalMovingMinutes: 200, totalElevationM: 200 },
    pace: { avgPaceMinPerKm: 5.2, fastestPaceMinPerKm: 4.4 },
    heartRate: { avgHeartRate: 148 },
    intensityDistribution: { easy: 70, tempo: 15, threshold: 10, vo2: 5 },
    trainingLoad: { weeklyLoad: 280, acwr: 1.1, monotony: 1.3, strain: 350 },
    trends: { distanceDeltaPctWoW: 8 },
    perActivity: [],
    dataQuality: { hasHeartRate: true, hasSplits: false, hasPower: false }
  };
}

function makeReport() {
  return {
    source: 'fallback',
    executiveSummary: {
      headline: 'Solid build week.',
      readinessPhase: 'build',
      paragraph: 'You ran 4 times for 32.4 km.',
      goalRace: null
    },
    workloadAnalysis: { paragraph: '', flags: [] },
    paceEffortAnalysis: { paragraph: '', intensityComment: '' },
    splitAnalysis: { paragraph: '', activities: [] },
    riskAndRecovery: { paragraph: '', injuryRiskLevel: 'low', recoveryActions: [] },
    nextSessionDetail: {
      title: 'Tempo intervals',
      objective: '',
      durationMinutes: 50,
      warmup: { durationMinutes: 15, description: '', targetPace: null, hrZone: 'Z2' },
      mainSet: { durationMinutes: 25, description: '', targetPace: null, hrZone: 'Z3', rpe: 7 },
      cooldown: { durationMinutes: 10, description: '', targetPace: null, hrZone: 'Z1' }
    },
    weeklyPlan: Array.from({ length: 7 }, (_, idx) => ({
      day: idx + 1, sessionType: 'easy_run', title: 'Easy', durationMinutes: 40, distanceKm: 6, rpe: 4, description: ''
    })),
    fourWeekOutlook: [],
    keyMetrics: {}
  };
}

describe('weekly summary -> notification enqueue', () => {
  beforeEach(() => {
    Report.findOne.mockReset();
    Report.create.mockReset();
    buildAnalytics.mockReset();
    generateReport.mockReset();
    createNotification.mockReset();
  });

  it('emits weekly_report_ready and coach_nudge when a fresh report is generated', async () => {
    buildAnalytics.mockResolvedValue(makeAnalytics());
    generateReport.mockResolvedValue(makeReport());
    Report.create.mockResolvedValue({ _id: 'report-99', generatedAt: new Date() });

    await getOrCreateWeeklySummary({
      userId: 'user-9',
      user: { consent: { notifications: { weeklyReport: true, recommendations: true } } },
      windowDays: 7,
      force: true
    });

    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(createNotification).toHaveBeenCalledWith('user-9', expect.objectContaining({
      type: 'weekly_report_ready',
      severity: 'success'
    }));
    expect(createNotification).toHaveBeenCalledWith('user-9', expect.objectContaining({
      type: 'coach_nudge',
      severity: 'info'
    }));
  });

  it('skips weekly report notification but still emits coach nudge when weekly report opted out', async () => {
    buildAnalytics.mockResolvedValue(makeAnalytics());
    generateReport.mockResolvedValue(makeReport());
    Report.create.mockResolvedValue({ _id: 'report-100', generatedAt: new Date() });

    await getOrCreateWeeklySummary({
      userId: 'user-10',
      user: { consent: { notifications: { weeklyReport: false, recommendations: true } } },
      windowDays: 7,
      force: true
    });

    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith('user-10', expect.objectContaining({
      type: 'coach_nudge'
    }));
  });

  it('skips all notifications when user opted out of recommendations', async () => {
    buildAnalytics.mockResolvedValue(makeAnalytics());
    generateReport.mockResolvedValue(makeReport());
    Report.create.mockResolvedValue({ _id: 'report-101', generatedAt: new Date() });

    await getOrCreateWeeklySummary({
      userId: 'user-10b',
      user: { consent: { notifications: { weeklyReport: false, recommendations: false } } },
      windowDays: 7,
      force: true
    });

    expect(createNotification).not.toHaveBeenCalled();
  });

  it('does not emit notification for a cache hit', async () => {
    const cachedReport = makeReport();
    Report.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'cached',
          windowDays: 7,
          source: 'openai',
          generatedAt: new Date(),
          analytics: makeAnalytics(),
          report: cachedReport
        })
      })
    });

    await getOrCreateWeeklySummary({
      userId: 'user-11',
      user: { consent: { notifications: { weeklyReport: true } } },
      windowDays: 7
    });

    expect(createNotification).not.toHaveBeenCalled();
  });
});
