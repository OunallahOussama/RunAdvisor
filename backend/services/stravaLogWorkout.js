const { uploadActivityToStrava, mapStravaUploadError } = require('./stravaCreateActivity');
const { buildPlannedWorkoutDescription } = require('../utils/plannedWorkoutDescription');

function normalizeScheduledDate(scheduledDate) {
  if (scheduledDate) {
    const parsed = new Date(scheduledDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

async function logPlannedWorkoutToStrava(accessToken, payload) {
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
  } = payload;

  const durationSeconds = Math.max(60, Math.round(Number(durationMinutes) || 30) * 60);
  const distanceMeters = distanceKm > 0 ? Math.round(Number(distanceKm) * 1000) : 0;
  const notes = buildPlannedWorkoutDescription({
    description,
    sessionType,
    targetPace,
    rpe,
    hrZone,
    sessionBlocks
  });

  return uploadActivityToStrava(accessToken, {
    name: title || 'Planned run',
    type: 'run',
    date: normalizeScheduledDate(scheduledDate),
    duration: durationSeconds,
    distance: distanceMeters,
    notes,
    visibility: 'only_me'
  });
}

function mapLogWorkoutError(error) {
  if (error.statusCode === 400) {
    return {
      status: 400,
      body: {
        success: false,
        message: error.message || 'Connect Strava first.'
      }
    };
  }

  const mapped = mapStravaUploadError(error);

  if (mapped.needsReconnect) {
    return {
      status: 403,
      body: {
        success: false,
        code: 'SCOPE_REQUIRED',
        message:
          mapped.message ||
          'Reconnect Strava with write access (activity:write) to log workouts.'
      }
    };
  }

  return {
    status: error.response?.status >= 400 && error.response?.status < 600 ? error.response.status : 502,
    body: {
      success: false,
      message: mapped.message || error.message || 'Failed to log workout to Strava.'
    }
  };
}

module.exports = {
  logPlannedWorkoutToStrava,
  mapLogWorkoutError,
  normalizeScheduledDate
};
