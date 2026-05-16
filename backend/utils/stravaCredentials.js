const axios = require('axios');
const User = require('../models/User');
const { encrypt, decrypt } = require('./crypto');

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

const stravaAxios = axios.create({
  httpsAgent: new (require('https').Agent)({
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  })
});

function readTokensFromUser(user) {
  if (!user) {
    return { accessToken: null, refreshToken: null };
  }

  return {
    accessToken: decrypt(user.stravaAccessToken),
    refreshToken: decrypt(user.stravaRefreshToken)
  };
}

async function persistStravaTokens(userId, { accessToken, refreshToken, expiresAt, stravaId }) {
  const update = {
    stravaAccessToken: encrypt(accessToken),
    stravaRefreshToken: encrypt(refreshToken),
    stravaExpiresAt: expiresAt,
    updatedAt: new Date()
  };

  if (stravaId != null) {
    update.stravaId = stravaId;
  }

  return User.findByIdAndUpdate(userId, update, { new: true });
}

async function refreshStravaToken(user) {
  const { refreshToken } = readTokensFromUser(user);

  if (!refreshToken) {
    throw new Error('Strava refresh token is missing.');
  }

  const response = await stravaAxios.post('https://www.strava.com/api/v3/oauth/token', {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  return persistStravaTokens(user._id, {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresAt: new Date(response.data.expires_at * 1000)
  });
}

function tokenNeedsRefresh(user) {
  if (!user?.stravaExpiresAt) {
    return false;
  }

  return Date.now() >= new Date(user.stravaExpiresAt).getTime() - TOKEN_REFRESH_BUFFER_MS;
}

async function prepareUserForStravaApi(userId) {
  let user = await User.findById(userId);

  const tokens = readTokensFromUser(user);

  if (!user?.stravaId || !tokens.accessToken || !tokens.refreshToken) {
    const error = new Error('Connect Strava first before syncing activities.');
    error.statusCode = 400;
    throw error;
  }

  if (tokenNeedsRefresh(user)) {
    user = await refreshStravaToken(user);
  }

  const freshTokens = readTokensFromUser(user);

  return {
    user,
    accessToken: freshTokens.accessToken
  };
}

module.exports = {
  readTokensFromUser,
  persistStravaTokens,
  refreshStravaToken,
  prepareUserForStravaApi,
  tokenNeedsRefresh,
  stravaAxios
};
