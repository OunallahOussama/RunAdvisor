const express = require('express');
const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { validateStravaAuthenticate, validateSyncRecent } = require('../middleware/validate');
const { pickStravaActivityDetail } = require('../utils/pickStravaActivityDetail');
const {
  persistStravaTokens,
  prepareUserForStravaApi,
  stravaAxios
} = require('../utils/stravaCredentials');
const { createNotification } = require('../services/notificationService');

const router = express.Router();
const MAX_TRAINING_PLAN_BYTES = 2 * 1024 * 1024;
const backgroundSyncs = new Set();

function formatStravaProviderErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return '';
  }

  return errors
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return '';
      }

      return [entry.resource, entry.field, entry.code].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .join(', ');
}

function getStravaAuthErrorMessage(error) {
  const data = error.response?.data;

  if (!data) {
    return error.message || 'Unable to reach Strava right now.';
  }

  const providerErrors = formatStravaProviderErrors(data.errors);
  const hasRedirectError = Array.isArray(data.errors)
    && data.errors.some((entry) => entry?.field === 'redirect_uri');
  const hasClientError = Array.isArray(data.errors)
    && data.errors.some((entry) => entry?.field === 'client_id');

  if (hasRedirectError) {
    return 'Strava rejected the callback URL. Ensure the redirect URI used by RunAdvisor exactly matches your Strava app settings.';
  }

  if (hasClientError) {
    return 'Strava rejected the client ID. Check the Strava client credentials configured on the server.';
  }

  if (data.message === 'Authorization Error') {
    return 'Strava rejected the authorization code. This usually means the code expired, was already used, or the callback URL did not match.';
  }

  return [data.message, providerErrors].filter(Boolean).join(' - ') || error.message || 'Unexpected Strava authentication error.';
}

function normalizeStravaType(type) {
  const normalized = String(type || '').toLowerCase().replace(/_/g, ' ').trim();

  if (normalized.includes('trail')) {
    return 'trail run';
  }

  if (normalized.includes('walk') || normalized.includes('hike')) {
    return 'walk';
  }

  if (normalized.includes('run')) {
    return normalized.includes('outdoor') ? 'outdoor run' : 'run';
  }

  return null;
}

function calculatePace(activity) {
  const distanceKm = Number(activity.distance || 0) / 1000;
  const movingMinutes = Number(activity.moving_time || activity.elapsed_time || 0) / 60;

  if (!distanceKm || !movingMinutes) {
    return 0;
  }

  return movingMinutes / distanceKm;
}

function serializeTrainingPlan(plan, includeDataUrl = false) {
  if (!plan) {
    return null;
  }

  return {
    id: plan._id,
    fileName: plan.fileName,
    contentType: plan.contentType,
    sizeBytes: plan.sizeBytes,
    notes: plan.notes,
    uploadedAt: plan.uploadedAt,
    ...(includeDataUrl ? { dataUrl: plan.dataUrl } : {})
  };
}

function stravaActivityRequestErrorPayload(error) {
  const status = error.response?.status;
  const data = error.response?.data;

  if (status === 404) {
    return {
      status: 404,
      message: 'That activity was not found on Strava. It may have been deleted or is no longer visible to your account.'
    };
  }

  if (status === 429) {
    const retryAfterRaw = error.response?.headers?.['retry-after'];
    const retryAfter = retryAfterRaw != null ? Number(retryAfterRaw) : undefined;
    return {
      status: 429,
      message: 'Strava rate limit reached. Please wait a few minutes and try again.',
      retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined
    };
  }

  if (status === 401 || status === 403) {
    return {
      status: 401,
      message: 'Strava rejected this request. Reconnect Strava from the Strava page if this keeps happening.'
    };
  }

  const providerMessage = typeof data?.message === 'string' ? data.message : '';
  return {
    status: typeof status === 'number' && status >= 400 && status < 600 ? status : 502,
    message: providerMessage || error.message || 'Unable to load this activity from Strava right now.'
  };
}

