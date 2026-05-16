const express = require('express');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const { generateWeeklyCoachSummary } = require('../services/openaiCoach');
const { searchActivitiesSemantically, buildSemanticVector } = require('../services/semanticSearch');
const { buildTrainingProgress } = require('../services/progressService');
const { buildLoadRiskAssessment } = require('../services/loadRisk');
const { buildCoachReview } = require('../services/trainingInsights');

const router = express.Router();

const ALLOWED_CLIENT_USAGE_EVENTS = new Set([
  'semantic_search',
  'similar_runs_view',
  'coach_summary_view',
  'pwa_install_prompt',
  'notification_permission',
  'offline_cache_hit',
  'training_sync'
]);

router.post('/weekly-summary', auth, async (req, res) => {
  try {
    const days = parseInt(req.body.days, 10) || 28;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const activities = await Activity.find({
      userId: req.userId,
      date: { $gte: sinceDate }
    }).sort({ date: -1 });

    const progress = buildTrainingProgress(activities, req.user);
    const coachReview = buildCoachReview(activities, req.user, { days }).coachReview;
    const summary = await generateWeeklyCoachSummary({
      user: req.user,
      activities,
      progress,
      coachReview
    });

    res.json({
      success: true,
      summary,
      loadRisk: buildLoadRiskAssessment(activities, req.user)
    });
  } catch (error) {
    console.error('Weekly summary error:', error);
    res.status(500).json({ error: 'Failed to generate weekly summary' });
  }
});

router.get('/semantic-search', auth, async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();

    if (!query) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    const sinceDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
    const activities = await Activity.find({
      userId: req.userId,
      date: { $gte: sinceDate }
    }).sort({ date: -1 });

    const results = searchActivitiesSemantically(activities, query, 12);

    res.json({ success: true, query, results });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: 'Semantic search failed' });
  }
});

router.post('/track-usage', auth, async (req, res) => {
  try {
    const UsageEvent = require('../models/UsageEvent');
    const { event, metadata } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'event is required' });
    }

    const normalizedEvent = String(event).trim();

    if (!ALLOWED_CLIENT_USAGE_EVENTS.has(normalizedEvent)) {
      return res.status(400).json({
        error: 'Invalid event',
        message: 'Event name is not allowed for client tracking.'
      });
    }

    await UsageEvent.create({
      userId: req.userId,
      event: normalizedEvent,
      path: '/client',
      method: 'TRACK',
      metadata: metadata || {}
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

module.exports = router;
module.exports.buildSemanticVector = buildSemanticVector;
