import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import CoachChatWidget from '../components/coach/CoachChatWidget';

jest.mock('../hooks/useCoachChat', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../services/api', () => ({
  coachChatApi: {},
  notificationsApi: {},
  COACH_NOTIFICATION_TYPES: ['coach_nudge', 'coach_session_ready', 'weekly_report_ready']
}));

const useCoachChat = require('../hooks/useCoachChat').default;

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

function renderWidget(overrides = {}) {
  useCoachChat.mockReturnValue({
    open: false,
    openPanel: jest.fn(),
    closePanel: jest.fn(),
    context: null,
    messages: [],
    loadingContext: false,
    loadingHistory: false,
    sending: false,
    error: null,
    badgeCount: 0,
    sendMessage: jest.fn(),
    retry: jest.fn(),
    suggestedPrompts: [
      'How was my last run?',
      'What should I improve?',
      'Explain my effort level'
    ],
    ...overrides
  });

  return render(
    <ThemeProvider>
      <CoachChatWidget enabled />
    </ThemeProvider>
  );
}

describe('CoachChatWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders FAB when collapsed', () => {
    renderWidget();
    expect(screen.getByTestId('coach-chat-fab')).toBeInTheDocument();
    expect(screen.getByLabelText(/open coach chat/i)).toBeInTheDocument();
  });

  it('opens panel and shows suggested prompts in empty state', async () => {
    const openPanel = jest.fn();
    renderWidget({
      open: true,
      openPanel,
      context: { lastSession: null },
      messages: []
    });

    expect(screen.getByTestId('coach-chat-widget')).toBeInTheDocument();
    expect(screen.getByText(/Running Coach/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('coach-suggested-prompt').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/How was my last run/i)).toBeInTheDocument();
  });

  it('calls openPanel when FAB is clicked', () => {
    const openPanel = jest.fn();
    renderWidget({ openPanel });

    fireEvent.click(screen.getByTestId('coach-chat-fab'));
    expect(openPanel).toHaveBeenCalled();
  });

  it('shows badge count on FAB', () => {
    renderWidget({ badgeCount: 2 });
    expect(screen.getByLabelText(/2 unread/i)).toBeInTheDocument();
  });

  it('sends message when suggested prompt is clicked', async () => {
    const sendMessage = jest.fn();
    renderWidget({
      open: true,
      sendMessage,
      messages: []
    });

    fireEvent.click(screen.getByText(/What should I improve/i));
    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith('What should I improve?');
    });
  });
});
