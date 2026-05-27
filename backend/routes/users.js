const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { invalidateUserCache } = require('../services/userResolver');

const router = express.Router();

const VALID_GOALS = new Set(['5k', '10k', 'half', 'marathon', 'general_fitness']);

function serializeConsent(user) {
  const consent = user?.consent?.toObject ? user.consent.toObject() : (user?.consent || {});
  return {
    shareAnonymizedTraining: Boolean(consent.shareAnonymizedTraining),
    marketingEmails: Boolean(consent.marketingEmails),
    notifications: {
      browser: Boolean(consent.notifications?.browser),
      recommendations: consent.notifications?.recommendations !== false,
      weeklyReport: consent.notifications?.weeklyReport !== false
    },
    stravaActivityInsights: consent.stravaActivityInsights !== false,
    consentVersion: consent.consentVersion || null,
    consentAcceptedAt: consent.consentAcceptedAt || null
  };
}

function serializeOnboarding(user) {
  return {
    onboardingCompletedAt: user.onboardingCompletedAt || null,
    runningGoal: user.runningGoal || null
  };
}

/**
 * GET /api/users/me/consent
 * Return the current user's consent + notification preferences.
 */
router.get('/me/consent', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, consent: serializeConsent(user) });
  } catch (error) {
    console.error('Consent fetch error:', error);
    res.status(500).json({ error: 'Failed to load consent preferences' });
  }
});

/**
 * PUT /api/users/me/consent
 * Update the consent + notification preferences.
 *
 * Body (partial allowed):
 *   shareAnonymizedTraining, marketingEmails,
 *   notifications: { browser, recommendations, weeklyReport },
 *   stravaActivityInsights: boolean (write TL;DR to latest Strava activity),
 *   acceptVersion: string  (sets consentAcceptedAt + consentVersion)
 */
router.put('/me/consent', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.consent = user.consent || {};
    const body = req.body || {};

    if (typeof body.shareAnonymizedTraining === 'boolean') {
      user.consent.shareAnonymizedTraining = body.shareAnonymizedTraining;
    }
    if (typeof body.marketingEmails === 'boolean') {
      user.consent.marketingEmails = body.marketingEmails;
    }
    if (typeof body.stravaActivityInsights === 'boolean') {
      user.consent.stravaActivityInsights = body.stravaActivityInsights;
    }

    if (body.notifications && typeof body.notifications === 'object') {
      user.consent.notifications = user.consent.notifications || {};
      const { browser, recommendations, weeklyReport } = body.notifications;
      if (typeof browser === 'boolean') user.consent.notifications.browser = browser;
      if (typeof recommendations === 'boolean') user.consent.notifications.recommendations = recommendations;
      if (typeof weeklyReport === 'boolean') user.consent.notifications.weeklyReport = weeklyReport;
    }

    if (body.acceptVersion) {
      user.consent.consentVersion = String(body.acceptVersion);
      user.consent.consentAcceptedAt = new Date();
    }

    user.updatedAt = new Date();
    await user.save();
    invalidateUserCache(req.auth0?.sub);

    res.json({ success: true, consent: serializeConsent(user) });
  } catch (error) {
    console.error('Consent update error:', error);
    res.status(500).json({ error: 'Failed to save consent preferences' });
  }
});

/**
 * PUT /api/users/me/onboarding-complete
 * Body: { runningGoal?: '5k' | '10k' | 'half' | 'marathon' | 'general_fitness',
 *         reset?: boolean }
 *
 * Stamps onboardingCompletedAt = now and stores the chosen running goal.
 * When reset=true, clears onboardingCompletedAt so the stepper re-runs
 * (used by the "Replay tour" entry in the Profile menu).
 */
router.put('/me/onboarding-complete', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const body = req.body || {};

    if (body.reset === true) {
      user.onboardingCompletedAt = null;
    } else {
      user.onboardingCompletedAt = new Date();
    }

    if (body.runningGoal === null) {
      user.runningGoal = null;
    } else if (VALID_GOALS.has(body.runningGoal)) {
      user.runningGoal = body.runningGoal;
    }

    user.updatedAt = new Date();
    await user.save();
    invalidateUserCache(req.auth0?.sub);

    res.json({
      success: true,
      onboarding: serializeOnboarding(user)
    });
  } catch (error) {
    console.error('Onboarding update error:', error);
    res.status(500).json({ error: 'Failed to update onboarding state' });
  }
});

/**
 * GET /api/users/me
 * Return a slim self-profile including onboarding + consent state so the
 * frontend can decide what to show on first authenticated load.
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      profile: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        stravaId: user.stravaId || null,
        ...serializeOnboarding(user)
      },
      consent: serializeConsent(user)
    });
  } catch (error) {
    console.error('User self fetch error:', error);
    res.status(500).json({ error: 'Failed to load user profile' });
  }
});

module.exports = router;
module.exports.serializeConsent = serializeConsent;
module.exports.serializeOnboarding = serializeOnboarding;
