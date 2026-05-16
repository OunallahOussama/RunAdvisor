function validationError(res, message, details = []) {
  return res.status(400).json({
    error: 'Validation failed',
    message,
    details
  });
}

function requireStringField(body, field, { maxLength = 2048, label = field } = {}) {
  const value = body?.[field];

  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, message: `${label} is required.` };
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return { ok: false, message: `${label} must be at most ${maxLength} characters.` };
  }

  return { ok: true, value: trimmed };
}

function validateStravaAuthenticate(req, res, next) {
  const codeResult = requireStringField(req.body, 'code', {
    maxLength: 512,
    label: 'Strava authorization code'
  });

  if (!codeResult.ok) {
    return validationError(res, codeResult.message);
  }

  req.body.code = codeResult.value;

  if (req.body.redirectUri != null) {
    const redirectResult = requireStringField(req.body, 'redirectUri', {
      maxLength: 2048,
      label: 'redirectUri'
    });

    if (!redirectResult.ok) {
      return validationError(res, redirectResult.message);
    }

    if (!/^https?:\/\//i.test(redirectResult.value)) {
      return validationError(res, 'redirectUri must be an http or https URL.');
    }

    req.body.redirectUri = redirectResult.value;
  }

  return next();
}

function validateSyncRecent(req, res, next) {
  const rawLimit = req.body?.limit ?? req.query?.limit;

  if (rawLimit == null || rawLimit === '') {
    req.syncLimit = 20;
    return next();
  }

  const limit = Number.parseInt(rawLimit, 10);

  if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
    return validationError(res, 'limit must be a number between 1 and 50.');
  }

  req.syncLimit = limit;
  return next();
}

module.exports = {
  validateStravaAuthenticate,
  validateSyncRecent
};
