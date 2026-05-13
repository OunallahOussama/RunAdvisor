const DAY_MS = 24 * 60 * 60 * 1000;

function round(value, decimals = 1) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfWeek(value) {
  const date = safeDate(value) || new Date();
  const cloned = new Date(date);
  const day = cloned.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  cloned.setDate(cloned.getDate() + diff);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
}

function buildWeekLabel(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

function isRunActivity(activity = {}) {
  const type = String(activity.type || '').toLowerCase();
  return !type || type.includes('run');
}

function calculateCoreStats(activities = []) {
  const runActivities = activities.filter(isRunActivity);
  const sortedActivities = [...runActivities].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sortedActivities.length === 0) {
    return {
      activityCount: 0,
      activeDays: 0,
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      avgDistanceKm: 0,
      avgPace: 0,
      avgHeartRate: 0,
      longestRunKm: 0,
      daysSpan: 0,
      hardSessionCount: 0,
      recentRunCount: 0,
      latestActivityDate: null
    };
  }

  const dayKeys = new Set();
  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;
  let totalPace = 0;
  let paceCount = 0;
  let totalHeartRate = 0;
  let heartRateCount = 0;
  let longestRunKm = 0;

  sortedActivities.forEach((activity) => {
    const date = safeDate(activity.date);
    if (date) {
      dayKeys.add(date.toISOString().slice(0, 10));
    }

    const distanceKm = Number(activity.distance || 0) / 1000;
    totalDistanceKm += distanceKm;
    totalDurationMinutes += Number(activity.movingTime || activity.duration || 0) / 60;
    longestRunKm = Math.max(longestRunKm, distanceKm);

    if (Number.isFinite(activity.pace)) {
      totalPace += activity.pace;
      paceCount += 1;
    }

    if (Number.isFinite(activity.avgHeartRate)) {
      totalHeartRate += activity.avgHeartRate;
      heartRateCount += 1;
    }
  });

  const avgPace = paceCount ? totalPace / paceCount : 0;
  const hardSessionCount = sortedActivities.filter((activity) => (
    Number.isFinite(activity.pace) && activity.pace <= avgPace - 0.35
  )).length;
  const firstDate = safeDate(sortedActivities[0].date) || new Date();
  const lastDate = safeDate(sortedActivities[sortedActivities.length - 1].date) || new Date();

  return {
    activityCount: sortedActivities.length,
    activeDays: dayKeys.size,
    totalDistanceKm: round(totalDistanceKm),
    totalDurationMinutes: round(totalDurationMinutes),
    avgDistanceKm: round(totalDistanceKm / sortedActivities.length),
    avgPace: round(avgPace),
    avgHeartRate: heartRateCount ? round(totalHeartRate / heartRateCount) : 0,
    longestRunKm: round(longestRunKm),
    daysSpan: Math.max(1, Math.ceil((lastDate - firstDate) / DAY_MS) + 1),
    hardSessionCount,
    recentRunCount: sortedActivities.length,
    latestActivityDate: lastDate
  };
}

function buildWeeklyTrend(activities = [], weeks = 6) {
  const runActivities = activities.filter(isRunActivity);
  const currentWeekStart = startOfWeek(new Date());
  const buckets = [];
  const bucketMap = new Map();

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - (index * 7));

    const key = weekStart.toISOString().slice(0, 10);
    const bucket = {
      key,
      label: buildWeekLabel(weekStart),
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      avgPace: null,
      longestRunKm: 0,
      activityCount: 0,
      paceSum: 0,
      paceCount: 0
    };

    bucketMap.set(key, bucket);
    buckets.push(bucket);
  }

  runActivities.forEach((activity) => {
    const activityDate = safeDate(activity.date);
    if (!activityDate) {
      return;
    }

    const weekKey = startOfWeek(activityDate).toISOString().slice(0, 10);
    const bucket = bucketMap.get(weekKey);

    if (!bucket) {
      return;
    }

    const distanceKm = Number(activity.distance || 0) / 1000;
    bucket.totalDistanceKm += distanceKm;
    bucket.totalDurationMinutes += Number(activity.movingTime || activity.duration || 0) / 60;
    bucket.longestRunKm = Math.max(bucket.longestRunKm, distanceKm);
    bucket.activityCount += 1;

    if (Number.isFinite(activity.pace)) {
      bucket.paceSum += activity.pace;
      bucket.paceCount += 1;
    }
  });

  return buckets.map((bucket) => ({
    label: bucket.label,
    totalDistanceKm: round(bucket.totalDistanceKm),
    totalDurationMinutes: round(bucket.totalDurationMinutes),
    avgPace: bucket.paceCount ? round(bucket.paceSum / bucket.paceCount) : null,
    longestRunKm: round(bucket.longestRunKm),
    activityCount: bucket.activityCount
  }));
}

