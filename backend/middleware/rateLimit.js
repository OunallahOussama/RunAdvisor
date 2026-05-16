const rateLimit = require('express-rate-limit');

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');

  if (parts.length < 2) {
    return null;
  }

  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getClientKey(req) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const payload = decodeJwtPayload(authHeader.slice(7));

    if (payload?.sub) {
      return `auth0:${payload.sub}`;
    }
  }

  return req.ip || 'unknown';
}

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientKey,
    handler: (req, res, _next, options) => {
      res.status(options.statusCode).json({
        error: 'Too many requests',
        message: message || 'Rate limit exceeded. Please try again later.',
        retryAfter: res.getHeader('Retry-After')
      });
    }
  });
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const generalApiLimiter = createLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || FIFTEEN_MINUTES,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  message: 'Too many API requests. Please slow down and try again shortly.'
});

const authLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 60,
  message: 'Too many authentication requests. Please wait before trying again.'
});

const stravaLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: Number(process.env.RATE_LIMIT_STRAVA_MAX) || 120,
  message: 'Too many Strava API requests. Please wait before syncing or loading activities again.'
});

const stravaWebhookLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_STRAVA_WEBHOOK_MAX) || 120,
  message: 'Too many Strava webhook requests.'
});

module.exports = {
  decodeJwtPayload,
  getClientKey,
  generalApiLimiter,
  authLimiter,
  stravaLimiter,
  stravaWebhookLimiter
};
