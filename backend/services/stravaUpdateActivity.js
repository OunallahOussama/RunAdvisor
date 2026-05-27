const { stravaAxios } = require('../utils/stravaCredentials');
const { mapStravaUploadError } = require('../utils/stravaActivityPayload');

async function updateStravaActivityDescription(accessToken, stravaActivityId, description) {
  const params = new URLSearchParams();
  params.set('description', String(description || '').slice(0, 16000));

  const response = await stravaAxios.put(
    `https://www.strava.com/api/v3/activities/${encodeURIComponent(stravaActivityId)}`,
    params.toString(),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data;
}

async function pushDescriptionToStrava(accessToken, stravaActivityId, description) {
  try {
    const data = await updateStravaActivityDescription(accessToken, stravaActivityId, description);
    return { updated: true, activityId: data?.id || stravaActivityId };
  } catch (error) {
    const mapped = mapStravaUploadError(error);
    return {
      updated: false,
      needsReconnect: mapped.needsReconnect,
      message: mapped.message
    };
  }
}

module.exports = {
  updateStravaActivityDescription,
  pushDescriptionToStrava
};