async function findOwnedActivityForStravaDetail(userId, identifier) {
  const id = String(identifier || '').trim();

  if (!id) {
    return null;
  }

  const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  if (/^[a-fA-F0-9]{24}$/.test(id)) {
    const byMongo = await Activity.findOne({ _id: id, userId: uid });

    if (byMongo) {
      return byMongo;
    }
  }

  return Activity.findOne({ userId: uid, stravaActivityId: id });
}

function scheduleBackgroundStravaSync(userId, limit = 20) {
  const syncKey = String(userId);

  if (backgroundSyncs.has(syncKey)) {
    return;
  }

  backgroundSyncs.add(syncKey);

  setImmediate(async () => {
    try {
      const { user, accessToken } = await prepareUserForStravaApi(userId);
      await syncRecentActivitiesForUser(userId, user, accessToken, limit);
    } catch (error) {
      console.error('Background Strava sync failed:', error.message || error);
    } finally {
      backgroundSyncs.delete(syncKey);
    }
  });
}

const { visibilityFromStravaActivity } = require('../utils/activityVisibility');

function buildActivityUpdate(userId, activity) {
  const normalizedType = normalizeStravaType(activity.type);

  if (!normalizedType) {
    return null;
  }

  const pace = calculatePace(activity);
  const { buildSemanticVector } = require('../services/semanticSearch');

  const update = {
    userId,
    stravaActivityId: String(activity.id),
    name: activity.name,
    type: normalizedType,
    distance: Number(activity.distance || 0),
    duration: Number(activity.elapsed_time || activity.moving_time || 0),
    movingTime: Number(activity.moving_time || activity.elapsed_time || 0),
    elevationGain: Number(activity.total_elevation_gain || 0),
    pace,
    avgHeartRate: activity.average_heartrate,
    maxHeartRate: activity.max_heartrate,
    avgCadence: activity.average_cadence,
    maxCadence: activity.max_cadence,
    averageSpeed: activity.average_speed,
    maxSpeed: activity.max_speed,
    averageWatts: activity.average_watts,
    maxWatts: activity.max_watts,
    weightedAverageWatts: activity.weighted_average_watts,
    kilojoules: activity.kilojoules,
    sufferScore: activity.suffer_score,
    calories: activity.calories,
    workoutType: activity.workout_type,
    achievementCount: activity.achievement_count,
    prCount: activity.pr_count,
    startDateLocal: activity.start_date_local ? new Date(activity.start_date_local) : undefined,
    timezone: activity.timezone,
    date: new Date(activity.start_date),
    polyline: activity.map?.summary_polyline || activity.map?.polyline,
    performanceVector: generatePerformanceVector(activity),
    notes: activity.description,
    visibility: visibilityFromStravaActivity(activity)
  };

  if (Array.isArray(activity.splits_metric) && activity.splits_metric.length) {
    update.splitsMetric = activity.splits_metric.map((split, index) => ({
      split: split.split != null ? split.split : index + 1,
      distance: split.distance,
      elapsed_time: split.elapsed_time,
      moving_time: split.moving_time,
      elevation_difference: split.elevation_difference,
      average_speed: split.average_speed,
      average_heartrate: split.average_heartrate,
      pace_zone: split.pace_zone
    }));
  }

  if (Array.isArray(activity.laps) && activity.laps.length) {
    update.laps = activity.laps.map((lap) => ({
      id: lap.id,
      name: lap.name,
      lap_index: lap.lap_index,
      distance: lap.distance,
      elapsed_time: lap.elapsed_time,
      moving_time: lap.moving_time,
      average_speed: lap.average_speed,
      max_speed: lap.max_speed,
      average_heartrate: lap.average_heartrate,
      max_heartrate: lap.max_heartrate,
      average_cadence: lap.average_cadence,
      total_elevation_gain: lap.total_elevation_gain,
      start_index: lap.start_index,
      end_index: lap.end_index
    }));
  }

  update.semanticVector = buildSemanticVector(update);

  return update;
}

