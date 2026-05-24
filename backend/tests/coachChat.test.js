jest.mock('../models/Activity', () => ({
  findOne: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/Report', () => ({
  findOne: jest.fn()
}));

jest.mock('../models/CoachChat', () => ({
  findOne: jest.fn()
}));

jest.mock('../models/Notification', () => ({
  countDocuments: jest.fn()
}));

jest.mock('openai', () => jest.fn());

const Activity = require('../models/Activity');
const Report = require('../models/Report');
const CoachChat = require('../models/CoachChat');
const Notification = require('../models/Notification');
const OpenAI = require('openai');

const {
  buildLastSessionComment,
  buildRuleBasedCoachReply,
  buildChatContext,
  buildChatContextForOpenAI,
  sendChatMessage,
  countRecentUserMessages,
  shouldUseRuleBasedFirst,
  MAX_MESSAGES_PER_HOUR,
  MAX_OPENAI_HISTORY_MESSAGES,
  DEFAULT_SUGGESTED_PROMPTS
} = require('../services/coachChatService');

function makeActivity(overrides = {}) {
  return {
    _id: 'act-1',
    name: 'Morning Run',
    date: new Date('2026-05-23T07:00:00.000Z'),
    distance: 8000,
    movingTime: 2400,
    pace: 5.0,
    avgHeartRate: 152,
    splitsMetric: [],
    ...overrides
  };
}

