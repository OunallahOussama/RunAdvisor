import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import RollingTrainingPlanCard from '../components/RollingTrainingPlanCard';

const plan = [
  { day: 1, sessionType: 'easy_run', title: 'Easy run', durationMinutes: 45, distanceKm: 7, description: 'Easy.' },
  { day: 2, sessionType: 'rest_or_xt', title: 'Rest', durationMinutes: 0, distanceKm: 0, description: 'Rest.' },
  { day: 3, sessionType: 'tempo', title: 'Tempo', durationMinutes: 50, distanceKm: 8, description: 'Tempo work.' }
];

function renderCard(props = {}) {
  return render(
    <ThemeProvider>
      <RollingTrainingPlanCard
        weeklyPlan={plan}
        planStartDate="2026-05-20T12:00:00.000Z"
        planPeriod={{
          startsAt: '2026-05-20T12:00:00.000Z',
          endsAt: '2026-05-27T12:00:00.000Z',
          basedOnLastDays: 7
        }}
        phase="build"
        reportId="r1"
        generatedAt="2026-05-20T12:00:00.000Z"
        planCommitment={{ needsDecision: true, commitment: null }}
        {...props}
      />
    </ThemeProvider>
  );
}

describe('RollingTrainingPlanCard', () => {
  it('shows offer teaser with key plan elements', () => {
    renderCard();
    expect(screen.getByTestId('training-plan-offer')).toBeInTheDocument();
    expect(
      screen.getByText(/fits the key elements of your training plan/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Easy aerobic base/i)).toBeInTheDocument();
    expect(screen.queryByTestId('weekly-plan-day')).not.toBeInTheDocument();
  });

  it('opens detail dialog with session list and accept actions', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /View training plan details/i }));
    expect(screen.getByTestId('training-plan-detail-dialog')).toBeInTheDocument();
    expect(screen.getAllByTestId('training-plan-session').length).toBeGreaterThan(0);
    expect(screen.getByTestId('accept-weekly-plan')).toBeInTheDocument();
    expect(screen.getByTestId('decline-weekly-plan')).toBeInTheDocument();
  });
});