async function syncRecentActivitiesForUser(userId, user, accessToken, limit = 20) {
  const response = await stravaAxios.get('https://www.strava.com/api/v3/athlete/activities', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    params: {
      per_page: limit
    }
  });

  const rawActivities = Array.isArray(response.data) ? response.data : [];
  const supportedActivities = rawActivities
    .map((activity) => buildActivityUpdate(userId, activity))
    .filter(Boolean);

  const savedActivities = await Promise.all(supportedActivities.map((activityPayload) => (
    Activity.findOneAndUpdate(
      {
        userId,
        stravaActivityId: activityPayload.stravaActivityId
      },
      activityPayload,
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    )
  )));

  user.stravaLastSyncAt = new Date();
  await user.save();

  try {
    if (savedActivities.length > 0) {
      await createNotification(userId, {
        type: 'strava_sync_completed',
        title: `Synced ${savedActivities.length} Strava activit${savedActivities.length === 1 ? 'y' : 'ies'}`,
        body: 'Your latest runs are up to date in RunAdvisor.',
        severity: 'info',
        data: { syncedCount: savedActivities.length, route: '/activities' }
      });

      const coachNudgesAllowed = user?.consent?.notifications?.recommendations !== false;
      if (coachNudgesAllowed) {
        await createNotification(userId, {
          type: 'coach_session_ready',
          title: 'New run synced',
          body: 'Tap to discuss your latest session with your coach.',
          severity: 'info',
          data: {
            syncedCount: savedActivities.length,
            lastActivityId: savedActivities[0]?._id || null,
            route: '/'
          }
        });
      }
    }
  } catch (notifyError) {
    console.error('Strava sync notification failed:', notifyError.message || notifyError);
  }

  return {
    syncedCount: savedActivities.length,
    skippedCount: Math.max(0, rawActivities.length - savedActivities.length),
    activities: savedActivities
  };
}

/**
 * Exchange Strava authorization code for access token
 * POST /api/strava/authenticate
 */
router.post('/authenticate', auth, validateStravaAuthenticate, async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    const userId = req.userId;

    if (!code) {
      return res.status(400).json({
        error: 'Failed to authenticate with Strava',
        message: 'Missing Strava authorization code.'
      });
    }

    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      return res.status(500).json({
        error: 'Failed to authenticate with Strava',
        message: 'Strava client credentials are not configured on the server.'
      });
    }

    const resolvedRedirectUri = redirectUri || process.env.STRAVA_REDIRECT_URI || 'http://localhost:3000/callback';

    const response = await stravaAxios.post('https://www.strava.com/api/v3/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: resolvedRedirectUri
    });

    const { access_token, refresh_token, expires_at } = response.data;
    const athlete = response.data.athlete;

    await persistStravaTokens(userId, {
      stravaId: athlete.id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(expires_at * 1000)
    });

    scheduleBackgroundStravaSync(userId, 20);

    res.json({
      success: true,
      athlete,
      syncStarted: true
    });
  } catch (error) {
    const errData = error.response?.data || { message: error.message };
    const message = getStravaAuthErrorMessage(error);
    console.error('Strava auth error:', { message, details: errData });
    res.status(error.response?.status || 400).json({
      error: 'Failed to authenticate with Strava',
      message,
      details: errData
    });
  }
});

/**
 * Sync and return recent activities from Strava
 * POST /api/strava/sync-recent
 */
router.post('/sync-recent', auth, validateSyncRecent, async (req, res) => {
  try {
    const limit = req.syncLimit;
    const { user, accessToken } = await prepareUserForStravaApi(req.userId);
    const syncResult = await syncRecentActivitiesForUser(req.userId, user, accessToken, limit);

    res.json({
      success: true,
      ...syncResult,
      syncedAt: user.stravaLastSyncAt,
      message: `Synced ${syncResult.syncedCount} supported Strava activities.`
    });
  } catch (error) {
    console.error('Error syncing recent Strava activities:', error);
    res.status(error.statusCode || 500).json({
      error: 'Failed to sync recent activities',
      message: error.message || 'Unable to sync activities from Strava right now.'
    });
  }
});

