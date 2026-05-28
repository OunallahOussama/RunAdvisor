/**
 * Training progress, challenge evaluation, and gamification for home goals.
 */

const Activity = require('../models/Activity');
const { round } = require('../utils/numbers');
const { computePersonalRecords } = require('./analyticsService');
const { buildRacePacePrediction } = require('./trainingInsights');

const DAY_MS = 24 * 60 * 60 * 1000;

const CHALLENGE_KINDS = [
  'monthly_km',
  'yearly_km',
  'weekly_km',
  'pace_cap',
  'pr_longest_km',
  'pr_fastest_pace',
  'pr_elevation',
  'race_prediction',
  'custom_km'
];

function isRun(activity = {}) {
  const type = String(activity.type || '').toLowerCase();
  return !type || type.includes('run');
}

function distanceKm(activity) {
  return Number(activity?.distance || 0) / 1000;
}

function paceMinPerKm(activity) {
  if (Number.isFinite(Number(activity?.pace)) && Number(activity.pace) > 0) {
    return Number(activity.pace);
  }

  const dk = distanceKm(activity);
  const mins = Number(activity?.movingTime || activity?.duration || 0) / 60;
  return dk > 0 && mins > 0 ? mins / dk : 0;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1);
}

function daysInMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function filterRunsInRange(activities, since, until = new Date()) {
  const start = since.getTime();
  const end = until.getTime();

  return activities.filter((a) => {
    if (!isRun(a)) {
      return false;
    }

    const t = new Date(a.date).getTime();
    return t >= start && t <= end;
  });
}

function aggregateRunVolume(activities, since, until = new Date()) {
  const runs = filterRunsInRange(activities, since, until);
  let totalKm = 0;
  let paceWeighted = 0;
  let paceWeight = 0;

  runs.forEach((a) => {
    const dk = distanceKm(a);
    totalKm += dk;
    const pace = paceMinPerKm(a);

    if (pace > 0 && dk >= 1) {
      paceWeighted += pace * dk;
      paceWeight += dk;
    }
  });

  return {
    distanceKm: round(totalKm, 1),
    runCount: runs.length,
    avgPaceMinPerKm: paceWeight > 0 ? round(paceWeighted / paceWeight, 2) : null,
    trainingLoad: round(totalKm * 1.15, 0)
  };
}

function buildPeriodProgress({ label, currentKm, goalKm, periodStart, periodEnd = new Date() }) {
  const goal = Number(goalKm) > 0 ? Number(goalKm) : 0;
  const current = Math.max(0, Number(currentKm) || 0);
  const percent = goal > 0 ? Math.min(100, round((current / goal) * 100, 1)) : null;
  const remainingKm = goal > 0 ? Math.max(0, round(goal - current, 1)) : null;

  const totalMs = Math.max(1, periodEnd.getTime() - periodStart.getTime());
  const elapsedMs = Math.max(0, Math.min(totalMs, periodEnd.getTime() - periodStart.getTime()));
  const elapsedRatio = elapsedMs / totalMs;
  const expectedKm = goal > 0 ? goal * elapsedRatio : 0;
  const onTrack = goal > 0 ? current >= expectedKm * 0.92 : null;

  return {
    label,
    currentKm: current,
    goalKm: goal,
    percent,
    remainingKm,
    runCount: null,
    onTrack,
    trainingLoad: null
  };
}

function buildGamification(ytdKm) {
  const km = Math.max(0, Number(ytdKm) || 0);
  const level = Math.floor(km / 50) + 1;
  const xpInLevel = km % 50;
  const titles = ['Rookie', 'Regular', 'Dedicated', 'Committed', 'Elite', 'Legend'];
  const title = titles[Math.min(titles.length - 1, level - 1)];

  return {
    level,
    title,
    xpInLevel: round(xpInLevel, 1),
    xpToNextLevel: 50,
    xpPercent: round((xpInLevel / 50) * 100, 0),
    totalKmYtd: round(km, 1)
  };
}

function challengeTitle(challenge) {
  if (challenge.title && String(challenge.title).trim()) {
    return String(challenge.title).trim();
  }

  const kind = challenge.kind;
  if (kind === 'monthly_km') return 'Monthly distance';
  if (kind === 'yearly_km') return 'Year distance';
  if (kind === 'weekly_km') return 'Weekly distance';
  if (kind === 'pace_cap') return 'Pace goal';
  if (kind === 'pr_longest_km') return 'Longest run PR';
  if (kind === 'pr_fastest_pace') return 'Fastest pace PR';
  if (kind === 'pr_elevation') return 'Climb PR';
  if (kind === 'race_prediction') return 'Race pace target';
  return 'Challenge';
}

