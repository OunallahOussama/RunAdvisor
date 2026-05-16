const express = require('express');
const User = require('../models/User');
const UsageEvent = require('../models/UsageEvent');
const { stravaWebhookLimiter } = require('../middleware/rateLimit');
const {
  getSigningSecret,
  isSignatureVerificationRequired,
  verifyStravaWebhookSignature
} = require('../utils/stravaWebhookSignature');

const router = express.Router();

function verifyWebhookToken(received) {
  const expected = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

  if (!expected) {
    return false;
  }

  return received === expected;
}

function isWebhookProcessingEnabled() {
  return Boolean(process.env.STRAVA_WEBHOOK_VERIFY_TOKEN);
}

/**
 * Strava subscription validation
 * GET /api/strava/webhook?hub.verify_token=...&hub.challenge=...
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && verifyWebhookToken(token)) {
    return res.json({ 'hub.challenge': challenge });
  }

  return res.status(403).send('Forbidden');
});

/**
 * Strava activity events
 * POST /api/strava/webhook
 */
router.post('/webhook', stravaWebhookLimiter, async (req, res) => {
  if (!isWebhookProcessingEnabled()) {
    return res.status(503).json({
      error: 'Webhook not configured',
      message: 'Set STRAVA_WEBHOOK_VERIFY_TOKEN before accepting Strava events.'
    });
  }

  if (isSignatureVerificationRequired()) {
    const secret = getSigningSecret();

    if (!secret) {
      return res.status(503).json({
        error: 'Webhook signing not configured',
        message: 'Set STRAVA_WEBHOOK_SIGNING_SECRET or STRAVA_CLIENT_SECRET for signature verification.'
      });
    }

    const verification = verifyStravaWebhookSignature({
      signatureHeader: req.headers['x-strava-signature'],
      rawBody: req.rawBody
    });

    if (!verification.ok) {
      return res.status(403).json({
        error: 'Invalid webhook signature',
        message: 'Strava webhook signature verification failed.'
      });
    }
  }

  res.status(200).json({ received: true });

  const body = req.body || {};
  const objectType = body.object_type;
  const aspectType = body.aspect_type;
  const ownerId = body.owner_id;
  const objectId = body.object_id;

  try {
    await UsageEvent.create({
      event: 'strava_webhook',
      path: '/api/strava/webhook',
      method: 'POST',
      metadata: { objectType, aspectType, ownerId, objectId }
    });

    if (objectType !== 'activity' || !['create', 'update'].includes(aspectType)) {
      return;
    }

    if (!ownerId || !objectId) {
      return;
    }

    const user = await User.findOne({ stravaId: String(ownerId) });

    if (!user) {
      return;
    }

    const { syncRecentActivitiesForUser } = require('./strava');
    const { prepareUserForStravaApi: prepare } = require('../utils/stravaCredentials');
    const { user: refreshedUser, accessToken } = await prepare(user._id);

    try {
      const { stravaAxios } = require('../utils/stravaCredentials');
      await stravaAxios.get(
        `https://www.strava.com/api/v3/activities/${objectId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (verifyError) {
      console.warn('Strava webhook activity verification failed:', verifyError.message);
      return;
    }

    await syncRecentActivitiesForUser(user._id, refreshedUser, accessToken, 5);
  } catch (error) {
    console.error('Strava webhook processing error:', error.message);
  }
});

module.exports = router;