/**
 * Fetch recent activities from Strava and persist locally
 * GET /api/strava/activities
 */
router.get('/activities', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const { user, accessToken } = await prepareUserForStravaApi(req.userId);
    const syncResult = await syncRecentActivitiesForUser(req.userId, user, accessToken, limit);

    res.json({
      success: true,
      count: syncResult.syncedCount,
      activities: syncResult.activities,
      skippedCount: syncResult.skippedCount,
      syncedAt: user.stravaLastSyncAt
    });
  } catch (error) {
    console.error('Error fetching Strava activities:', error);
    res.status(error.statusCode || 500).json({
      error: 'Failed to fetch activities',
      message: error.message || 'Unable to fetch activities from Strava right now.'
    });
  }
});

/**
 * Strava rich activity payload (GET https://www.strava.com/api/v3/activities/{id})
 * for an activity the user already owns in Mongo (by _id or stravaActivityId).
 * GET /api/strava/activities/:identifier/detail
 */
router.get('/activities/:identifier/detail', auth, async (req, res) => {
  try {
    const { user, accessToken } = await prepareUserForStravaApi(req.userId);
    const activity = await findOwnedActivityForStravaDetail(req.userId, req.params.identifier);

    if (!activity) {
      return res.status(404).json({
        error: 'Activity not found',
        message: 'No matching activity in your log, or you do not have access to it.'
      });
    }

    if (!activity.stravaActivityId) {
      return res.status(400).json({
        error: 'Not a Strava activity',
        message: 'This entry is manual-only. Open Strava-synced activities to see map and Strava fields.'
      });
    }

    const response = await stravaAxios.get(
      `https://www.strava.com/api/v3/activities/${activity.stravaActivityId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const detail = pickStravaActivityDetail(response.data);

    res.json({
      success: true,
      stravaActivityId: activity.stravaActivityId,
      localActivityId: activity._id,
      detail
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        error: 'Strava not connected',
        message: error.message || 'Connect Strava first.'
      });
    }

    if (error.response) {
      const mapped = stravaActivityRequestErrorPayload(error);
      console.error('Strava activity detail HTTP error:', mapped);
      return res.status(mapped.status).json({
        error: 'Strava activity detail failed',
        message: mapped.message,
        ...(mapped.retryAfter != null ? { retryAfter: mapped.retryAfter } : {})
      });
    }

    console.error('Strava activity detail error:', error);
    res.status(500).json({
      error: 'Strava activity detail failed',
      message: error.message || 'Unexpected error fetching Strava activity detail.'
    });
  }
});

/**
 * Sync single activity details
 * POST /api/strava/sync-activity/:activityId
 */
router.post('/sync-activity/:activityId', auth, async (req, res) => {
  try {
    const { accessToken } = await prepareUserForStravaApi(req.userId);

    const response = await stravaAxios.get(
      `https://www.strava.com/api/v3/activities/${req.params.activityId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const activityPayload = buildActivityUpdate(req.userId, response.data);

    if (!activityPayload) {
      return res.status(400).json({
        error: 'Unsupported activity type',
        message: 'Only running and walking activities are supported in this MVP.'
      });
    }

    const savedActivity = await Activity.findOneAndUpdate(
      {
        userId: req.userId,
        stravaActivityId: activityPayload.stravaActivityId
      },
      activityPayload,
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    user.stravaLastSyncAt = new Date();
    await user.save();

    res.json({ success: true, activity: savedActivity, syncedAt: user.stravaLastSyncAt });
  } catch (error) {
    console.error('Error syncing activity:', error);
    res.status(error.statusCode || 500).json({
      error: 'Failed to sync activity',
      message: error.message || 'Unable to sync the selected Strava activity.'
    });
  }
});

/**
 * List uploaded training plans stored in-app
 * GET /api/strava/training-plans
 */
router.get('/training-plans', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const plans = (user.trainingPlans || [])
      .slice()
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .map((plan) => serializeTrainingPlan(plan));

    res.json({ success: true, plans });
  } catch (error) {
    console.error('Error fetching training plans:', error);
    res.status(500).json({ error: 'Failed to fetch training plans' });
  }
});

