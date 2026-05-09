import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ActivityCard from '../components/ActivityCard';

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
    render(<ActivityCard activity={sampleActivity} onDelete={onDelete} />);

    expect(screen.getByText(/Morning Run/i)).toBeInTheDocument();
    expect(screen.getByText(/5.00 km/)).toBeInTheDocument();
    expect(screen.getByText(/View details/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/View details/i));
    expect(screen.getByText(/Felt strong on the final kilometer/i)).toBeInTheDocument();
  });
});
