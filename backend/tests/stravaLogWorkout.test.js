const { buildPlannedWorkoutDescription } = require('../utils/plannedWorkoutDescription');
const {
  logPlannedWorkoutToStrava,
  mapLogWorkoutError,
  normalizeScheduledDate
} = require('../services/stravaLogWorkout');

jest.mock('../services/stravaCreateActivity', () => ({
  uploadActivityToStrava: jest.fn(),
  mapStravaUploadError: jest.fn()
}));

const { uploadActivityToStrava, mapStravaUploadError } = require('../services/stravaCreateActivity');

describe('stravaLogWorkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('buildPlannedWorkoutDescription includes session blocks', () => {
    const text = buildPlannedWorkoutDescription({
      description: 'Easy day',
      sessionType: 'easy_run',
      rpe: 4,
      sessionBlocks: {
        warmup: { durationMinutes: 10, description: 'Jog easy' }
      }
    });

    expect(text).toMatch(/Session type: easy_run/);
    expect(text).toMatch(/Warm-up \(10 min\)/);
    expect(text).toMatch(/RunAdvisor weekly training plan/);
  });

  test('logPlannedWorkoutToStrava uploads private manual activity', async () => {
    uploadActivityToStrava.mockResolvedValue({
      posted: true,
      activityId: 999,
      url: 'https://www.strava.com/activities/999'
    });

    const result = await logPlannedWorkoutToStrava('token', {
      title: 'Long run',
      description: 'Steady aerobic',
      durationMinutes: 90,
      distanceKm: 16,
      sessionType: 'long_run',
      scheduledDate: '2026-05-25T07:00:00.000Z'
    });

    expect(result.activityId).toBe(999);
    expect(uploadActivityToStrava).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        name: 'Long run',
        type: 'run',
        duration: 5400,
        distance: 16000,
        visibility: 'only_me'
      })
    );
  });

  test('mapLogWorkoutError returns SCOPE_REQUIRED on reconnect-needed upload error', () => {
    mapStravaUploadError.mockReturnValue({
      posted: false,
      needsReconnect: true,
      message: 'Reconnect for activity:write'
    });

    const mapped = mapLogWorkoutError(new Error('forbidden'));

    expect(mapped.status).toBe(403);
    expect(mapped.body.code).toBe('SCOPE_REQUIRED');
    expect(mapped.body.success).toBe(false);
  });

  test('normalizeScheduledDate falls back to now for invalid dates', () => {
    const before = Date.now();
    const result = normalizeScheduledDate('not-a-date');
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
  });
});
