const { stravaAxios } = require('../utils/stravaCredentials');
const { buildStravaCreateForm, mapStravaUploadError } = require('../utils/stravaActivityPayload');

async function createActivityOnStrava(accessToken, activity) {
  const form = buildStravaCreateForm(activity);
  const response = await stravaAxios.post('https://www.strava.com/api/v3/activities', form.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data;
}

async function uploadActivityToStrava(accessToken, activity) {
  const stravaActivity = await createActivityOnStrava(accessToken, activity);

  return {
    posted: true,
    activityId: stravaActivity.id,
    url: `https://www.strava.com/activities/${stravaActivity.id}`
  };
}

module.exports = {
  buildStravaCreateForm,
  mapStravaUploadError,
  uploadActivityToStrava
};