/**
 * Upload a training plan into the user's in-app profile
 * POST /api/strava/training-plans
 */
router.post('/training-plans', auth, async (req, res) => {
  try {
    const { fileName, contentType, sizeBytes, dataUrl, notes } = req.body;

    if (!fileName || !dataUrl) {
      return res.status(400).json({
        error: 'Missing training plan data',
        message: 'A file name and file contents are required.'
      });
    }

    if (Number(sizeBytes || 0) > MAX_TRAINING_PLAN_BYTES) {
      return res.status(400).json({
        error: 'Training plan too large',
        message: 'Please upload a file that is 2 MB or smaller for this MVP.'
      });
    }

    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return res.status(400).json({
        error: 'Invalid training plan data',
        message: 'Training plan content must be uploaded as a browser data URL.'
      });
    }

    const user = await User.findById(req.userId);
    user.trainingPlans = user.trainingPlans || [];
    user.trainingPlans.unshift({
      fileName: String(fileName).trim(),
      contentType: contentType || 'application/octet-stream',
      sizeBytes: Number(sizeBytes || 0),
      dataUrl,
      notes: typeof notes === 'string' ? notes.trim() : ''
    });
    user.updatedAt = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      plan: serializeTrainingPlan(user.trainingPlans[0])
    });
  } catch (error) {
    console.error('Error uploading training plan:', error);
    res.status(500).json({ error: 'Failed to upload training plan' });
  }
});

/**
 * Get a single stored training plan, including file contents for download
 * GET /api/strava/training-plans/:planId
 */
router.get('/training-plans/:planId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const plan = user.trainingPlans.id(req.params.planId);

    if (!plan) {
      return res.status(404).json({ error: 'Training plan not found' });
    }

    res.json({
      success: true,
      plan: serializeTrainingPlan(plan, true)
    });
  } catch (error) {
    console.error('Error fetching training plan:', error);
    res.status(500).json({ error: 'Failed to fetch training plan' });
  }
});

/**
 * Delete a stored training plan
 * DELETE /api/strava/training-plans/:planId
 */
router.delete('/training-plans/:planId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const plan = user.trainingPlans.id(req.params.planId);

    if (!plan) {
      return res.status(404).json({ error: 'Training plan not found' });
    }

    plan.deleteOne();
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Training plan deleted'
    });
  } catch (error) {
    console.error('Error deleting training plan:', error);
    res.status(500).json({ error: 'Failed to delete training plan' });
  }
});

/**
 * Generate performance vector from activity metrics
 * Used for vector search and ML
 */
function generatePerformanceVector(activity) {
  const distanceKm = Number(activity.distance || 0) / 1000;
  const movingHours = Number(activity.moving_time || 0) / 3600;
  const paceAsKmPerMinute = distanceKm && activity.moving_time
    ? distanceKm / (activity.moving_time / 60)
    : 0;

  return [
    Number(activity.distance || 0) / 10000,
    movingHours,
    paceAsKmPerMinute,
    Number(activity.total_elevation_gain || 0) / 100,
    activity.average_heartrate ? activity.average_heartrate / 200 : 0.5,
    activity.average_cadence ? activity.average_cadence / 200 : 0.5
  ];
}

/**
 * Log a planned workout as a manual Strava activity (activity:write).
 * Strava has no native "planned workout" API — this creates a private manual entry.
 * POST /api/strava/log-workout
 */