function buildCoachReview(activities = [], user = {}, options = {}) {
  const { days = 28, raceDistance = null, raceDate = null, raceName = '' } = options;
  const summary = calculateCoreStats(activities);
  const trend = buildWeeklyTrend(activities, 6);
  const currentWeek = trend[trend.length - 1] || null;
  const previousWeek = trend[trend.length - 2] || null;
  const previousDistance = previousWeek?.totalDistanceKm || 0;
  const currentDistance = currentWeek?.totalDistanceKm || 0;
  const weeklyDistanceDeltaPct = previousDistance > 0
    ? round(((currentDistance - previousDistance) / previousDistance) * 100, 0)
    : null;
  const raceDays = raceDate
    ? Math.max(0, Math.ceil((new Date(raceDate) - Date.now()) / DAY_MS))
    : null;
  const restDays = Math.max(0, summary.daysSpan - summary.activeDays);
  const uploadedPlanCount = Array.isArray(user.trainingPlans) ? user.trainingPlans.length : 0;
  const positives = [];
  const risks = [];
  const nextFocus = [];

  if (summary.activeDays >= 3) {
    positives.push(`You trained on ${summary.activeDays} separate day(s), which is a solid consistency base.`);
  } else {
    risks.push('Your recent training frequency is light, so fitness gains will come more from consistency than intensity.');
  }

  if (summary.longestRunKm >= 12) {
    positives.push(`Your longest recent run reached ${summary.longestRunKm} km, giving you a useful endurance anchor.`);
  } else {
    risks.push(`Your longest recent run is ${summary.longestRunKm || 0} km, so endurance still needs gradual work.`);
  }

  if (weeklyDistanceDeltaPct !== null && weeklyDistanceDeltaPct > 15) {
    risks.push(`Weekly distance jumped by about ${weeklyDistanceDeltaPct}%, so keep the next few runs controlled to avoid overload.`);
  } else if (weeklyDistanceDeltaPct !== null && weeklyDistanceDeltaPct >= 0) {
    positives.push('Your weekly volume is building without a major spike, which is ideal for sustainable progress.');
  }

  if (summary.hardSessionCount >= 2) {
    risks.push('You have stacked multiple faster sessions recently; protect one easy or recovery day before the next quality workout.');
  }

  if (restDays === 0 && summary.activityCount >= 5) {
    risks.push('You have not left a clear rest day in this review window, which can blunt adaptation if repeated.');
  }

  if (summary.avgPace > 0) {
    nextFocus.push(`Anchor easy runs around ${(summary.avgPace + 0.6).toFixed(1)} to ${(summary.avgPace + 1).toFixed(1)} min/km so key sessions feel fresher.`);
  }

  nextFocus.push(`Keep the next long run near ${Math.max(summary.longestRunKm, summary.avgDistanceKm + 2).toFixed(1)} km without adding more than roughly 10% volume.`);

  if (summary.avgHeartRate > 0) {
    nextFocus.push(`Watch effort if average heart rate drifts well above ${Math.round(summary.avgHeartRate)} bpm on easy days.`);
  }

  if (uploadedPlanCount > 0) {
    positives.push(`You already have ${uploadedPlanCount} training plan file(s) stored in-app, which makes it easier to align runs with your plan.`);
  } else {
    nextFocus.push('Upload your current training plan in the Strava area so you can keep plan context next to synced training data.');
  }

  if (raceDistance && raceDays !== null) {
    const raceLabel = raceName || `${raceDistance} km race`;
    if (raceDays <= 14) {
      nextFocus.push(`With ${raceDays} day(s) until ${raceLabel}, shift from building fitness to staying sharp and well-rested.`);
    } else {
      nextFocus.push(`Use the next ${Math.min(raceDays, 14)} day(s) to build toward ${raceLabel} with one key session and one controlled long run each week.`);
    }
  }

  let readiness = 'build';
  let headline = 'Your recent training supports a steady build phase.';

  if (raceDays !== null && raceDays <= 14) {
    readiness = 'taper';
    headline = 'You are close enough to race day that freshness should now matter as much as fitness.';
  } else if ((weeklyDistanceDeltaPct !== null && weeklyDistanceDeltaPct > 15) || summary.hardSessionCount >= 2) {
    readiness = 'recover';
    headline = 'Your recent load looks a bit aggressive, so the next few runs should absorb the work instead of adding more stress.';
  } else if (summary.activeDays < 3) {
    readiness = 'rebuild';
    headline = 'You have enough recent activity to work from, but consistency is the biggest lever to improve next.';
  }

  return {
    summary: {
      ...summary,
      reviewWindowDays: days,
      currentWeekDistanceKm: currentDistance,
      previousWeekDistanceKm: previousDistance,
      weeklyDistanceDeltaPct,
      uploadedPlanCount,
      stravaConnected: Boolean(user?.stravaId)
    },
    trend,
    coachReview: {
      readiness,
      headline,
      positives,
      risks,
      nextFocus
    }
  };
}

module.exports = {
  buildCoachReview,
  buildWeeklyTrend,
  calculateCoreStats
};
