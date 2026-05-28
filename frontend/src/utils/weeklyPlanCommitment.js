export function buildReportKey({ reportId, generatedAt } = {}) {
  const at = generatedAt ? new Date(generatedAt).toISOString() : '';
  const id = reportId ? String(reportId) : '';
  return `${id}:${at}`;
}

export function summarizeWeeklyPlan(weeklyPlan = []) {
  const days = weeklyPlan.slice(0, 7);
  const runDays = days.filter((d) => d?.sessionType && d.sessionType !== 'rest_or_xt');
  const restDays = days.length - runDays.length;
  const plannedKm = runDays.reduce((sum, d) => sum + (Number(d.distanceKm) || 0), 0);
  const plannedMinutes = runDays.reduce((sum, d) => sum + (Number(d.durationMinutes) || 0), 0);

  return {
    runDays: runDays.length,
    restDays,
    plannedKm: Math.round(plannedKm * 10) / 10,
    plannedMinutes
  };
}

/** Key training-plan pillars present in the next 7-day rolling program. */
export function extractPlanKeyElements(weeklyPlan = [], phase = '') {
  const summary = summarizeWeeklyPlan(weeklyPlan);
  const types = new Set(weeklyPlan.map((d) => d?.sessionType).filter(Boolean));
  const elements = [];

  if (types.has('easy_run')) {
    elements.push({ id: 'easy', label: 'Easy aerobic base' });
  }
  if (types.has('tempo') || types.has('threshold') || types.has('intervals') || types.has('race_pace')) {
    elements.push({ id: 'quality', label: 'Quality & tempo' });
  }
  if (types.has('long_run')) {
    elements.push({ id: 'long', label: 'Long run' });
  }
  if (types.has('rest_or_xt')) {
    elements.push({ id: 'recovery', label: 'Recovery / rest' });
  }
  if (phase) {
    elements.push({ id: 'phase', label: `${String(phase)} phase` });
  }

  return { ...summary, elements };
}

export function formatRollingPlanPeriod(planPeriod, planStartDate) {
  const start = planPeriod?.startsAt
    ? new Date(planPeriod.startsAt)
    : planStartDate
      ? new Date(planStartDate)
      : new Date();
  const end = planPeriod?.endsAt
    ? new Date(planPeriod.endsAt)
    : (() => {
        const d = new Date(start);
        d.setDate(d.getDate() + 7);
        return d;
      })();

  if (Number.isNaN(start.getTime())) {
    return 'Next 7 days';
  }

  const fmt = (d) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const basedOn = planPeriod?.basedOnLastDays ?? 7;
  return `${fmt(start)} – ${fmt(end)} · from last ${basedOn} days`;
}
