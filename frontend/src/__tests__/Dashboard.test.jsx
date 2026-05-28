import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { activitiesApi, coachApi, trainingApi } from '../services/api';
import { ThemeProvider } from '../context/ThemeContext';
import { AppShellProvider } from '../context/AppShellContext';
import { RunAdvisorProfileProvider } from '../context/RunAdvisorProfileContext';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query) => ({
      matches: query.includes('light'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {}
    })
  });
});

jest.mock('../services/api', () => ({
  activitiesApi: {
    getActivities: jest.fn()
  },
  recommendationsApi: {
    getCoachReview: jest.fn()
  },
  coachApi: {
    weeklySummary: jest.fn()
  },
  trainingApi: {
    getProgress: jest.fn()
  }
}));

jest.mock('../utils/offlineCache', () => ({
  formatSnapshotTimestamp: jest.fn(() => 'May 12, 2026'),
  loadSnapshot: jest.fn(() => null),
  saveSnapshot: jest.fn()
}));

function buildWeeklyReport(overrides = {}) {
  return {
    success: true,
    fromCache: false,
    id: 'report-1',
    windowDays: 7,
    generatedAt: new Date().toISOString(),
    source: 'fallback',
    analytics: {
      window: { days: 7, activityCount: 4 },
      volume: {
        totalDistanceKm: 32.4,
        totalMovingMinutes: 188,
        runsPerWeek: 4,
        avgDistanceKm: 8.1,
        longestRunKm: 14.5,
        totalElevationM: 320
      },
      pace: { avgPaceMinPerKm: 5.2, fastestPaceMinPerKm: 4.4 },
      heartRate: { avgHeartRate: 148 },
      intensityDistribution: { easy: 72, tempo: 14, threshold: 10, vo2: 4 },
      trainingLoad: { weeklyLoad: 285, acwr: 1.18, monotony: 1.4, strain: 399 },
      trends: { distanceDeltaPctWoW: 8, paceDeltaSecPerKmWoW: -12 },
      dataQuality: { hasHeartRate: true, hasSplits: true, hasPower: false }
    },
    report: {
      generatedAt: new Date().toISOString(),
      source: 'fallback',
      executiveSummary: {
        headline: 'Solid build week, recovery looks healthy.',
        readinessPhase: 'build',
        paragraph: 'You ran 4 times for 32.4 km. ACWR 1.18 is in a healthy build zone.',
        goalRace: null
      },
      workloadAnalysis: { paragraph: 'Workload looks balanced.', flags: [], acwr: 1.18, monotony: 1.4, strain: 399 },
      paceEffortAnalysis: { paragraph: '', intensityComment: '' },
      splitAnalysis: { paragraph: '', activities: [] },
      riskAndRecovery: { paragraph: '', injuryRiskLevel: 'low', recoveryActions: [] },
      nextSessionDetail: {
        title: 'Tempo intervals',
        objective: 'Boost lactate threshold without crossing into VO2 work.',
        durationMinutes: 50,
        warmup: { durationMinutes: 15, description: 'Easy jog', targetPace: null, hrZone: 'Z2' },
        mainSet: { durationMinutes: 25, description: '3x8 min tempo', targetPace: null, hrZone: 'Z3-Z4', rpe: 7 },
        cooldown: { durationMinutes: 10, description: 'Easy jog', targetPace: null, hrZone: 'Z1-Z2' }
      },
      planPeriod: {
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        basedOnLastDays: 7,
        rollingDays: 7
      },
      weeklyPlan: [
        { day: 1, sessionType: 'easy_run', title: 'Easy aerobic run', durationMinutes: 45, distanceKm: 7, rpe: 4, description: 'Easy.' },
        { day: 2, sessionType: 'rest_or_xt', title: 'Rest', durationMinutes: 30, distanceKm: 0, rpe: 2, description: 'Rest day.' },
        { day: 3, sessionType: 'tempo', title: 'Tempo intervals', durationMinutes: 50, distanceKm: 8, rpe: 7, description: '3x8 tempo.' },
        { day: 4, sessionType: 'easy_run', title: 'Recovery jog', durationMinutes: 35, distanceKm: 5, rpe: 3, description: 'Easy.' },
        { day: 5, sessionType: 'threshold', title: 'Threshold', durationMinutes: 55, distanceKm: 9, rpe: 8, description: '4x1km.' },
        { day: 6, sessionType: 'easy_run', title: 'Easy + strides', durationMinutes: 40, distanceKm: 6, rpe: 4, description: 'Easy.' },
        { day: 7, sessionType: 'long_run', title: 'Long run', durationMinutes: 90, distanceKm: 16, rpe: 5, description: 'Steady.' }
      ],
      fourWeekOutlook: [],
      keyMetrics: {}
    },
    summary: 'You ran 4 times for 32.4 km. ACWR 1.18 is in a healthy build zone.',
    headline: 'Solid build week, recovery looks healthy.',
    bullets: ['Logged 4 run(s) for 32.4 km in the last 7 day(s).'],
    loadRisk: null,
    ...overrides
  };
}

