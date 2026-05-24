import { renderHook, act, waitFor } from '@testing-library/react';
import useCoachChat from '../hooks/useCoachChat';
import { coachChatApi, notificationsApi } from '../services/api';

jest.mock('../services/api', () => ({
  coachChatApi: {
    getContext: jest.fn(),
    getHistory: jest.fn(),
    sendMessage: jest.fn(),
    markCoachNotificationsRead: jest.fn()
  },
  notificationsApi: {
    list: jest.fn()
  },
  COACH_NOTIFICATION_TYPES: ['coach_nudge', 'coach_session_ready', 'weekly_report_ready']
}));

describe('useCoachChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationsApi.list.mockResolvedValue({ data: { notifications: [] } });
    coachChatApi.getContext.mockResolvedValue({
      data: { success: true, suggestedPrompts: ['How was my last run?'] }
    });
    coachChatApi.getHistory.mockResolvedValue({ data: { success: true, messages: [] } });
    coachChatApi.markCoachNotificationsRead.mockResolvedValue({ data: { success: true } });
  });

  it('appends assistant reply from messages on successful send', async () => {
    coachChatApi.sendMessage.mockResolvedValue({
      data: {
        success: true,
        reply: 'Nice controlled effort.',
        messages: [
          { id: '1', role: 'user', content: 'Hello', createdAt: '2026-05-24T10:00:00.000Z' },
          { id: '2', role: 'assistant', content: 'Nice controlled effort.', createdAt: '2026-05-24T10:00:01.000Z' }
        ]
      }
    });

    const { result } = renderHook(() => useCoachChat({ enabled: true }));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    await waitFor(() => {
      expect(result.current.sending).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Nice controlled effort.'
    });
    expect(result.current.error).toBeNull();
  });

  it('shows assistant fallback when reply is present but messages array is empty', async () => {
    coachChatApi.sendMessage.mockResolvedValue({
      data: {
        success: true,
        reply: 'Coach fallback reply',
        messages: []
      }
    });

    const { result } = renderHook(() => useCoachChat({ enabled: true }));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    await waitFor(() => {
      expect(result.current.messages.some((m) => m.role === 'assistant')).toBe(true);
    });

    expect(result.current.messages.find((m) => m.role === 'assistant')?.content).toBe('Coach fallback reply');
  });

  it('surfaces network errors with a helpful message', async () => {
    coachChatApi.sendMessage.mockRejectedValue({ response: undefined, message: 'Network Error' });

    const { result } = renderHook(() => useCoachChat({ enabled: true }));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.error).toMatch(/Could not reach server/i);
  });

  it('surfaces 401 errors', async () => {
    coachChatApi.sendMessage.mockRejectedValue({
      response: { status: 401, data: { error: 'Invalid token' } }
    });

    const { result } = renderHook(() => useCoachChat({ enabled: true }));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.error).toMatch(/sign in/i);
  });

  it('surfaces 429 rate limit errors', async () => {
    coachChatApi.sendMessage.mockRejectedValue({
      response: {
        status: 429,
        data: { error: 'Rate limit exceeded', message: 'Too many messages' }
      }
    });

    const { result } = renderHook(() => useCoachChat({ enabled: true }));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.error).toMatch(/too many|rate limit|later/i);
  });

  it('stores richContent on assistant message from send response', async () => {
    coachChatApi.sendMessage.mockResolvedValue({
      data: {
        success: true,
        reply: 'Here is your report.',
        source: 'rules',
        richContent: {
          type: 'report_summary',
          data: { headline: 'Solid week', readinessPhase: 'build' }
        },
        messages: [
          { id: '1', role: 'user', content: 'Show my weekly report', createdAt: '2026-05-24T10:00:00.000Z' },
          {
            id: '2',
            role: 'assistant',
            content: 'Here is your report.',
            richContent: {
              type: 'report_summary',
              data: { headline: 'Solid week', readinessPhase: 'build' }
            },
            createdAt: '2026-05-24T10:00:01.000Z'
          }
        ]
      }
    });

    const { result } = renderHook(() => useCoachChat({ enabled: true }));

    await act(async () => {
      await result.current.sendMessage('Show my weekly report');
    });

    await waitFor(() => {
      expect(result.current.sending).toBe(false);
    });

    expect(result.current.messages[1].richContent).toEqual({
      type: 'report_summary',
      data: { headline: 'Solid week', readinessPhase: 'build' }
    });
  });
});
