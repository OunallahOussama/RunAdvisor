import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SimilarRunsPanel from '../components/SimilarRunsPanel';
import { ThemeProvider } from '../context/ThemeContext';
import { activitiesApi } from '../services/api';

jest.mock('../services/api', () => ({
  activitiesApi: {
    getSimilarActivities: jest.fn()
  }
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {}
    })
  });
});

describe('SimilarRunsPanel', () => {
  beforeEach(() => {
    activitiesApi.getSimilarActivities.mockResolvedValue({
      data: {
        similarActivities: [
          {
            activityId: 'b2',
            name: 'Similar tempo',
            date: new Date().toISOString(),
            distanceKm: '10.00',
            pace: 5.1,
            similarity: 0.92
          }
        ],
        segmentMatches: [],
        insight: { summary: 'Even pacing across the run.', highlights: ['Even pacing'] }
      }
    });
  });

  it('shows similar runs when data is available', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <SimilarRunsPanel activityId="a1" />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(await screen.findByText(/Similar runs/i)).toBeInTheDocument();
    expect(await screen.findByText(/Similar tempo/i)).toBeInTheDocument();
    expect(screen.getByText(/92%/)).toBeInTheDocument();
  });
});
