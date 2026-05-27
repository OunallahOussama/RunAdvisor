const Activity = require('../models/Activity');
const User = require('../models/User');
const { buildActivityInsight } = require('./activityInsights');
const { pushDescriptionToStrava } = require('./stravaUpdateActivity');
const { prepareUserForStravaApi, stravaAxios } = require('../utils/stravaCredentials');
const { pickStravaActivityDetail } = require('../utils/pickStravaActivityDetail');
const {
  buildStravaInsightDescription,
  descriptionHasRunAdvisorInsight
} = require('../utils/stravaInsightDescription');

const pendingPushes = new Set();

function stravaInsightPushAllowed(user) {
  return user?.consent?.stravaActivityInsights !== false;
}

function pickLatestSyncedActivity(activities = []) {
  if (!activities.length) {
    return null;
  }

  return [...activities].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

/**
 * After Strava sync, async write TL;DR + tech insight to the user's last Strava activity only.
 */
function scheduleStravaInsightPush(userId, latestActivity) {
  if (!latestActivity?.stravaActivityId || !latestActivity?._id) {
    return;
  }

  const pushKey = `${userId}:${latestActivity.stravaActivityId}`;

  if (pendingPushes.has(pushKey)) {
    return;
  }

  pendingPushes.add(pushKey);

  setImmediate(async () => {
    try {
      await enrichLatestStravaActivityDescription(userId, latestActivity._id);
    } catch (error) {
      console.error('Strava insight push failed:', error.message || error);
    } finally {
      pendingPushes.delete(pushKey);
    }
  });
}

async function isLatestStravaActivityForUser(userId, activity) {
  const latest = await Activity.findOne({
    userId,
    stravaActivityId: { $exists: true, $ne: null, $ne: '' }
  })
    .sort({ date: -1 })
    .select('_id');

  return latest && String(latest._id) === String(activity._id);
}

async function enrichLatestStravaActivityDescription(userId, activityId) {
  const user = await User.findById(userId);

  if (!user || !stravaInsightPushAllowed(user)) {
    return { skipped: true, reason: 'disabled' };
  }

  const activity = await Activity.findOne({ _id: activityId, userId });

  if (!activity?.stravaActivityId) {
    return { skipped: true, reason: 'not_strava' };
  }

  if (activity.stravaInsightPushedAt) {
    return { skipped: true, reason: 'already_pushed' };
  }

  if (!(await isLatestStravaActivityForUser(userId, activity))) {
    return { skipped: true, reason: 'not_latest' };
  }

  const { accessToken } = await prepareUserForStravaApi(userId);
  const stravaRes = await stravaAxios.get(
    `https://www.strava.com/api/v3/activities/${activity.stravaActivityId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const stravaDetail = pickStravaActivityDetail(stravaRes.data);
  const existingDescription = stravaDetail?.description || activity.notes || '';

  if (descriptionHasRunAdvisorInsight(existingDescription)) {
    activity.stravaInsightPushedAt = new Date();
    await activity.save();
    return { skipped: true, reason: 'already_on_strava' };
  }

  const insight = buildActivityInsight(activity, stravaDetail);
  const description = buildStravaInsightDescription(insight, existingDescription);
  const pushResult = await pushDescriptionToStrava(
    accessToken,
    activity.stravaActivityId,
    description
  );

  if (pushResult.updated) {
    activity.notes = description;
    activity.stravaInsightPushedAt = new Date();
    await activity.save();
    return { updated: true, activityId: activity._id };
  }

  if (pushResult.needsReconnect) {
    console.warn('Strava insight push needs activity:write reconnect for user', userId);
  }

  return { updated: false, message: pushResult.message };
}

module.exports = {
  scheduleStravaInsightPush,
  enrichLatestStravaActivityDescription,
  pickLatestSyncedActivity,
  stravaInsightPushAllowed
};
