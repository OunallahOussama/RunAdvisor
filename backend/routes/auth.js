const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { invalidateUserCache } = require('../services/userResolver');

const router = express.Router();

/**
 * Auth0 is the primary authentication provider.
 * Local registration is disabled.
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  res.status(410).json({
    error: 'Local registration is disabled',
    message: 'Use Auth0 Universal Login to create an account.'
  });
});

/**
 * Auth0 is the primary authentication provider.
 * Local login is disabled.
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  res.status(410).json({
    error: 'Local login is disabled',
    message: 'Use Auth0 Universal Login to sign in.'
  });
});

/**
 * Serialize user for API responses
 */
function serializeUser(user) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    auth0UserId: user.auth0UserId,
    authProvider: user.authProvider,
    stravaId: user.stravaId,
    stravaExpiresAt: user.stravaExpiresAt,
    stravaLastSyncAt: user.stravaLastSyncAt,
    trainingPlanCount: Array.isArray(user.trainingPlans) ? user.trainingPlans.length : 0,
    age: user.age,
    experience: user.experience,
    preferredDistance: user.preferredDistance,
    trainingGoals: user.trainingGoals,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function mergeUserByEmail(currentUser, { email, name, picture }) {
  const normalizedEmail = typeof email === 'string' && email.trim()
    ? email.trim().toLowerCase()
    : '';

  if (!normalizedEmail) {
    return currentUser;
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (!existingUser || existingUser._id.toString() === currentUser._id.toString()) {
    return currentUser;
  }

  const mergedUser = existingUser;

  if (currentUser.auth0UserId) {
    await User.deleteOne({ _id: currentUser._id });
    mergedUser.auth0UserId = currentUser.auth0UserId;
  }

  mergedUser.authProvider = 'auth0';
  mergedUser.email = normalizedEmail;
  mergedUser.name = typeof name === 'string' && name.trim()
    ? name.trim()
    : (mergedUser.name || currentUser.name);
  mergedUser.picture = typeof picture === 'string' && picture.trim()
    ? picture.trim()
    : (mergedUser.picture || currentUser.picture);

  if (mergedUser.age == null && currentUser.age != null) {
    mergedUser.age = currentUser.age;
  }

  if (!mergedUser.experience && currentUser.experience) {
    mergedUser.experience = currentUser.experience;
  }

  if (mergedUser.preferredDistance == null && currentUser.preferredDistance != null) {
    mergedUser.preferredDistance = currentUser.preferredDistance;
  }

  if ((!Array.isArray(mergedUser.trainingGoals) || mergedUser.trainingGoals.length === 0)
    && Array.isArray(currentUser.trainingGoals)
    && currentUser.trainingGoals.length > 0) {
    mergedUser.trainingGoals = currentUser.trainingGoals;
  }

  if (!mergedUser.stravaId && currentUser.stravaId) {
    mergedUser.stravaId = currentUser.stravaId;
    mergedUser.stravaAccessToken = currentUser.stravaAccessToken;
    mergedUser.stravaRefreshToken = currentUser.stravaRefreshToken;
    mergedUser.stravaExpiresAt = currentUser.stravaExpiresAt;
  }

  mergedUser.updatedAt = new Date();
  await mergedUser.save();

  return mergedUser;
}

/**
 * Sync Auth0 profile details into the local user document
 * POST /api/auth/sync
 */
router.post('/sync', auth, async (req, res) => {
  try {
    const { email, name, picture } = req.body;
    let user = req.user;

    user = await mergeUserByEmail(user, { email, name, picture });

    if (typeof email === 'string' && email.trim()) {
      user.email = email.trim().toLowerCase();
    }

    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }

    if (typeof picture === 'string' && picture.trim()) {
      user.picture = picture.trim();
    }

    user.authProvider = 'auth0';
    user.updatedAt = new Date();
    await user.save();
    invalidateUserCache(req.auth0?.sub);

    res.json({
      success: true,
      user: serializeUser(user)
    });
  } catch (error) {
    console.error('Profile sync error:', error);
    res.status(500).json({ error: 'Failed to sync profile' });
  }
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json({ success: true, user: serializeUser(user) });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * Update user preferences
 * PUT /api/auth/preferences
 */
router.put('/preferences', auth, async (req, res) => {
  try {
    const { age, experience, preferredDistance, trainingGoals } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { 
        age, 
        experience, 
        preferredDistance, 
        trainingGoals,
        updatedAt: new Date()
      },
      { new: true }
    );
    invalidateUserCache(req.auth0?.sub);

    res.json({ success: true, user: serializeUser(user) });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
