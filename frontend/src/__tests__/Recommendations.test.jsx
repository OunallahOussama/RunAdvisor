import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Recommendations from '../pages/Recommendations';

jest.mock('../services/api', () => ({
  recommendationsApi: {
    getRecommendations: jest.fn(() => Promise.resolve({ data: { recommendations: [] } }))
  }
}));

describe('Recommendations page', () => {
  it('renders the recommendations page and race form', async () => {
    render(<Recommendations />);
    expect(screen.getByText(/Training Recommendations/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Next race name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Race distance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Race date/i)).toBeInTheDocument();
  });
});
