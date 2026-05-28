const User = require('../models/User');

/**
 * Best-effort last-seen / login timestamps (does not block the request).
 */
function touchUserActivity(userId, { isLogin = false } = {}) {
  if (!userId) {
    return;
  }

  const now = new Date();
  const update = { lastActiveAt: now, updatedAt: now };

  if (isLogin) {
    update.lastLoginAt = now;
  }

  User.updateOne({ _id: userId }, { $set: update }).catch((error) => {
    console.error('touchUserActivity failed:', error.message || error);
  });
}

module.exports = {
  touchUserActivity
};
