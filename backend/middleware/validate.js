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

const { VISIBILITY_VALUES, normalizeVisibility } = require('../utils/activityVisibility');

const ACTIVITY_TYPES = new Set([
  'run',
  'outdoor run',
  'trail run',
  'walk',
  'ride',
  'other'
]);

function validateCreateActivity(req, res, next) {
  const nameResult = requireStringField(req.body, 'name', {
    maxLength: 200,
    label: 'Activity name'
  });

  if (!nameResult.ok) {
    return validationError(res, nameResult.message);
  }

  const type = String(req.body?.type || '').trim().toLowerCase();

  if (!type || !ACTIVITY_TYPES.has(type)) {
    return validationError(res, 'type must be one of: run, outdoor run, trail run, walk, ride, other.');
  }

  const distanceKm = Number(req.body?.distance);

  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 500) {
    return validationError(res, 'distance must be a number between 0 and 500 km.');
  }

  const durationSeconds = Number(req.body?.duration);

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 86400) {
    return validationError(res, 'duration must be a number between 1 and 86400 seconds.');
  }

  const activityDate = new Date(req.body?.date);

  if (Number.isNaN(activityDate.getTime())) {
    return validationError(res, 'date must be a valid ISO date string.');
  }

  const optionalNumber = (field, { min, max, label }) => {
    const raw = req.body?.[field];

    if (raw == null || raw === '') {
      return { ok: true, value: null };
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value < min || value > max) {
      return {
        ok: false,
        message: `${label} must be a number between ${min} and ${max}.`
      };
    }

    return { ok: true, value };
  };

  const elevationGainResult = optionalNumber('elevationGain', { min: 0, max: 15000, label: 'elevationGain' });
  if (!elevationGainResult.ok) {
    return validationError(res, elevationGainResult.message);
  }

  const avgHeartRateResult = optionalNumber('avgHeartRate', { min: 30, max: 250, label: 'avgHeartRate' });
  if (!avgHeartRateResult.ok) {
    return validationError(res, avgHeartRateResult.message);
  }

  const maxHeartRateResult = optionalNumber('maxHeartRate', { min: 30, max: 250, label: 'maxHeartRate' });
  if (!maxHeartRateResult.ok) {
    return validationError(res, maxHeartRateResult.message);
  }

  const avgCadenceResult = optionalNumber('avgCadence', { min: 0, max: 300, label: 'avgCadence' });
  if (!avgCadenceResult.ok) {
    return validationError(res, avgCadenceResult.message);
  }

  let visibility = 'everyone';

  if (req.body?.visibility != null && req.body.visibility !== '') {
    const candidate = normalizeVisibility(req.body.visibility, '');

    if (!VISIBILITY_VALUES.includes(candidate)) {
      return validationError(res, 'visibility must be everyone, followers_only, or only_me.');
    }

    visibility = candidate;
  }

  let uploadToStrava = true;

  if (req.body?.uploadToStrava != null && req.body.uploadToStrava !== '') {
    const raw = req.body.uploadToStrava;

    if (typeof raw === 'boolean') {
      uploadToStrava = raw;
    } else if (raw === 'true' || raw === '1' || raw === 1) {
      uploadToStrava = true;
    } else if (raw === 'false' || raw === '0' || raw === 0) {
      uploadToStrava = false;
    } else {
      return validationError(res, 'uploadToStrava must be true or false.');
    }
  }

  let notes = null;

  if (req.body?.notes != null && req.body.notes !== '') {
    if (typeof req.body.notes !== 'string' || req.body.notes.length > 4000) {
      return validationError(res, 'notes must be a string up to 4000 characters.');
    }

    notes = req.body.notes.trim();
  }

  req.validatedActivity = {
    name: nameResult.value,
    type,
    distanceKm,
    durationSeconds,
    date: activityDate,
    elevationGain: elevationGainResult.value ?? 0,
    avgHeartRate: avgHeartRateResult.value,
    maxHeartRate: maxHeartRateResult.value,
    avgCadence: avgCadenceResult.value,
    notes,
    visibility,
    uploadToStrava
  };

  return next();
}

function validateSyncRecent(req, res, next) {
  const rawLimit = req.body?.limit ?? req.query?.limit;

  if (rawLimit == null || rawLimit === '') {
    req.syncLimit = STRAVA_SYNC_LIMIT;
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
  validateCreateActivity,
  validateSyncRecent
};
