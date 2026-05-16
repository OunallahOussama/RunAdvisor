import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../pages/AdminDashboard';
import { ThemeProvider } from '../context/ThemeContext';

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

const mockGetMe = jest.fn();
const mockGetOverview = jest.fn();
const mockGetInsights = jest.fn();
const mockGetUsage = jest.fn();

jest.mock('../services/api', () => ({
  adminApi: {
    getMe: (...args) => mockGetMe(...args),
    getOverview: (...args) => mockGetOverview(...args),
    getInsights: (...args) => mockGetInsights(...args),
    getUsage: (...args) => mockGetUsage(...args)
  }
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    mockGetMe.mockResolvedValue({ data: { isAdmin: true, email: 'admin@runadvisor.fit' } });
    mockGetOverview.mockResolvedValue({
      data: {
        overview: {
          totals: { users: 10, activities: 50, stravaConnected: 8 },
          activity: {
            requestsWindow: 200,
            activeUsers: 4,
            newUsers: 2,
            newActivities: 12,
            requests24h: 40,
            errorRatePct: 1.5,
            clientErrors: 2,
            serverErrors: 1
          },
          usageByEvent: [{ event: 'api_request', count: 100, uniqueUsers: 5, avgDurationMs: 45 }],
          dailySeries: [{ date: '2026-05-10', requests: 40, errors: 1 }],
          generatedAt: new Date().toISOString()
        }
      }
    });
    mockGetInsights.mockResolvedValue({
      data: {
        insights: {
          latency: { avgMs: 120, maxMs: 900 },
          serverErrors7d: 0,
          slowRequests: [],
          topPaths: [{ path: '/api/activities', count: 12 }],
          statusBreakdown: [{ bucket: '2xx', count: 180 }]
        }
      }
    });
    mockGetUsage.mockResolvedValue({ data: { events: [] } });
  });

  it('renders metrics for admin users', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(await screen.findByText(/Admin · Metrics & usage/i)).toBeInTheDocument();
    expect(await screen.findByText('10')).toBeInTheDocument();
  });
});
