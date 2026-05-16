const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { isAdminUser } = require('../utils/adminAccess');
const { getClaimEmail } = require('../utils/authClaims');
const { buildAdminOverview, buildApplicationInsights } = require('../services/usageAnalytics');
const UsageEvent = require('../models/UsageEvent');

const router = express.Router();

router.use(auth);

router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const claimEmail = getClaimEmail(req.auth0);
    const email = user?.email || claimEmail || null;

    res.json({
      success: true,
      isAdmin: isAdminUser(user, req.auth0),
      email,
      claimEmail: claimEmail || null,
      auth0UserId: user?.auth0UserId || req.auth0?.sub || null
    });
  } catch (error) {
    console.error('Admin me error:', error);
    res.status(500).json({ error: 'Failed to resolve admin access' });
  }
});

router.use(admin);

router.get('/overview', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 90);
    const overview = await buildAdminOverview(days);
    res.json({ success: true, overview });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to load admin overview' });
  }
});

router.get('/usage', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await UsageEvent.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(500)
      .select('event path method statusCode durationMs userId createdAt')
      .lean();

    res.json({ success: true, days, events });
  } catch (error) {
    console.error('Admin usage error:', error);
    res.status(500).json({ error: 'Failed to load usage events' });
  }
});

router.get('/insights', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 90);
    const insights = await buildApplicationInsights(days);
    res.json({ success: true, insights });
  } catch (error) {
    console.error('Admin insights error:', error);
    res.status(500).json({ error: 'Failed to load application insights' });
  }
});

module.exports = router;
