export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const SESSION_TYPE_THEME = {
  easy_run: { color: '#0ea5e9', darkColor: '#38bdf8', label: 'Easy' },
  long_run: { color: '#7c3aed', darkColor: '#a78bfa', label: 'Long' },
  tempo: { color: '#f59e0b', darkColor: '#fbbf24', label: 'Tempo' },
  threshold: { color: '#ef4444', darkColor: '#f87171', label: 'Threshold' },
  intervals: { color: '#dc2626', darkColor: '#fca5a5', label: 'Intervals' },
  race_pace: { color: '#be123c', darkColor: '#fb7185', label: 'Race pace' },
  fartlek: { color: '#ea580c', darkColor: '#fb923c', label: 'Fartlek' },
  rest_or_xt: { color: '#94a3b8', darkColor: '#cbd5e1', label: 'Rest / XT' }
};

const DEFAULT_SESSION = {
  color: '#64748b',
  darkColor: '#94a3b8',
  label: 'Session'
};

export function formatPaceLabel(minPerKm) {
  const value = Number(minPerKm);
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  const mins = Math.floor(value);
  const secs = Math.round((value - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

export function formatNumber(value, { digits = 1, suffix = '' } = {}) {
  const v = Number(value);
  if (!Number.isFinite(v)) {
    return '—';
  }
  const fixed = v.toFixed(digits).replace(/\.0+$/, '');
  return `${fixed}${suffix}`;
}

/** Session accent colors; pass palette.mode for readable dark-mode variants. */
export function sessionTheme(sessionType, mode = 'light') {
  const base = SESSION_TYPE_THEME[sessionType] || {
    ...DEFAULT_SESSION,
    label: sessionType || DEFAULT_SESSION.label
  };
  const color = mode === 'dark' ? (base.darkColor || base.color) : base.color;
  const bgTint = mode === 'dark' ? `${color}33` : `${color}22`;
  return { ...base, color, bgTint };
}

/** Plan day date: report generation date + day index (0 = first planned day). */
export function planDayDate(planStartDate, dayIndex) {
  const base = planStartDate ? new Date(planStartDate) : new Date();
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + dayIndex);
    return fallback;
  }
  const d = new Date(base);
  d.setDate(d.getDate() + dayIndex);
  d.setHours(7, 0, 0, 0);
  return d;
}

export function formatPlanDayLabel(date) {
  try {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch (e) {
    return '—';
  }
}
