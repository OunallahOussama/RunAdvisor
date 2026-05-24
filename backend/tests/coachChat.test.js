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
  buildChatContext,
  sendChatMessage,
  countRecentUserMessages,
  MAX_MESSAGES_PER_HOUR,
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

  describe('sendChatMessage', () => {
    it('rejects empty messages', async () => {
      await expect(sendChatMessage('user-1', {}, '  ')).rejects.toMatchObject({ status: 400 });
    });

    it('returns fallback reply when OpenAI key is missing', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      CoachChat.findOne.mockResolvedValue({
        messages: [],
        contextSnapshot: {},
        save
      });

      const result = await sendChatMessage('user-1', { name: 'Alex' }, 'How was my last run?');

      expect(result.reply).toMatch(/Connect OpenAI/i);
      expect(result.messages.length).toBe(2);
      expect(save).toHaveBeenCalled();
    });

    it('calls OpenAI and saves assistant reply', async () => {
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

      const result = await sendChatMessage('user-1', { name: 'Alex' }, 'How was my last run?');

      expect(createMock).toHaveBeenCalled();
      expect(result.reply).toBe('Nice controlled effort on that run.');
      expect(result.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'How was my last run?' }),
          expect.objectContaining({ role: 'assistant', content: 'Nice controlled effort on that run.' })
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
