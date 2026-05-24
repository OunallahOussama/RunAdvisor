import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OnboardingStepper from '../components/onboarding/OnboardingStepper';
import { ThemeProvider } from '../context/ThemeContext';
import { usersApi } from '../services/api';

beforeAll(() => {
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
});

jest.mock('../services/api', () => ({
  usersApi: {
    updateConsent: jest.fn(() => Promise.resolve({ data: {} })),
    completeOnboarding: jest.fn(() => Promise.resolve({ data: {} }))
  },
  coachApi: {
    weeklySummary: jest.fn(() => Promise.resolve({ data: {} }))
  }
}));

function renderStepper(props = {}) {
  const onComplete = jest.fn();
  const onSkip = jest.fn();
  render(
    <ThemeProvider>
      <MemoryRouter>
        <OnboardingStepper open user={{ name: 'Test Runner' }} onComplete={onComplete} onSkip={onSkip} {...props} />
      </MemoryRouter>
    </ThemeProvider>
  );
  return { onComplete, onSkip };
}

describe('OnboardingStepper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the welcome step first', () => {
    renderStepper();
    expect(screen.getByText(/Welcome to RunAdvisor/i)).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-next')).toBeEnabled();
  });

  it('advances through the steps when Continue is clicked', () => {
    renderStepper();
    const next = screen.getByTestId('onboarding-next');
    fireEvent.click(next);
    expect(screen.getByRole('button', { name: /Open Strava connect/i })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('onboarding-next'));
    expect(screen.getByText(/What are you training for/i)).toBeInTheDocument();
  });

  it('calls completeOnboarding (without runningGoal) and invokes onSkip when Skip is clicked', async () => {
    const { onSkip } = renderStepper();
    fireEvent.click(screen.getByTestId('onboarding-skip'));
    await waitFor(() => expect(usersApi.completeOnboarding).toHaveBeenCalled());
    expect(onSkip).toHaveBeenCalled();
  });
});
