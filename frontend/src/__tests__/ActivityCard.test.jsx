import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders summary information and toggles details', () => {
    const onDelete = jest.fn();
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ActivityCard activity={sampleActivity} onDelete={onDelete} />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Morning Run/i)).toBeInTheDocument();
    expect(screen.getByText(/5.00 km/)).toBeInTheDocument();
    expect(screen.getByText(/View details/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open full page/i })).toHaveAttribute('href', '/activities/abc123');

    fireEvent.click(screen.getByText(/View details/i));
    expect(screen.getByText(/Felt strong on the final kilometer/i)).toBeInTheDocument();
  });
});
