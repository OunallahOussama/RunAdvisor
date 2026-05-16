import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { activitiesApi, recommendationsApi } from '../services/api';
import { ThemeProvider } from '../context/ThemeContext';
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
    getWeeklySummary: jest.fn()
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

function renderWithProviders(ui) {
  return render(
    <ThemeProvider>
      <RunAdvisorProfileProvider enabled={false}>
        <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>{ui}</MemoryRouter>
      </RunAdvisorProfileProvider>
    </ThemeProvider>
  );
}

describe('Dashboard page', () => {
  beforeEach(() => {
    recommendationsApi.getCoachReview.mockResolvedValue({ data: { trainingProgress: null } });
    activitiesApi.getWeeklySummary.mockResolvedValue({
      data: {
        summary: {
          activityCount: 4,
          avgHeartRate: 148,
          avgPace: 5.2,
          totalDistance: 32.4,
          totalDuration: 210,
          totalElevation: 460
        }
      }
    });
  });

  it('renders the compact overview without the old welcome hero copy', async () => {
    renderWithProviders(<Dashboard />);

    expect(await screen.findByRole('heading', { name: /Weekly training overview/i })).toBeInTheDocument();
    expect(await screen.findByText(/Weekly data loaded/i)).toBeInTheDocument();
    expect(screen.getAllByText(/32\.4 km/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4 sessions logged/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Open training review/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Training command center/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Welcome to RunAdvisor/i)).not.toBeInTheDocument();
  });
});
