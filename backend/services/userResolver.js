const User = require('../models/User');
const { getClaimEmail } = require('../utils/authClaims');

const CACHE_TTL_MS = 60 * 1000;
const userCache = new Map();

function claimsFingerprint(claims = {}) {
  return [
    claims.sub,
    claims.email,
    claims.name,
    claims.picture
  ].join('|');
}

function getCachedUser(auth0UserId) {
  const entry = userCache.get(auth0UserId);

  if (!entry || entry.expiresAt <= Date.now()) {
    userCache.delete(auth0UserId);
    return null;
  }

  return entry.user;
}

function setCachedUser(auth0UserId, user) {
  userCache.set(auth0UserId, {
    user,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

function invalidateUserCache(auth0UserId) {
  if (auth0UserId) {
    userCache.delete(auth0UserId);
  }
}

async function resolveUserFromClaims(claims = {}) {
  const auth0UserId = claims.sub;
  const normalizedEmail = getClaimEmail(claims);

  const cached = getCachedUser(auth0UserId);

  if (cached && cached._authFingerprint === claimsFingerprint(claims)) {
    if (!cached.email) {
      const fresh = await User.findOne({ auth0UserId });

      if (fresh?.email) {
        fresh._authFingerprint = claimsFingerprint(claims);
        setCachedUser(auth0UserId, fresh);
        return fresh;
      }
    }

    return cached;
  }

  let user = await User.findOne({ auth0UserId });

  if (!user && normalizedEmail) {
    user = await User.findOne({ email: normalizedEmail });
  }

  let changed = false;

  if (!user) {
    user = new User({
      auth0UserId,
      authProvider: 'auth0',
      email: normalizedEmail,
      name: claims.name,
      picture: claims.picture
    });
    changed = true;
  } else {
    if (!user.auth0UserId) {
      user.auth0UserId = auth0UserId;
      changed = true;
    }

    if (user.authProvider !== 'auth0') {
      user.authProvider = 'auth0';
      changed = true;
    }

    if (normalizedEmail && user.email !== normalizedEmail) {
      user.email = normalizedEmail;
      changed = true;
    }

    if (claims.name && user.name !== claims.name) {
      user.name = claims.name;
      changed = true;
    }

    if (claims.picture && user.picture !== claims.picture) {
      user.picture = claims.picture;
      changed = true;
    }
  }

  if (changed) {
    user.updatedAt = new Date();
    await user.save();
  }

  user._authFingerprint = claimsFingerprint(claims);
  setCachedUser(auth0UserId, user);

  return user;
}

module.exports = {
  resolveUserFromClaims,
  invalidateUserCache
};
