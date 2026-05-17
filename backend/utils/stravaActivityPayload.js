function toStravaSportType(type) {
  const normalized = String(type || '').toLowerCase();

  if (normalized.includes('trail')) {
    return 'TrailRun';
  }

  if (normalized.includes('walk') || normalized.includes('hike')) {
    return 'Walk';
  }

  if (normalized.includes('ride')) {
    return 'Ride';
  }

  return 'Run';
}

function formatStartDateLocal(date) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid activity date for Strava upload.');
  }

  const pad = (part) => String(part).padStart(2, '0');

  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}T09:00:00Z`;
}

function buildStravaCreateForm(activity) {
  const params = new URLSearchParams();
  const sportType = toStravaSportType(activity.type);

  params.set('name', activity.name);
  params.set('sport_type', sportType);
  params.set('type', sportType);
  params.set('start_date_local', formatStartDateLocal(activity.date));
  params.set('elapsed_time', String(Math.round(Number(activity.duration) || 0)));

  const distanceMeters = Math.round(Number(activity.distance) || 0);

  if (distanceMeters > 0) {
    params.set('distance', String(distanceMeters));
  }

  if (activity.notes) {
    params.set('description', activity.notes);
  }

  if (activity.visibility) {
    params.set('visibility', activity.visibility);
  }

  return params;
}

function formatStravaFieldErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return '';
  }

  return errors
    .map((entry) => [entry?.field, entry?.code].filter(Boolean).join(': '))
    .filter(Boolean)
    .join(', ');
}

function mapStravaUploadError(error) {
  const status = error.response?.status;
  const data = error.response?.data;
  const providerMessage = [data?.message, formatStravaFieldErrors(data?.errors)]
    .filter(Boolean)
    .join(' — ');

  if (status === 401 || status === 403) {
    return {
      posted: false,
      needsReconnect: true,
      message:
        'Strava rejected the upload. Disconnect and reconnect Strava in RunAdvisor to grant activity upload permission (activity:write).'
    };
  }

  if (status === 429) {
    return {
      posted: false,
      message: 'Strava rate limit reached. Your activity is saved in RunAdvisor — try uploading again later.'
    };
  }

  return {
    posted: false,
    message: providerMessage || error.message || 'Strava upload failed. Your activity is still saved in RunAdvisor.'
  };
}

module.exports = {
  toStravaSportType,
  formatStartDateLocal,
  buildStravaCreateForm,
  mapStravaUploadError
};
