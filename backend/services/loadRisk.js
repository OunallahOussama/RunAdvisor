const DAY_MS = 24 * 60 * 60 * 1000;

function weeklyDistanceKm(activities, startMs, endMs) {
  return activities
    .filter((activity) => {
      const t = new Date(activity.date).getTime();
      return t >= startMs && t < endMs;
    })
    .reduce((sum, activity) => sum + Number(activity.distance || 0) / 1000, 0);
}

function buildLoadRiskAssessment(activities = [], user = {}) {
  const now = Date.now();
  const acuteKm = weeklyDistanceKm(activities, now - 7 * DAY_MS, now);
  const chronicKm = weeklyDistanceKm(activities, now - 28 * DAY_MS, now) / 4;
  const ratio = chronicKm > 0 ? acuteKm / chronicKm : acuteKm > 0 ? 2 : 0;
  const target = Number(user.weeklyTrainingLoadKm) || 30;

  let risk = 'low';
  let message = 'Training load looks balanced relative to your recent base.';

  if (ratio > 1.5 || acuteKm > target * 1.25) {
    risk = 'elevated';
    message = 'Recent volume is elevated versus your 4-week base. Ease the next 48 hours.';
  } else if (ratio > 1.2 || acuteKm > target * 1.1) {
    risk = 'moderate';
    message = 'Load is creeping up. Keep the next session controlled.';
  }

  return {
    acuteWeeklyKm: Number(acuteKm.toFixed(2)),
    chronicWeeklyKm: Number(chronicKm.toFixed(2)),
    acuteChronicRatio: Number(ratio.toFixed(2)),
    weeklyTargetKm: target,
    risk,
    message
  };
}

module.exports = {
  buildLoadRiskAssessment,
  weeklyDistanceKm
};
