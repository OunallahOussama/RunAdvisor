const UsageEvent = require('../models/UsageEvent');

function resolveEventName(req) {
  const path = req.path || '';

  if (path.includes('/strava/sync')) {
    return 'strava_sync';
  }

  if (path.includes('/strava/authenticate')) {
    return 'strava_connect';
  }

  if (path.includes('/recommendations/coach-review')) {
    return 'training_review';
  }

  if (path.includes('/coach/')) {
    return 'coach_feature';
  }

  if (path.includes('/admin/')) {
    return 'admin_access';
  }

  if (path.includes('/activities') && path.includes('/similar')) {
    return 'similar_runs';
  }

  return 'api_request';
}

module.exports = function usageTracker(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;

    UsageEvent.create({
      userId: req.userId || undefined,
      event: resolveEventName(req),
      path: req.originalUrl || req.path,
      method: req.method,
      statusCode: res.statusCode,
      durationMs,
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    }).catch((error) => {
      console.error('Usage tracking failed:', error.message);
    });
  });

  next();
};