function evaluateChallenge(challenge, ctx) {
  const kind = challenge.kind;
  const id = challenge._id ? String(challenge._id) : challenge.id;
  const title = challengeTitle(challenge);
  const base = {
    id,
    kind,
    title,
    active: challenge.active !== false,
    status: 'active',
    percent: 0,
    currentValue: null,
    targetValue: null,
    unit: 'km',
    detail: ''
  };

  if (kind === 'monthly_km' || kind === 'custom_km') {
    const target = Number(challenge.targetKm) || ctx.monthlyGoalKm;
    const current = ctx.month.distanceKm;
    const percent = target > 0 ? Math.min(100, round((current / target) * 100, 1)) : 0;
    return {
      ...base,
      targetValue: target,
      currentValue: current,
      percent,
      status: target > 0 && current >= target ? 'complete' : percent >= 75 ? 'closing' : 'active',
      detail:
        target > 0
          ? `${round(current, 1)} / ${target} km this month`
          : 'Set a target km in your profile or challenge.'
    };
  }

  if (kind === 'yearly_km') {
    const target = Number(challenge.targetKm) || ctx.yearlyGoalKm;
    const current = ctx.year.distanceKm;
    const percent = target > 0 ? Math.min(100, round((current / target) * 100, 1)) : 0;
    return {
      ...base,
      targetValue: target,
      currentValue: current,
      percent,
      status: target > 0 && current >= target ? 'complete' : 'active',
      detail: target > 0 ? `${round(current, 1)} / ${target} km year to date` : 'Set a yearly km goal.'
    };
  }

  if (kind === 'weekly_km') {
    const target = Number(challenge.targetKm) || ctx.weeklyGoalKm;
    const current = ctx.week.distanceKm;
    const percent = target > 0 ? Math.min(100, round((current / target) * 100, 1)) : 0;
    return {
      ...base,
      targetValue: target,
      currentValue: current,
      percent,
      status: target > 0 && current >= target ? 'complete' : 'active',
      detail: `${round(current, 1)} / ${target || '—'} km this week`
    };
  }

  if (kind === 'pace_cap') {
    const target = Number(challenge.targetPaceMinPerKm) || Number(ctx.goalPaceMinPerKm);
    const current = ctx.month.avgPaceMinPerKm;
    if (!target || !current) {
      return {
        ...base,
        unit: 'min/km',
        detail: 'Log runs with pace data to track a pace cap goal.',
        percent: 0
      };
    }

    const met = current <= target;
    const gap = round(current - target, 2);
    return {
      ...base,
      unit: 'min/km',
      targetValue: target,
      currentValue: current,
      percent: met ? 100 : Math.max(0, round(100 - (gap / target) * 100, 0)),
      status: met ? 'complete' : 'active',
      detail: met
        ? `Month avg ~${current} min/km — at or faster than ${target} min/km`
        : `Month avg ~${current} min/km — ${gap} min/km to sharpen`
    };
  }

  if (kind === 'pr_longest_km') {
    const target = Number(challenge.targetKm);
    const current = ctx.personalRecords.longestRunKm;
    if (!target) {
      return { ...base, detail: 'Set a target distance for your longest run.', percent: 0 };
    }

    const percent = Math.min(100, round((current / target) * 100, 1));
    return {
      ...base,
      targetValue: target,
      currentValue: current,
      percent,
      status: current >= target ? 'complete' : 'active',
      detail: `PR ${round(current, 1)} km · target ${target} km`
    };
  }

  if (kind === 'pr_fastest_pace') {
    const target = Number(challenge.targetPaceMinPerKm);
    const current = ctx.personalRecords.fastestPaceMinPerKm;
    if (!target || !current) {
      return {
        ...base,
        unit: 'min/km',
        detail: 'Set a target pace (3 km+ efforts count).',
        percent: 0
      };
    }

    const met = current <= target;
    return {
      ...base,
      unit: 'min/km',
      targetValue: target,
      currentValue: current,
      percent: met ? 100 : Math.max(0, round((target / current) * 100, 0)),
      status: met ? 'complete' : 'active',
      detail: `Best ~${current} min/km · goal ≤ ${target} min/km`
    };
  }

  if (kind === 'pr_elevation') {
    const target = Number(challenge.targetKm) || Number(challenge.targetElevationM);
    const current = ctx.personalRecords.biggestClimbM;
    if (!target) {
      return { ...base, unit: 'm', detail: 'Set a climb target in meters.', percent: 0 };
    }

    const percent = Math.min(100, round((current / target) * 100, 1));
    return {
      ...base,
      unit: 'm',
      targetValue: target,
      currentValue: current,
      percent,
      status: current >= target ? 'complete' : 'active',
      detail: `Best climb ${Math.round(current)} m · target ${target} m`
    };
  }

  if (kind === 'race_prediction') {
    const raceKm = Number(challenge.raceDistanceKm) || Number(ctx.goalRaceDistanceKm);
    const targetPace = Number(challenge.targetPaceMinPerKm);
    const predicted = ctx.racePrediction?.predictedPaceMinPerKm;

    if (!raceKm) {
      return { ...base, unit: 'min/km', detail: 'Set a race distance on the challenge.', percent: 0 };
    }

    if (!predicted) {
      return {
        ...base,
        unit: 'min/km',
        detail: ctx.racePrediction?.explanation || 'Log recent runs to unlock a prediction.',
        percent: 0
      };
    }

    const met = targetPace > 0 ? predicted <= targetPace : true;
    return {
      ...base,
      unit: 'min/km',
      targetValue: targetPace || predicted,
      currentValue: predicted,
      percent: targetPace > 0 ? (met ? 100 : Math.max(0, round((targetPace / predicted) * 100, 0))) : 50,
      status: met && targetPace > 0 ? 'complete' : 'active',
      detail: ctx.racePrediction.explanation || `Projected ~${predicted} min/km at ${raceKm} km`
    };
  }

  return { ...base, detail: 'Unknown challenge type.', percent: 0 };
}

