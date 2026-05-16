import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SemanticSearchBar from '../components/SemanticSearchBar';
import { ThemeProvider } from '../context/ThemeContext';
import { coachApi } from '../services/api';

jest.mock('../services/api', () => ({
  coachApi: {
    semanticSearch: jest.fn()
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

describe('SemanticSearchBar', () => {
  beforeEach(() => {
    coachApi.semanticSearch.mockResolvedValue({
      data: {
        results: [
          { activityId: '1', name: 'Hill tempo', score: 0.88, distanceKm: '8.00' }
        ]
      }
    });
  });

  it('submits search and shows results', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <SemanticSearchBar />
        </MemoryRouter>
      </ThemeProvider>
    );

    fireEvent.change(screen.getByLabelText(/Search your runs/i), {
      target: { value: 'hilly tempo' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => {
      expect(screen.getByText(/Hill tempo/i)).toBeInTheDocument();
    });
  });
});
