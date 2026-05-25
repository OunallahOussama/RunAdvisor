import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ActivityCard from '../components/ActivityCard';
import { ThemeProvider } from '../context/ThemeContext';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  })
});

describe('ActivityCard', () => {
  const sampleActivity = {
    _id: 'abc123',
    name: 'Morning Run',
    type: 'run',
    distance: 5000,
    movingTime: 1800,
    pace: 5.6,
    elevationGain: 85,
    avgHeartRate: 150,
    date: new Date('2026-05-01').toISOString(),
    notes: 'Felt strong on the final kilometer.'
  };

  it('renders summary and links to the activity page', () => {
    const onDelete = jest.fn();
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ActivityCard activity={sampleActivity} onDelete={onDelete} />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Morning Run/i)).toBeInTheDocument();
    expect(screen.getByText(/5 km/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Morning Run/i })).toHaveAttribute('href', '/activities/abc123');
    expect(screen.queryByText(/Details/i)).not.toBeInTheDocument();
  });
});
