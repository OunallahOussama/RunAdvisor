const express = require('express');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const {
  getOrCreateWeeklySummary,
  clampWindowDays,
  WEEKLY_SUMMARY_DEFAULT_WINDOW_DAYS
} = require('../services/openaiCoach');
const { searchActivitiesSemantically, buildSemanticVector } = require('../services/semanticSearch');
const { buildLoadRiskAssessment } = require('../services/loadRisk');

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

function parseForceFlag(value) {
  if (value === true) {
    return true;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return false;
}

/**
 * Smart weekly summary endpoint.
 *
 * Wraps the same analytics + report pipeline that powers the
 * /training-report page so the dashboard card and the full report stay
 * in sync. Results are cached in the Report collection for ~30 minutes
 * per (user, windowDays) pair to avoid burning OpenAI calls on every
 * dashboard mount; pass `?force=true` to bypass.
 *
 * POST /api/coach/weekly-summary
 *   body:    { windowDays?: number, force?: boolean, days?: number (legacy) }
 *   query:   ?windowDays=&force=
 *   GET works too, for easier curl / refresh UX.
 */
async function handleWeeklySummary(req, res) {
  try {
    const requested =
      req.body?.windowDays
      ?? req.query?.windowDays
      ?? req.body?.days
      ?? req.query?.days
      ?? WEEKLY_SUMMARY_DEFAULT_WINDOW_DAYS;
    const windowDays = clampWindowDays(requested);
    const force = parseForceFlag(req.body?.force ?? req.query?.force);

    const result = await getOrCreateWeeklySummary({
      userId: req.userId,
      user: req.user,
      windowDays,
      force
    });

    const sinceDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const activities = await Activity.find({
      userId: req.userId,
      date: { $gte: sinceDate }
    }).sort({ date: -1 });

    const loadRisk = buildLoadRiskAssessment(activities, req.user);

    res.json({
      success: true,
      fromCache: result.fromCache,
      id: result.id,
      windowDays: result.windowDays,
      generatedAt: result.generatedAt,
      source: result.source,
      analytics: result.analytics,
      report: result.report,
      // Backwards-compatible flat summary fields (older clients only render these)
      summary: result.summary,
      headline: result.headline,
      bullets: result.bullets,
      loadRisk
    });
  } catch (error) {
    console.error('Weekly summary error:', error);
    res.status(500).json({
      error: 'Failed to generate weekly summary',
      message: error.message || 'Unexpected error generating weekly summary.'
    });
  }
}

router.post('/weekly-summary', auth, handleWeeklySummary);
router.get('/weekly-summary', auth, handleWeeklySummary);

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