function buildNextObjectives(user, periods, challengesEval, racePrediction, personalRecords) {
  const lines = [];
  const month = periods.month;
  const year = periods.year;

  if (month.goalKm > 0 && month.remainingKm > 0) {
    const daysLeft = daysInMonth() - new Date().getDate();
    lines.push(
      `Log about ${month.remainingKm} km more this month${daysLeft > 0 ? ` (~${round(month.remainingKm / Math.max(1, daysLeft), 1)} km/day)` : ''}.`
    );
  }

  if (year.goalKm > 0 && year.remainingKm > 0) {
    lines.push(`Year goal: ${year.remainingKm} km to reach ${year.goalKm} km YTD.`);
  }

  if (user.goalRaceDate && racePrediction?.predictedFinishTimeLabel) {
    const raceName = user.goalRaceName || 'your race';
    lines.push(
      `${raceName}: projected finish ~${racePrediction.predictedFinishTimeLabel} based on recent training.`
    );
  }

  const activeChallenges = challengesEval.filter((c) => c.active && c.status !== 'complete');
  activeChallenges.slice(0, 2).forEach((c) => {
    if (c.detail) {
      lines.push(`${c.title}: ${c.detail}`);
    }
  });

  if (!lines.length && personalRecords.longestRunKm > 0) {
    lines.push(
      `Personal best longest run ${round(personalRecords.longestRunKm, 1)} km — add a PR challenge to chase the next mark.`
    );
  }

  if (!lines.length) {
    lines.push('Set a monthly km goal and optional challenges in Profile to unlock progress rings.');
  }

  return lines.slice(0, 5);
}

function normalizeChallengesInput(challenges) {
  if (!Array.isArray(challenges)) {
    return null;
  }

  return challenges
    .filter((c) => c && CHALLENGE_KINDS.includes(c.kind))
    .slice(0, 12)
    .map((c) => ({
      kind: c.kind,
      title: c.title ? String(c.title).trim().slice(0, 80) : '',
      targetKm: c.targetKm != null ? Number(c.targetKm) : undefined,
      targetPaceMinPerKm: c.targetPaceMinPerKm != null ? Number(c.targetPaceMinPerKm) : undefined,
      raceDistanceKm: c.raceDistanceKm != null ? Number(c.raceDistanceKm) : undefined,
      active: c.active !== false,
      createdAt: c.createdAt ? new Date(c.createdAt) : new Date()
    }));
}

async function loadUserActivities(userId) {
  return Activity.find({ userId })
    .select('date distance movingTime duration pace type elevationGain splitsMetric name')
    .sort({ date: -1 })
    .lean();
}