router.post('/log-workout', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      durationMinutes,
      distanceKm,
      sessionType,
      scheduledDate,
      targetPace,
      rpe,
      hrZone,
      sessionBlocks
    } = req.body;

    if (!title || !durationMinutes) {
      return res.status(400).json({
        success: false,
        message: 'title and durationMinutes are required.'
      });
    }

    const { accessToken } = await prepareUserForStravaApi(req.userId);
    const { logPlannedWorkoutToStrava } = require('../services/stravaLogWorkout');

    const result = await logPlannedWorkoutToStrava(accessToken, {
      title: String(title).trim(),
      description: typeof description === 'string' ? description.trim() : '',
      durationMinutes: Number(durationMinutes),
      distanceKm: distanceKm != null ? Number(distanceKm) : 0,
      sessionType: sessionType ? String(sessionType) : 'run',
      scheduledDate,
      targetPace,
      rpe,
      hrZone,
      sessionBlocks
    });

    res.json({
      success: true,
      stravaActivityId: result.activityId,
      url: result.url
    });
  } catch (error) {
    const { mapLogWorkoutError } = require('../services/stravaLogWorkout');
    const mapped = mapLogWorkoutError(error);
    console.error('Strava log-workout error:', error.response?.data || error.message || error);
    res.status(mapped.status).json(mapped.body);
  }
});

/**
 * Athlete stats from Strava
 * GET /api/strava/athlete/stats
 */
router.get('/athlete/stats', auth, async (req, res) => {
  try {
    const { user, accessToken } = await prepareUserForStravaApi(req.userId);

    if (!user.stravaId) {
      return res.status(400).json({ error: 'Strava not connected' });
    }

    const { fetchAthleteStats } = require('../services/stravaStreams');
    const stats = await fetchAthleteStats(accessToken, user.stravaId);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Athlete stats error:', error);
    res.status(500).json({ error: 'Failed to fetch athlete stats' });
  }
});

/**
 * Activity streams (pace, HR, elevation)
 * GET /api/strava/activities/:identifier/streams
 */
router.get('/activities/:identifier/streams', auth, async (req, res) => {
  try {
    const { accessToken } = await prepareUserForStravaApi(req.userId);
    const activity = await findOwnedActivityForStravaDetail(req.userId, req.params.identifier);

    if (!activity?.stravaActivityId) {
      return res.status(400).json({ error: 'Not a Strava-linked activity' });
    }

    if (activity.streamSummary?.fetchedAt) {
      const ageMs = Date.now() - new Date(activity.streamSummary.fetchedAt).getTime();

      if (ageMs < 24 * 60 * 60 * 1000) {
        return res.json({ success: true, streams: activity.streamSummary, cached: true });
      }
    }

    const { fetchActivityStreams } = require('../services/stravaStreams');
    const streams = await fetchActivityStreams(accessToken, activity.stravaActivityId);
    streams.fetchedAt = new Date();

    activity.streamSummary = streams;
    activity.updatedAt = new Date();
    await activity.save();

    res.json({ success: true, streams, cached: false });
  } catch (error) {
    console.error('Streams error:', error);
    res.status(500).json({ error: 'Failed to fetch activity streams' });
  }
});

/**
 * Segment efforts for an activity
 * GET /api/strava/activities/:identifier/segments
 */
router.get('/activities/:identifier/segments', auth, async (req, res) => {
  try {
    const { accessToken } = await prepareUserForStravaApi(req.userId);
    const activity = await findOwnedActivityForStravaDetail(req.userId, req.params.identifier);

    if (!activity?.stravaActivityId) {
      return res.status(400).json({ error: 'Not a Strava-linked activity' });
    }

    const { fetchSegmentEfforts } = require('../services/stravaStreams');
    const segmentEfforts = await fetchSegmentEfforts(accessToken, activity.stravaActivityId, 15);

    activity.segmentEfforts = segmentEfforts;
    activity.updatedAt = new Date();
    await activity.save();

    res.json({ success: true, segmentEfforts });
  } catch (error) {
    console.error('Segment efforts error:', error);
    res.status(500).json({ error: 'Failed to fetch segment efforts' });
  }
});

module.exports = router;
module.exports.syncRecentActivitiesForUser = syncRecentActivitiesForUser;
module.exports.generatePerformanceVector = generatePerformanceVector;
module.exports.buildActivityUpdate = buildActivityUpdate;
