const express = require('express');
const axios = require('axios');
const Activity = require('../models/Activity');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();
const MAX_TRAINING_PLAN_BYTES = 2 * 1024 * 1024;

// Configure axios for Strava API calls
const stravaAxios = axios.create({
  httpsAgent: new (require('https').Agent)({
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  })
});

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

async function ensureConnectedUser(userId) {
  const user = await User.findById(userId);

  if (!user?.stravaAccessToken || !user?.stravaRefreshToken || !user?.stravaId) {
    const error = new Error('Connect Strava first before syncing activities.');
    error.statusCode = 400;
    throw error;
  }

  if (user.stravaExpiresAt && new Date() > user.stravaExpiresAt) {
    await refreshStravaToken(user);
  }

  return user;
}

function buildActivityUpdate(userId, activity) {
  const normalizedType = normalizeStravaType(activity.type);

  if (!normalizedType) {
    return null;
  }

  const pace = calculatePace(activity);

  return {
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
    date: new Date(activity.start_date),
    polyline: activity.map?.summary_polyline || activity.map?.polyline,
    performanceVector: generatePerformanceVector(activity),
    notes: activity.description
  };
}

async function syncRecentActivitiesForUser(userId, user, limit = 20) {
  const response = await stravaAxios.get('https://www.strava.com/api/v3/athlete/activities', {
    headers: {
      Authorization: `Bearer ${user.stravaAccessToken}`
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
router.post('/authenticate', auth, async (req, res) => {
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

    await User.findByIdAndUpdate(userId, {
      stravaId: athlete.id,
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaExpiresAt: new Date(expires_at * 1000)
    });

    res.json({
      success: true,
      athlete,
      accessToken: access_token
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
router.post('/sync-recent', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.body.limit || req.query.limit, 10) || 20, 50);
    const user = await ensureConnectedUser(req.userId);
    const syncResult = await syncRecentActivitiesForUser(req.userId, user, limit);

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
    const user = await ensureConnectedUser(req.userId);
    const syncResult = await syncRecentActivitiesForUser(req.userId, user, limit);

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
 * Sync single activity details
 * POST /api/strava/sync-activity/:activityId
 */
router.post('/sync-activity/:activityId', auth, async (req, res) => {
  try {
    const user = await ensureConnectedUser(req.userId);

    const response = await stravaAxios.get(
      `https://www.strava.com/api/v3/activities/${req.params.activityId}`,
      {
        headers: { Authorization: `Bearer ${user.stravaAccessToken}` }
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
 * Helper function to refresh Strava token
 */
async function refreshStravaToken(user) {
  const response = await stravaAxios.post('https://www.strava.com/api/v3/oauth/token', {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: user.stravaRefreshToken
  });

  user.stravaAccessToken = response.data.access_token;
  user.stravaRefreshToken = response.data.refresh_token;
  user.stravaExpiresAt = new Date(response.data.expires_at * 1000);
  await user.save();
}

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

module.exports = router;