async function buildTrainingProgress(user) {
  const activities = await loadUserActivities(user._id);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const weekStart = new Date(now.getTime() - 7 * DAY_MS);

  const monthVol = aggregateRunVolume(activities, monthStart, now);
  const yearVol = aggregateRunVolume(activities, yearStart, now);
  const weekVol = aggregateRunVolume(activities, weekStart, now);

  const monthlyGoalKm = Number(user.monthlyDistanceGoalKm) || 0;
  const yearlyGoalKm = Number(user.yearlyDistanceGoalKm) || 0;
  const weeklyGoalKm = Number(user.weeklyTrainingLoadKm) || 0;

  const monthElapsedRatio =
    (now.getDate() - 1 + now.getHours() / 24) / Math.max(1, daysInMonth(now));

  const monthBase = buildPeriodProgress({
    label: 'This month',
    currentKm: monthVol.distanceKm,
    goalKm: monthlyGoalKm,
    periodStart: monthStart,
    periodEnd: now
  });
  const month = {
    ...monthBase,
    runCount: monthVol.runCount,
    avgPaceMinPerKm: monthVol.avgPaceMinPerKm,
    trainingLoad: monthVol.trainingLoad,
    currentKm: monthVol.distanceKm,
    percent:
      monthlyGoalKm > 0
        ? Math.min(100, round((monthVol.distanceKm / monthlyGoalKm) * 100, 1))
        : null,
    remainingKm:
      monthlyGoalKm > 0 ? Math.max(0, round(monthlyGoalKm - monthVol.distanceKm, 1)) : null,
    onTrack:
      monthlyGoalKm > 0
        ? monthVol.distanceKm >= monthlyGoalKm * monthElapsedRatio * 0.92
        : null,
    daysLeftInMonth: daysInMonth(now) - now.getDate()
  };

  const yearBase = buildPeriodProgress({
    label: 'Year to date',
    currentKm: yearVol.distanceKm,
    goalKm: yearlyGoalKm,
    periodStart: yearStart,
    periodEnd: now
  });
  const year = {
    ...yearBase,
    runCount: yearVol.runCount,
    trainingLoad: yearVol.trainingLoad,
    currentKm: yearVol.distanceKm,
    percent:
      yearlyGoalKm > 0
        ? Math.min(100, round((yearVol.distanceKm / yearlyGoalKm) * 100, 1))
        : null,
    remainingKm:
      yearlyGoalKm > 0 ? Math.max(0, round(yearlyGoalKm - yearVol.distanceKm, 1)) : null
  };

  const week = {
    label: 'This week',
    currentKm: weekVol.distanceKm,
    goalKm: weeklyGoalKm,
    runCount: weekVol.runCount,
    trainingLoad: weekVol.trainingLoad,
    percent:
      weeklyGoalKm > 0
        ? Math.min(100, round((weekVol.distanceKm / weeklyGoalKm) * 100, 1))
        : null,
    remainingKm:
      weeklyGoalKm > 0 ? Math.max(0, round(weeklyGoalKm - weekVol.distanceKm, 1)) : null
  };

  const personalRecords = computePersonalRecords(activities);
  const lastWeekRuns = filterRunsInRange(
    activities,
    new Date(now.getTime() - 7 * DAY_MS),
    now
  );
  const raceDistanceKm = Number(user.goalRaceDistanceKm) || 10;
  const racePrediction = buildRacePacePrediction(lastWeekRuns, raceDistanceKm);

  const ctx = {
    month: monthVol,
    year: yearVol,
    week: weekVol,
    monthlyGoalKm,
    yearlyGoalKm,
    weeklyGoalKm,
    goalPaceMinPerKm: user.goalPaceMinPerKm,
    goalRaceDistanceKm: user.goalRaceDistanceKm,
    personalRecords,
    racePrediction
  };

  const rawChallenges = Array.isArray(user.trainingChallenges) ? user.trainingChallenges : [];
  const challenges = rawChallenges
    .filter((c) => c.active !== false)
    .map((c) => evaluateChallenge(c, ctx));

  const nextObjectives = buildNextObjectives(
    user,
    { month, year },
    challenges,
    racePrediction,
    personalRecords
  );

  return {
    month,
    year,
    week,
    personalRecords,
    racePrediction,
    challenges,
    nextObjectives,
    gamification: buildGamification(yearVol.distanceKm),
    goals: {
      monthlyDistanceGoalKm: monthlyGoalKm || null,
      yearlyDistanceGoalKm: yearlyGoalKm || null,
      weeklyTrainingLoadKm: weeklyGoalKm || null,
      goalPaceMinPerKm: user.goalPaceMinPerKm ?? null,
      goalRaceDistanceKm: user.goalRaceDistanceKm ?? null,
      goalRaceDate: user.goalRaceDate ?? null,
      goalRaceName: user.goalRaceName ?? null
    }
  };
}

module.exports = {
  CHALLENGE_KINDS,
  aggregateRunVolume,
  buildGamification,
  evaluateChallenge,
  buildTrainingProgress,
  normalizeChallengesInput,
  filterRunsInRange
};
