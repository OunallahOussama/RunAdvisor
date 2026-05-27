jest.mock('../utils/stravaCredentials', () => ({
  prepareUserForStravaApi: jest.fn(),
  stravaAxios: { get: jest.fn() }
}));

jest.mock('../services/stravaUpdateActivity', () => ({
  pushDescriptionToStrava: jest.fn()
}));

const Activity = require('../models/Activity');
const User = require('../models/User');
const { prepareUserForStravaApi, stravaAxios } = require('../utils/stravaCredentials');
const { pushDescriptionToStrava } = require('../services/stravaUpdateActivity');
const {
  enrichLatestStravaActivityDescription,
  stravaInsightPushAllowed
} = require('../services/stravaActivityInsightPush');

describe('stravaActivityInsightPush', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('stravaInsightPushAllowed defaults to true', () => {
    expect(stravaInsightPushAllowed({ consent: {} })).toBe(true);
    expect(stravaInsightPushAllowed({ consent: { stravaActivityInsights: false } })).toBe(false);
  });

  test('skips when insight already pushed locally', async () => {
    const findOne = jest.spyOn(Activity, 'findOne').mockResolvedValue({
      stravaActivityId: '999',
      stravaInsightPushedAt: new Date(),
      date: new Date()
    });
    jest.spyOn(User, 'findById').mockResolvedValue({ consent: {} });

    const result = await enrichLatestStravaActivityDescription('user1', 'act1');

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('already_pushed');
    expect(pushDescriptionToStrava).not.toHaveBeenCalled();

    findOne.mockRestore();
  });

  test('pushes description for latest activity when allowed', async () => {
    const activityDoc = {
      _id: 'act1',
      userId: 'user1',
      stravaActivityId: '12345',
      date: new Date(),
      distance: 5000,
      movingTime: 1500,
      pace: 5,
      save: jest.fn().mockResolvedValue(true)
    };

    const latestQuery = {
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ _id: 'act1' })
    };

    jest.spyOn(User, 'findById').mockResolvedValue({ consent: { stravaActivityInsights: true } });
    jest.spyOn(Activity, 'findOne').mockImplementation((query) => {
      if (query._id) {
        return Promise.resolve(activityDoc);
      }
      return latestQuery;
    });
    prepareUserForStravaApi.mockResolvedValue({ accessToken: 'token' });
    stravaAxios.get.mockResolvedValue({
      data: {
        id: 12345,
        description: '',
        splits_metric: [
          { distance: 1000, moving_time: 300 },
          { distance: 1000, moving_time: 290 }
        ]
      }
    });
    pushDescriptionToStrava.mockResolvedValue({ updated: true });

    const result = await enrichLatestStravaActivityDescription('user1', 'act1');

    expect(result.updated).toBe(true);
    expect(pushDescriptionToStrava).toHaveBeenCalledWith(
      'token',
      '12345',
      expect.stringMatching(/RunAdvisor · https?:\/\//)
    );
    expect(activityDoc.save).toHaveBeenCalled();
  });

  test('skips when activity is no longer the user latest', async () => {
    const activityDoc = {
      _id: 'act1',
      userId: 'user1',
      stravaActivityId: '12345',
      date: new Date()
    };

    const latestQuery = {
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ _id: 'act2' })
    };

    jest.spyOn(User, 'findById').mockResolvedValue({ consent: {} });
    jest.spyOn(Activity, 'findOne').mockImplementation((query) => {
      if (query._id) {
        return Promise.resolve(activityDoc);
      }
      return latestQuery;
    });

    const result = await enrichLatestStravaActivityDescription('user1', 'act1');

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('not_latest');
    expect(pushDescriptionToStrava).not.toHaveBeenCalled();
  });
});
