const VISIBILITY_VALUES = ['everyone', 'followers_only', 'only_me'];

function normalizeVisibility(value, defaultValue = 'everyone') {
  const raw = String(value ?? '').trim().toLowerCase();

  if (raw === 'public') {
    return 'everyone';
  }

  if (raw === 'private') {
    return 'only_me';
  }

  if (raw === 'followers') {
    return 'followers_only';
  }

  if (VISIBILITY_VALUES.includes(raw)) {
    return raw;
  }

  return defaultValue;
}

function visibilityFromStravaActivity(activity = {}) {
  if (activity.private === true) {
    return 'only_me';
  }

  return normalizeVisibility(activity.visibility, 'everyone');
}

module.exports = {
  VISIBILITY_VALUES,
  normalizeVisibility,
  visibilityFromStravaActivity
};
