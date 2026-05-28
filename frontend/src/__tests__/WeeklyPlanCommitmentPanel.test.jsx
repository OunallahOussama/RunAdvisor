import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WeeklyPlanCommitmentPanel from '../components/WeeklyPlanCommitmentPanel';
import { ThemeProvider } from '../context/ThemeContext';
import { usersApi } from '../services/api';

jest.mock('../services/api', () => ({
  usersApi: {
    updateWeeklyPlanCommitment: jest.fn(() => Promise.resolve({ data: { success: true } }))
  }
}));

function renderPanel(props = {}) {
  const onUpdated = jest.fn();
  render(
    <ThemeProvider>
      <WeeklyPlanCommitmentPanel
        reportId="r1"
        generatedAt="2026-05-20T12:00:00.000Z"
        planCommitment={{ needsDecision: true, commitment: null }}
        onUpdated={onUpdated}
        {...props}
      />
    </ThemeProvider>
  );
  return { onUpdated };
}

describe('WeeklyPlanCommitmentPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows follow and decline actions for a new plan', () => {
    renderPanel();
    expect(screen.getByTestId('accept-weekly-plan')).toBeInTheDocument();
    expect(screen.getByTestId('decline-weekly-plan')).toBeInTheDocument();
  });

  it('calls API when user accepts the plan', async () => {
    const { onUpdated } = renderPanel();
    fireEvent.click(screen.getByTestId('accept-weekly-plan'));
    await waitFor(() => expect(usersApi.updateWeeklyPlanCommitment).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'following' })
    ));
    expect(onUpdated).toHaveBeenCalled();
  });
});
