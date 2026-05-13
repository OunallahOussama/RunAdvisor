import React from 'react';
import { render, screen } from '@testing-library/react';
import Recommendations from '../pages/Recommendations';

jest.mock('../components/TrainingTrendChart', () => () => <div>Trend chart</div>);
jest.mock('../services/api', () => ({
  recommendationsApi: {
    getRecommendations: jest.fn(() => Promise.resolve()),
    getCoachReview: jest.fn(() => Promise.resolve()),
    updateRecommendation: jest.fn()
  }
}));

describe('Recommendations page', () => {
  it('renders the coach review page and race form', async () => {
    render(<Recommendations />);

    expect(await screen.findByText(/Coach Review & Recommendations/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Next race name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Race distance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Race date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh coach review/i })).toBeInTheDocument();
    expect(await screen.findByText(/Recommendations status/i)).toBeInTheDocument();
  });
});
