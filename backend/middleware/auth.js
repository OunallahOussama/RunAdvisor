const { auth: validateAccessToken } = require('express-oauth2-jwt-bearer');
const User = require('../models/User');

const checkJwt = validateAccessToken({
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  audience: process.env.AUTH0_AUDIENCE
});

async function resolveUserFromClaims(claims = {}) {
  const auth0UserId = claims.sub;
  const normalizedEmail = typeof claims.email === 'string'
    ? claims.email.toLowerCase()
    : undefined;

  let user = await User.findOne({ auth0UserId });

  if (!user && normalizedEmail) {
    user = await User.findOne({ email: normalizedEmail });
  }

  if (!user) {
    user = new User({
      auth0UserId,
      authProvider: 'auth0',
      email: normalizedEmail,
      name: claims.name,
      picture: claims.picture
    });
  } else {
    user.auth0UserId = user.auth0UserId || auth0UserId;
    user.authProvider = 'auth0';
    user.updatedAt = new Date();

    if (normalizedEmail) {
      user.email = normalizedEmail;
    }

    if (claims.name) {
      user.name = claims.name;
    }

    if (claims.picture) {
      user.picture = claims.picture;
    }
  }

  await user.save();

  return user;
}

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

    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      error: 'Invalid token',
      message: error.message || 'Unauthorized'
    });
  }
};
