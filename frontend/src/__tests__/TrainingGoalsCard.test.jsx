import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrainingGoalsCard from '../components/TrainingGoalsCard';

describe('TrainingGoalsCard', () => {
  it('shows monthly ring and next objectives', () => {
    render(
      <MemoryRouter>
        <TrainingGoalsCard
          progress={{
            month: {
              currentKm: 50,
              goalKm: 100,
              percent: 50,
              runCount: 6,
              trainingLoad: 58,
              onTrack: true,
              daysLeftInMonth: 10,
              remainingKm: 50
            },
            year: { currentKm: 200, goalKm: 500, percent: 40 },
            week: { currentKm: 20, goalKm: 30, percent: 67 },
            gamification: { level: 5, title: 'Committed', xpInLevel: 10, xpToNextLevel: 50, xpPercent: 20 },
            challenges: [
              {
                id: '1',
                kind: 'monthly_km',
                title: 'May miles',
                percent: 50,
                status: 'active',
                detail: '50 / 80 km'
              }
            ],
            nextObjectives: ['Log 50 km more this month.'],
            personalRecords: { longestRunKm: 18, fastestPaceMinPerKm: 5.1 },
            racePrediction: { predictedFinishTimeLabel: '48:00', predictedPaceMinPerKm: 4.8 }
          }}
          loading={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId('training-goals-card')).toBeInTheDocument();
    expect(screen.getByTestId('month-progress-ring')).toBeInTheDocument();
    expect(screen.getByTestId('next-objectives')).toHaveTextContent('50 km');
    expect(screen.getByText(/Race outlook/)).toBeInTheDocument();
  });
});
