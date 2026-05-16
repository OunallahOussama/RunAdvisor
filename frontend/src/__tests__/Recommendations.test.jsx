import React from 'react';
import { render, screen } from '@testing-library/react';
import Recommendations from '../pages/Recommendations';
import { ThemeProvider } from '../context/ThemeContext';

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

jest.mock('../components/TrainingTrendChart', () => () => <div>Trend chart</div>);
jest.mock('../components/TrainingMetricsCharts', () => () => <div>Metrics charts</div>);
jest.mock('../services/api', () => ({
  recommendationsApi: {
    getRecommendations: jest.fn(() => Promise.resolve()),
    getCoachReview: jest.fn(() => Promise.resolve()),
    updateRecommendation: jest.fn()
  }
}));

describe('Recommendations page', () => {
  it('renders the coach review page and race form', async () => {
    render(
      <ThemeProvider>
        <Recommendations />
      </ThemeProvider>
    );

    expect(await screen.findByText(/Coach Review & Recommendations/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Next race name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Race distance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Race date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh coach review/i })).toBeInTheDocument();
    expect(await screen.findByText(/Recommendations status/i)).toBeInTheDocument();
  });
});
