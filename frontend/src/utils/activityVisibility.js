export const VISIBILITY_OPTIONS = [
  {
    value: 'everyone',
    label: 'Public',
    description: 'Posted to Strava as Everyone when upload is enabled.'
  },
  {
    value: 'followers_only',
    label: 'Followers',
    description: 'Posted to Strava as Followers only when upload is enabled.'
  },
  {
    value: 'only_me',
    label: 'Only you',
    description: 'Posted to Strava as Only you (private) when upload is enabled.'
  }
];

export function normalizeVisibility(value, defaultValue = 'everyone') {
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

  if (VISIBILITY_OPTIONS.some((option) => option.value === raw)) {
    return raw;
  }

  return defaultValue;
}

export function getVisibilityLabel(value) {
  return VISIBILITY_OPTIONS.find((option) => option.value === normalizeVisibility(value))?.label || 'Public';
}

export function getVisibilityChipColor(value) {
  const normalized = normalizeVisibility(value);

  if (normalized === 'only_me') {
    return 'default';
  }

  if (normalized === 'followers_only') {
    return 'info';
  }

  return 'success';
}
