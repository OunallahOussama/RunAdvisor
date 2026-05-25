const MAX_DECIMALS = 2;

function clampDigits(digits) {
  return Math.min(Math.max(0, Math.floor(Number(digits) || 0)), MAX_DECIMALS);
}

/** Round and format a number with at most two decimal places (default: 2). */
export function formatNumber(value, { digits = 2, suffix = '' } = {}) {
  if (value == null || value === '') {
    return '—';
  }
  const v = Number(value);
  if (!Number.isFinite(v)) {
    return '—';
  }
  return `${Number(v.toFixed(clampDigits(digits)))}${suffix}`;
}

/** Runner-friendly pace label, e.g. 5.75 → "5:45 /km". */
export function formatPaceLabel(minPerKm) {
  const value = Number(minPerKm);
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  const mins = Math.floor(value);
  const secs = Math.round((value - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

/** Percentage with optional sign for deltas, e.g. +12.5% or 88%. */
export function formatPercent(value, { digits = 0, signed = false } = {}) {
  if (value == null || value === '') {
    return '—';
  }
  const v = Number(value);
  if (!Number.isFinite(v)) {
    return '—';
  }
  const rounded = Number(v.toFixed(clampDigits(digits)));
  const prefix = signed && rounded > 0 ? '+' : '';
  return `${prefix}${rounded}%`;
}

/** Value + unit string, e.g. formatMetric(8.456, 'km') → "8.46 km". */
export function formatMetric(value, unit, options = {}) {
  if (value == null || value === '') {
    return options.fallback ?? '—';
  }
  if (unit === 'pace') {
    return formatPaceLabel(value);
  }
  const formatted = formatNumber(value, options);
  if (formatted === '—') {
    return options.fallback ?? '—';
  }
  return unit ? `${formatted} ${unit}` : formatted;
}

/** Chart.js tooltip label with consistent rounding. */
export function formatChartTooltipValue(label, value, { kind = 'number' } = {}) {
  if (value == null || !Number.isFinite(Number(value))) {
    return `${label}: N/A`;
  }
  const v = Number(value);
  if (kind === 'pace') {
    return `${label}: ${formatPaceLabel(v)}`;
  }
  if (kind === 'integer') {
    return `${label}: ${Math.round(v)}`;
  }
  return `${label}: ${formatNumber(v)}`;
}

/** Shared Chart.js tooltip callback factory. */
export function chartTooltipCallbacks({ paceDatasetLabels = [] } = {}) {
  return {
    label(context) {
      const label = context.dataset.label || '';
      const value = context.parsed.y;
      const kind = paceDatasetLabels.some((entry) => label.includes(entry)) ? 'pace' : 'number';
      return formatChartTooltipValue(label, value, { kind });
    }
  };
}

/** Signed week-over-week percent change, e.g. +8% or -3%. */
export function formatDeltaPercent(value, { digits = 0 } = {}) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) {
    return null;
  }
  return formatPercent(Number(value), { digits, signed: true });
}

/** Pace change in sec/km — negative means faster. */
export function formatPaceDeltaSec(deltaSec) {
  if (deltaSec == null || !Number.isFinite(Number(deltaSec))) {
    return null;
  }
  const v = Math.round(Number(deltaSec));
  if (v === 0) {
    return 'same pace';
  }
  const prefix = v > 0 ? '+' : '';
  return `${prefix}${v}s/km vs last week`;
}

export function decimalPaceToMinSec(minPerKm) {
  const value = Number(minPerKm);
  if (!Number.isFinite(value) || value <= 0) {
    return { minutes: '', seconds: '' };
  }
  const mins = Math.floor(value);
  const secs = Math.round((value - mins) * 60);
  return { minutes: String(mins), seconds: String(Math.min(59, secs)).padStart(2, '0') };
}

export function minSecToDecimalPace(minutes, seconds) {
  const m = Number(minutes);
  const s = Number(seconds);
  if (!Number.isFinite(m) || m < 0) {
    return null;
  }
  if (!Number.isFinite(s) || s < 0 || s >= 60) {
    return null;
  }
  return Number((m + s / 60).toFixed(2));
}

/** Compact duration like Strava: 32m or 1h 05m. */
export function formatDurationShort(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h > 0) {
    return `${h}h ${String(min).padStart(2, '0')}m`;
  }
  return `${m}m`;
}

/** Strava-style relative time, e.g. "2d ago" or "Yesterday". */
export function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) {
    return 'Just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  if (days < 14) {
    return '1w ago';
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Days or weeks until goal race (Garmin-style countdown). */
export function getRaceCountdown(raceDate) {
  if (!raceDate) {
    return null;
  }
  const date = new Date(raceDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const days = Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) {
    return { days, label: 'Race completed' };
  }
  if (days === 0) {
    return { days: 0, label: 'Race day' };
  }
  if (days === 1) {
    return { days: 1, label: '1 day to go' };
  }
  if (days < 14) {
    return { days, label: `${days} days to go` };
  }
  const weeks = Math.round(days / 7);
  return { days, label: `${weeks} weeks to go` };
}

export const TRAINING_METRIC_TOOLTIPS = {
  acwr: 'Acute (7-day) load ÷ chronic (28-day weekly average). 0.8–1.3 is the typical safe build zone.',
  weeklyLoad: 'Estimated training load (TRIMP-style) from duration and intensity in the last 7 days.',
  monotony: 'Mean daily load ÷ standard deviation. Above 2 suggests too little variation — add a rest day.',
  strain: 'Weekly load × monotony. High strain with high monotony increases overtraining risk.',
  distance: 'Total run distance in the selected analysis window.',
  sessions: 'Number of runs logged in the window.',
  avgPace: 'Average pace across all runs in the window.',
  goalPace: 'Target race or training pace set in your profile.'
};
