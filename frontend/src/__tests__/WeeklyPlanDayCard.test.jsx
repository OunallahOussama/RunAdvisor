import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WeeklyPlanDayCard from '../components/WeeklyPlanDayCard';
import { ThemeProvider } from '../context/ThemeContext';

jest.mock('../services/api', () => ({
  stravaApi: {
    logWorkout: jest.fn()
  }
}));

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

const sampleDay = {
  day: 1,
  sessionType: 'tempo',
  title: 'Tempo intervals',
  durationMinutes: 50,
  distanceKm: 8,
  rpe: 7,
  description: '15 min WU + 3 × 8 min @ tempo / 2 min jog + 10 min CD.',
  targetPace: { label: '4:45 – 5:00 /km', lowerMinPerKm: 4.75, upperMinPerKm: 5.0 }
};

function renderCard(props = {}) {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <ThemeProvider>
        <WeeklyPlanDayCard
          day={sampleDay}
          dayIndex={0}
          dayLabel="Mon"
          planStartDate="2026-05-24T12:00:00.000Z"
          stravaConnected={false}
          {...props}
        />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('WeeklyPlanDayCard', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) }
    });
  });

  it('renders compact day tile with session summary', () => {
    renderCard();
    expect(screen.getByTestId('weekly-plan-day')).toBeInTheDocument();
    expect(screen.getByText(/Tempo intervals/i)).toBeInTheDocument();
    expect(screen.getByText(/50 min/i)).toBeInTheDocument();
    expect(screen.getByText(/RPE 7/i)).toBeInTheDocument();
  });

  it('opens detail dialog on click and copies workout text', async () => {
    renderCard();
    fireEvent.click(screen.getByText(/Tempo intervals/i));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/15 min WU \+ 3 × 8 min/i)).toBeInTheDocument();
    expect(screen.getByText(/4:45 – 5:00 \/km/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/copy full workout text/i));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
    const copied = navigator.clipboard.writeText.mock.calls[0][0];
    expect(copied).toMatch(/Tempo intervals/);
    expect(copied).toMatch(/RunAdvisor/);
    expect(await screen.findByLabelText(/copy full workout text/i)).toBeInTheDocument();
    expect(screen.getByText(/Copied/i)).toBeInTheDocument();
  });
});