function renderWithProviders(ui) {
  return render(
    <ThemeProvider>
      <AppShellProvider>
        <RunAdvisorProfileProvider enabled={false}>
          <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>{ui}</MemoryRouter>
        </RunAdvisorProfileProvider>
      </AppShellProvider>
    </ThemeProvider>
  );
}

describe('Home (Dashboard) page', () => {
  beforeEach(() => {
    activitiesApi.getActivities.mockResolvedValue({ data: { activities: [] } });
    coachApi.weeklySummary.mockResolvedValue({ data: buildWeeklyReport() });
    trainingApi.getProgress.mockResolvedValue({
      data: {
        progress: {
          month: { currentKm: 40, goalKm: 100, percent: 40, runCount: 4, trainingLoad: 46, onTrack: true, daysLeftInMonth: 8, remainingKm: 60 },
          year: { currentKm: 200, goalKm: 0, percent: null },
          week: { currentKm: 32, goalKm: 30, percent: 100 },
          gamification: { level: 5, title: 'Committed', xpInLevel: 0, xpToNextLevel: 50, xpPercent: 0 },
          challenges: [],
          nextObjectives: ['Set a monthly km goal in Profile.'],
          personalRecords: { longestRunKm: 14.5, fastestPaceMinPerKm: 4.4 },
          racePrediction: null
        }
      }
    });
  });

  it('renders compact weekly insight with headline, plan, and stats link', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(coachApi.weeklySummary).toHaveBeenCalled());

    expect(coachApi.weeklySummary).toHaveBeenCalledWith({ windowDays: 7, force: false });

    expect(
      await screen.findByRole('heading', { name: /Solid build week, recovery looks healthy/i })
    ).toBeInTheDocument(); // Today hero headline (h2)
    expect(screen.getByTestId('readiness-phase-chip')).toHaveTextContent(/build/i);
    expect(screen.getAllByText(/You ran 4 times for 32\.4 km/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Easy aerobic run/i).length).toBeGreaterThan(0);

    expect(await screen.findByTestId('training-plan-offer')).toBeInTheDocument();

    const statsLink = screen.getByRole('link', { name: /All stats/i });
    expect(statsLink.getAttribute('href')).toMatch(/\/training-report/);
  });

  it('shows the Today hero with status, next session, and recent feed', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(coachApi.weeklySummary).toHaveBeenCalled());

    expect(await screen.findByTestId('training-status-banner')).toBeInTheDocument();
    expect(screen.getByText(/Productive/i)).toBeInTheDocument();
    expect(screen.getByTestId('today-hero')).toBeInTheDocument();
    expect(screen.getAllByText(/Easy aerobic run/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('home-recent-feed')).toBeInTheDocument();
    expect(screen.getByTestId('training-goals-card')).toBeInTheDocument();
  });
});
