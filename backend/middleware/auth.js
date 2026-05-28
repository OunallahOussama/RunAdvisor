const { auth: validateAccessToken } = require('express-oauth2-jwt-bearer');
const { resolveUserFromClaims } = require('../services/userResolver');

const checkJwt = validateAccessToken({
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  audience: process.env.AUTH0_AUDIENCE
});

module.exports = async function authMiddleware(req, res, next) {
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
    return res.status(500).json({
      error: 'Auth0 is not configured on the server'
    });
  }

  try {
    await new Promise((resolve, reject) => {
      checkJwt(req, res, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    const claims = req.auth?.payload || {};

    if (!claims.sub) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Missing Auth0 subject claim.'
      });
    }

    const user = await resolveUserFromClaims(claims);
    req.userId = user._id;
    req.user = user;
    req.auth0 = claims;

    const { touchUserActivity } = require('../services/userActivity');
    touchUserActivity(user._id);

    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      error: 'Invalid token',
      message: error.message || 'Unauthorized'
    });
  }
};