describe('coachChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    Activity.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(makeActivity())
      })
    });
    Activity.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([makeActivity()])
        })
      })
    });
    Report.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'report-1',
          report: {
            nextSessionDetail: {
              title: 'Tempo intervals',
              durationMinutes: 50
            }
          }
        })
      })
    });
    Notification.countDocuments.mockResolvedValue(1);
  });

  describe('buildLastSessionComment', () => {
    it('describes negative split runs', () => {
      const comment = buildLastSessionComment({
        splitProfile: 'negative',
        estimatedRpe: 6,
        intensityBucket: 'tempo'
      });
      expect(comment).toMatch(/Strong second half/);
      expect(comment).toMatch(/RPE 6/);
    });
  });

  describe('buildChatContext', () => {
    it('returns structured context with last session, profile, and prompts', async () => {
      const context = await buildChatContext('user-1', {
        name: 'Alex',
        runningGoal: '10k',
        experience: 'intermediate'
      });

      expect(context.lastSession).toEqual(expect.objectContaining({
        name: 'Morning Run',
        distanceKm: 8,
        estimatedRpe: expect.any(Number),
        comment: expect.any(String)
      }));
      expect(context.userProfile).toEqual(expect.objectContaining({
        name: 'Alex',
        runningGoal: '10k',
        experience: 'intermediate'
      }));
      expect(context.nextSession).toEqual(expect.objectContaining({
        title: 'Tempo intervals'
      }));
      expect(context.suggestedPrompts).toEqual(
        expect.arrayContaining([...DEFAULT_SUGGESTED_PROMPTS])
      );
      expect(context.hasUnreadCoachNudge).toBe(true);
      expect(context.reportId).toBe('report-1');
    });

    it('handles missing activities gracefully', async () => {
      Activity.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null)
        })
      });
      Activity.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([])
          })
        })
      });

      const context = await buildChatContext('user-1', {});
      expect(context.lastSession).toBeNull();
      expect(context.suggestedPrompts.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('buildChatContextForOpenAI', () => {
    it('returns compact context without splits or session block details', async () => {
      const context = await buildChatContext('user-1', {
        name: 'Alex',
        runningGoal: '10k',
        experience: 'intermediate',
        goalPaceMinPerKm: 5.2,
        weeklyTrainingLoadKm: 40
      });

      const compact = buildChatContextForOpenAI(context);

      expect(compact.lastSession).toEqual(expect.objectContaining({
        name: 'Morning Run',
        distanceKm: 8,
        comment: expect.any(String)
      }));
      expect(compact.lastSession.splits).toBeUndefined();
      expect(compact.lastSession.activityId).toBeUndefined();
      expect(compact.userProfile).toEqual({
        runningGoal: '10k',
        experience: 'intermediate'
      });
      expect(compact.userProfile.name).toBeUndefined();
      expect(compact.nextSession).toEqual(expect.objectContaining({
        title: 'Tempo intervals',
        durationMinutes: 50
      }));
      expect(compact.nextSession.warmup).toBeUndefined();
    });
  });

  describe('shouldUseRuleBasedFirst', () => {
    it('matches short intent keywords', () => {
      expect(shouldUseRuleBasedFirst('How was my run?')).toBe(true);
      expect(shouldUseRuleBasedFirst('What about my pacing strategy for marathon training blocks?')).toBe(false);
    });
  });

  describe('countRecentUserMessages', () => {
    it('counts user messages within the last hour', () => {
      const now = Date.now();
      const messages = [
        { role: 'user', createdAt: new Date(now - 10 * 60 * 1000) },
        { role: 'user', createdAt: new Date(now - 2 * 60 * 60 * 1000) },
        { role: 'assistant', createdAt: new Date(now - 5 * 60 * 1000) }
      ];
      expect(countRecentUserMessages(messages)).toBe(1);
    });
  });

  describe('buildRuleBasedCoachReply', () => {
    const mockContext = {
      lastSession: {
        name: 'Morning Run',
        distanceKm: 8,
        pace: '5:00 min/km',
        avgPaceMinPerKm: 5.0,
        estimatedRpe: 6,
        splitProfile: 'even',
        intensityBucket: 'tempo',
        hrDriftBpm: 4,
        avgHr: 152
      },
      nextSession: { title: 'Tempo intervals', durationMinutes: 50 },
      trainingLoad: { acwr: 1.1 }
    };

    it('summarizes last run with session-specific stats', () => {
      const { reply, source } = buildRuleBasedCoachReply('How was my last run?', mockContext);
      expect(source).toBe('rules');
      expect(reply).toMatch(/8 km/);
      expect(reply).toMatch(/5:00 min\/km/);
      expect(reply).toMatch(/RPE 6/);
      expect(reply).not.toMatch(/temporarily unavailable/i);
    });

    it('prompts to sync when no last session exists', () => {
      const { reply } = buildRuleBasedCoachReply('How was my last run?', { lastSession: null });
      expect(reply).toMatch(/Sync a run from Strava/i);
    });
  });

  describe('sendChatMessage', () => {
    it('rejects empty messages', async () => {
      await expect(sendChatMessage('user-1', {}, '  ')).rejects.toMatchObject({ status: 400 });
    });

    it('returns rule-based reply when OpenAI key is missing', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      CoachChat.findOne.mockResolvedValue({
        messages: [],
        contextSnapshot: {},
        save
      });

      const result = await sendChatMessage('user-1', { name: 'Alex' }, 'How was my last run?');

      expect(result.reply).toMatch(/8 km/);
      expect(result.reply).toMatch(/5:00 min\/km/);
      expect(result.source).toBe('rules');
      expect(result.reply).not.toMatch(/Connect OpenAI/i);
      expect(result.messages.length).toBe(2);
      expect(save).toHaveBeenCalled();
    });

    it('returns sync prompt when no session data exists', async () => {
      Activity.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null)
        })
      });
      Activity.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([])
          })
        })
      });

      const save = jest.fn().mockResolvedValue(undefined);
      CoachChat.findOne.mockResolvedValue({
        messages: [],
        contextSnapshot: {},
        save
      });

      const result = await sendChatMessage('user-1', { name: 'Alex' }, 'How was my last run?');

      expect(result.reply).toMatch(/Sync a run from Strava/i);
      expect(result.source).toBe('rules');
    });

    it('calls OpenAI with compact context and capped history', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const createMock = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Nice controlled effort on that run.' } }]
      });
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: createMock } }
      }));

      const save = jest.fn().mockResolvedValue(undefined);
      CoachChat.findOne.mockResolvedValue({
        messages: [],
        contextSnapshot: {},
        save
      });

      const result = await sendChatMessage(
        'user-1',
        { name: 'Alex' },
        'Can you break down my pacing from the last workout?'
      );

      expect(createMock).toHaveBeenCalled();
      const callArgs = createMock.mock.calls[0][0];
      expect(callArgs.max_tokens).toBe(500);
      expect(callArgs.temperature).toBeLessThanOrEqual(0.5);
      expect(callArgs.messages.length).toBeLessThanOrEqual(MAX_OPENAI_HISTORY_MESSAGES + 1);

      const systemContent = callArgs.messages[0].content;
      expect(systemContent).toMatch(/ATHLETE_CONTEXT/);
      expect(systemContent).not.toMatch(/"splits"/);
      expect(systemContent).not.toMatch(/warmup/);
      expect(systemContent).not.toMatch(/weeklyLoadSeries/);

      expect(result.reply).toBe('Nice controlled effort on that run.');
      expect(result.source).toBe('openai');
    });

    it('skips OpenAI for exact suggested prompts', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const createMock = jest.fn();
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: createMock } }
      }));

      const save = jest.fn().mockResolvedValue(undefined);
      CoachChat.findOne.mockResolvedValue({
        messages: [],
        contextSnapshot: {},
        save
      });

      const result = await sendChatMessage('user-1', { name: 'Alex' }, 'How was my last run?');

      expect(createMock).not.toHaveBeenCalled();
      expect(result.source).toBe('rules');
      expect(result.reply).toMatch(/8 km/);
    });

    it('returns cached reply without a second OpenAI call', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const createMock = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'AI pacing breakdown.' } }]
      });
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: createMock } }
      }));

      const now = Date.now();
      const save = jest.fn().mockResolvedValue(undefined);
      CoachChat.findOne.mockResolvedValue({
        messages: [
          {
            role: 'user',
            content: 'Can you break down my pacing from the last workout?',
            createdAt: new Date(now - 5 * 60 * 1000)
          },
          {
            role: 'assistant',
            content: 'AI pacing breakdown.',
            createdAt: new Date(now - 5 * 60 * 1000 + 1000)
          }
        ],
        contextSnapshot: { lastActivityId: 'act-1' },
        save
      });

      const result = await sendChatMessage(
        'user-1',
        { name: 'Alex' },
        'Can you break down my pacing from the last workout?'
      );

      expect(createMock).not.toHaveBeenCalled();
      expect(result.source).toBe('cache');
      expect(result.reply).toBe('AI pacing breakdown.');
    });

    it('rejects duplicate messages within debounce window', async () => {
      const now = Date.now();
      CoachChat.findOne.mockResolvedValue({
        messages: [{
          role: 'user',
          content: 'Hello coach',
          createdAt: new Date(now - 2000)
        }],
        contextSnapshot: {},
        save: jest.fn()
      });

      await expect(sendChatMessage('user-1', {}, 'Hello coach')).rejects.toMatchObject({
        status: 429,
        retryAfter: 10
      });
    });

    it('falls back to rule-based reply when OpenAI rate limits', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const createMock = jest.fn().mockRejectedValue(new Error('429 You exceeded your current quota'));
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: createMock } }
      }));

      const save = jest.fn().mockResolvedValue(undefined);
      CoachChat.findOne.mockResolvedValue({
        messages: [],
        contextSnapshot: {},
        save
      });

      const result = await sendChatMessage(
        'user-1',
        { name: 'Alex' },
        'Can you break down my pacing from the last workout?'
      );

      expect(result.reply).toMatch(/8 km/);
      expect(result.reply).toMatch(/5:00 min\/km/);
      expect(result.reply).toMatch(/AI coach offline/i);
      expect(result.source).toBe('rules');
      expect(result.reply).not.toMatch(/temporarily unavailable|high demand/i);
      expect(result.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'assistant',
            content: expect.stringMatching(/8 km/)
          })
        ])
      );
    });

    it('enforces rate limit', async () => {
      const now = Date.now();
      const messages = Array.from({ length: MAX_MESSAGES_PER_HOUR }, (_, i) => ({
        role: 'user',
        content: `msg ${i}`,
        createdAt: new Date(now - i * 60 * 1000)
      }));

      CoachChat.findOne.mockResolvedValue({
        messages,
        contextSnapshot: {},
        save: jest.fn()
      });

      await expect(sendChatMessage('user-1', {}, 'one more')).rejects.toMatchObject({ status: 429 });
    });
  });
});
