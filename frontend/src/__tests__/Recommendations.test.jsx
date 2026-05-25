import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Recommendations from '../pages/Recommendations';
import { ThemeProvider } from '../context/ThemeContext';
import { AppShellProvider } from '../context/AppShellContext';
import { RunAdvisorProfileProvider } from '../context/RunAdvisorProfileContext';
import { activitiesApi, coachApi } from '../services/api';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query) => ({
      matches: false,
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
  coachApi: {
    weeklySummary: jest.fn()
  },
  recommendationsApi: {
    getCoachReview: jest.fn()
  }
}));

jest.mock('../utils/offlineCache', () => ({
  formatSnapshotTimestamp: jest.fn(() => 'May 12, 2026'),
  loadSnapshot: jest.fn(() => null),
  saveSnapshot: jest.fn()
}));

describe('Recommendations route', () => {
  beforeEach(() => {
    activitiesApi.getActivities.mockResolvedValue({ data: { activities: [] } });
    coachApi.weeklySummary.mockResolvedValue({
      data: {
        success: true,
        analytics: {
          window: { days: 7, activityCount: 0 },
          volume: {},
          pace: {},
          heartRate: {},
          trainingLoad: {},
          intensityDistribution: {}
        },
        report: null
      }
    });
  });

  it('renders the new Home (weekly insight) layout as an alias of /', async () => {
    render(
      <ThemeProvider>
        <AppShellProvider>
          <RunAdvisorProfileProvider enabled={false}>
            <MemoryRouter>
              <Recommendations />
            </MemoryRouter>
          </RunAdvisorProfileProvider>
        </AppShellProvider>
      </ThemeProvider>
    );

    expect(await screen.findByTestId('today-hero')).toBeInTheDocument();
    await waitFor(() => expect(coachApi.weeklySummary).toHaveBeenCalled());
    await waitFor(() => expect(activitiesApi.getActivities).toHaveBeenCalled());
  });
});
