const { stravaAxios } = require('../utils/stravaCredentials');
const { mapStravaUploadError } = require('../utils/stravaActivityPayload');

async function deleteActivityOnStrava(accessToken, stravaActivityId) {
  await stravaAxios.delete(
    `https://www.strava.com/api/v3/activities/${encodeURIComponent(stravaActivityId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  return {
    deleted: true,
    activityId: String(stravaActivityId)
  };
}

async function deleteActivityFromStrava(accessToken, stravaActivityId) {
  try {
    return await deleteActivityOnStrava(accessToken, stravaActivityId);
  } catch (error) {
    if (error.response?.status === 404) {
      return {
        deleted: true,
        activityId: String(stravaActivityId),
        alreadyRemoved: true,
        message: 'Activity was already removed on Strava.'
      };
    }

    const failure = mapStravaUploadError(error);

    return {
      deleted: false,
      needsReconnect: failure.needsReconnect,
      message: failure.message
    };
  }
}

module.exports = {
  deleteActivityFromStrava
};
