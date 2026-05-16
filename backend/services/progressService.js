const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function calculateStreak(activities) {
  if (!activities.length) {
    return 0;
  }

  const dayKeys = new Set(
    activities.map((activity) => startOfDay(activity.date).getTime())
  );

  let streak = 0;
  let cursor = startOfDay(new Date()).getTime();

  while (dayKeys.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }

  return streak;
}

function buildTrainingProgress(activities = [], user = {}) {
  const now = Date.now();
  const weekSince = now - (7 * DAY_MS);
  const weekActivities = activities.filter((activity) => new Date(activity.date).getTime() >= weekSince);
  const weeklyDistanceKm = weekActivities.reduce(
    (sum, activity) => sum + Number(activity.distance || 0) / 1000,
    0
  );
  const weeklyLoadTarget = Number(user.weeklyTrainingLoadKm) || Number(user.preferredDistance) * 3 || 30;
  const loadProgressPct = weeklyLoadTarget > 0
    ? Math.min(100, Math.round((weeklyDistanceKm / weeklyLoadTarget) * 100))
    : 0;

  const goalPace = Number(user.goalPaceMinPerKm) || null;
  const recentPaces = weekActivities
    .map((activity) => Number(activity.pace))
    .filter((pace) => pace > 0);
  const avgWeekPace = recentPaces.length
    ? recentPaces.reduce((sum, pace) => sum + pace, 0) / recentPaces.length
    : null;

  let paceProgressPct = null;
  if (goalPace && avgWeekPace) {
    const paceGap = Math.max(0, avgWeekPace - goalPace);
    paceProgressPct = Math.min(100, Math.round(100 - (paceGap / goalPace) * 100));
  }

  const streakDays = calculateStreak(activities);
  const recentSyncBonus = user.stravaLastSyncAt
    && (Date.now() - new Date(user.stravaLastSyncAt).getTime()) < DAY_MS
    ? 20
    : 0;
  const longRunBonus = weekActivities.some((a) => Number(a.distance || 0) / 1000 >= 15) ? 25 : 0;
  const consistencyBonus = weekActivities.length >= 4 ? 30 : weekActivities.length >= 3 ? 15 : 0;

  const xp = Math.round(
    activities.length * 5
    + weekActivities.length * 18
    + streakDays * 8
    + (loadProgressPct >= 100 ? 50 : Math.round(loadProgressPct / 4))
    + recentSyncBonus
    + longRunBonus
    + consistencyBonus
    + (paceProgressPct != null && paceProgressPct >= 90 ? 20 : 0)
  );
  const level = Math.max(1, Math.floor(xp / 120) + 1);
  const nextLevelXp = level * 120;
  const badges = [];

  if (streakDays >= 7) {
    badges.push({ id: 'streak-7', label: '7-day streak' });
  } else if (streakDays >= 3) {
    badges.push({ id: 'streak', label: `${streakDays}-day streak` });
  }

  if (loadProgressPct >= 100) {
    badges.push({ id: 'load', label: 'Weekly load goal met' });
  } else if (loadProgressPct >= 75) {
    badges.push({ id: 'load-close', label: 'Close to weekly load' });
  }

  if (paceProgressPct !== null && paceProgressPct >= 85) {
    badges.push({ id: 'pace', label: 'On target pace' });
  }

  if (longRunBonus > 0) {
    badges.push({ id: 'long-run', label: 'Long run this week' });
  }

  if (user.stravaId) {
    badges.push({ id: 'strava', label: 'Strava connected' });
  }

  return {
    weeklyDistanceKm: Number(weeklyDistanceKm.toFixed(1)),
    weeklyLoadTargetKm: weeklyLoadTarget,
    loadProgressPct,
    goalPaceMinPerKm: goalPace,
    avgWeekPaceMinPerKm: avgWeekPace ? Number(avgWeekPace.toFixed(2)) : null,
    paceProgressPct,
    streakDays,
    xp,
    level,
    nextLevelXp,
    xpToNextLevel: Math.max(0, nextLevelXp - xp),
    badges,
    goalRaceName: user.goalRaceName || null,
    goalRaceDate: user.goalRaceDate || null,
    goalRaceDistanceKm: user.goalRaceDistanceKm || null
  };
}

module.exports = {
  buildTrainingProgress,
  calculateStreak
};
