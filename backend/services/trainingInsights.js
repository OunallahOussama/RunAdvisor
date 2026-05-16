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
      paceCount: 0,
      hrSum: 0,
      hrCount: 0,
      elevationM: 0
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

    if (Number.isFinite(activity.avgHeartRate)) {
      bucket.hrSum += activity.avgHeartRate;
      bucket.hrCount += 1;
    }

    bucket.elevationM += Number(activity.elevationGain || 0);
  });

  return buckets.map((bucket) => ({
    label: bucket.label,
    totalDistanceKm: round(bucket.totalDistanceKm),
    totalDurationMinutes: round(bucket.totalDurationMinutes),
    avgPace: bucket.paceCount ? round(bucket.paceSum / bucket.paceCount) : null,
    longestRunKm: round(bucket.longestRunKm),
    activityCount: bucket.activityCount,
    avgHeartRate: bucket.hrCount ? round(bucket.hrSum / bucket.hrCount) : null,
    totalElevationM: round(bucket.elevationM, 0)
  }));
}

function filterActivitiesSinceMs(activities = [], sinceMs) {
  return activities.filter((activity) => {
    const date = safeDate(activity.date);
    return date && date.getTime() >= sinceMs;
  });
}

function buildDailyMetricsTrend(activities = [], daysBack = 28) {
  const runActivities = activities.filter(isRunActivity);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end.getTime() - (daysBack - 1) * DAY_MS);
  start.setHours(0, 0, 0, 0);
  const map = new Map();

  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    const d = new Date(t);
    const key = d.toISOString().slice(0, 10);
    map.set(key, {
      date: key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      distanceKm: 0,
      movingMinutes: 0,
      elevationM: 0,
      paceSum: 0,
      paceCount: 0,
      hrSum: 0,
      hrCount: 0,
      activityCount: 0
    });
  }

  runActivities.forEach((activity) => {
    const day = safeDate(activity.date);
    if (!day) {
      return;
    }

    const key = day.toISOString().slice(0, 10);

    if (!map.has(key)) {
      return;
    }

    const row = map.get(key);
    row.distanceKm += Number(activity.distance || 0) / 1000;
    row.movingMinutes += Number(activity.movingTime || activity.duration || 0) / 60;
    row.elevationM += Number(activity.elevationGain || 0);

    if (Number.isFinite(activity.pace)) {
      row.paceSum += activity.pace;
      row.paceCount += 1;
    }

    if (Number.isFinite(activity.avgHeartRate)) {
      row.hrSum += activity.avgHeartRate;
      row.hrCount += 1;
    }

    row.activityCount += 1;
  });

  return Array.from(map.values()).map((row) => ({
    date: row.date,
    label: row.label,
    distanceKm: round(row.distanceKm, 2),
    movingMinutes: round(row.movingMinutes, 1),
    elevationM: round(row.elevationM, 0),
    avgPace: row.paceCount ? round(row.paceSum / row.paceCount, 2) : null,
    avgHeartRate: row.hrCount ? round(row.hrSum / row.hrCount) : null,
    activityCount: row.activityCount
  }));
}

const RIEGEL_EXPONENT = 1.06;

function formatRaceFinishClock(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return null;
  }

  const totalSeconds = Math.round(totalMinutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildRacePacePrediction(lastWeekActivities = [], raceDistanceKm) {
  const base = {
    raceDistanceKm,
    predictedPaceMinPerKm: null,
    predictedFinishTimeMinutes: null,
    predictedFinishTimeLabel: null,
    method: 'insufficient_data',
    confidence: 'low',
    explanation: '',
    referenceRun: null
  };

  if (!raceDistanceKm || raceDistanceKm <= 0) {
    base.explanation = 'Set a race distance to see a pace outlook grounded in last week\'s training.';
    return base;
  }

  const runs = lastWeekActivities.filter(isRunActivity);

  if (runs.length === 0) {
    base.explanation = 'Log at least one run in the last 7 days to unlock a last-week-based race pace outlook.';
    return base;
  }

  let ref = null;

  runs.forEach((a) => {
    const dk = Number(a.distance || 0) / 1000;
    const pace = a.pace;

    if (dk < 3 || !Number.isFinite(pace)) {
      return;
    }

    if (!ref || dk > ref.distanceKm) {
      const movingMin = Number(a.movingTime || a.duration || 0) / 60;
      ref = {
        distanceKm: round(dk, 2),
        durationMinutes: round(movingMin, 1),
        paceMinPerKm: pace,
        date: a.date
      };
    }
  });

  if (ref && ref.distanceKm > 0.5) {
    const T1 = ref.durationMinutes;
    const D1 = ref.distanceKm;
    const D2 = raceDistanceKm;
    const ratio = D2 / D1;
    const T2 = T1 * (ratio ** RIEGEL_EXPONENT);
    const pace = T2 / D2;
    let confidence = 'high';

    if (ratio > 2.2) {
      confidence = 'low';
    } else if (ratio > 1.5) {
      confidence = 'medium';
    }

    return {
      ...base,
      predictedPaceMinPerKm: round(pace, 2),
      predictedFinishTimeMinutes: round(T2, 1),
      predictedFinishTimeLabel: formatRaceFinishClock(T2),
      method: 'riegel_longest_run_last_week',
      confidence,
      referenceRun: ref,
      explanation: `Projected from your longest quality run last week (${ref.distanceKm} km at ~${round(ref.paceMinPerKm, 2)} min/km) using a Riegel-style curve to ${raceDistanceKm} km. Treat as a pace band, not a guarantee.`
    };
  }

  const stats = calculateCoreStats(runs);

  if (!stats.avgPace) {
    base.explanation = 'Add pace data from GPS or manual logs to estimate race intensity.';
    return base;
  }

  let adj = 0.05;

  if (raceDistanceKm <= 10) {
    adj = -0.35;
  } else if (raceDistanceKm <= 21.1) {
    adj = -0.15;
  } else if (raceDistanceKm <= 42.2) {
    adj = 0.05;
  } else {
    adj = 0.15;
  }

  const pace = Math.max(2.4, stats.avgPace + adj);
  const T2 = pace * raceDistanceKm;

  return {
    ...base,
    predictedPaceMinPerKm: round(pace, 2),
    predictedFinishTimeMinutes: round(T2, 1),
    predictedFinishTimeLabel: formatRaceFinishClock(T2),
    method: 'weekly_avg_pace_adjusted',
    confidence: 'medium',
    explanation: `No long run last week met the Riegel threshold, so pace assumes your recent average rhythm (${stats.avgPace} min/km) adjusted for ${raceDistanceKm} km race specificity.`
  };
}

function buildWeeklyRacePaceProjection(weeklyTrend = [], raceDistanceKm) {
  if (!raceDistanceKm || raceDistanceKm <= 0) {
    return [];
  }

  return weeklyTrend.map((week) => {
    if (!week.avgPace) {
      return { label: week.label, predictedPaceMinPerKm: null };
    }

    let adj = 0.05;

    if (raceDistanceKm <= 10) {
      adj = -0.35;
    } else if (raceDistanceKm <= 21.1) {
      adj = -0.15;
    } else if (raceDistanceKm <= 42.2) {
      adj = 0.05;
    } else {
      adj = 0.15;
    }

    return {
      label: week.label,
      predictedPaceMinPerKm: round(Math.max(2.4, week.avgPace + adj), 2)
    };
  });
}

function buildCoachReview(activities = [], user = {}, options = {}) {
  const { days = 28, raceDistance = null, raceDate = null, raceName = '' } = options;
  const summary = calculateCoreStats(activities);
  const trend = buildWeeklyTrend(activities, 6);
  const raceDistanceKm = raceDistance != null && Number.isFinite(Number(raceDistance))
    ? Number(raceDistance)
    : null;
  const lastWeekSince = Date.now() - (7 * DAY_MS);
  const lastWeekActivities = filterActivitiesSinceMs(activities, lastWeekSince);
  const lastWeekSummary = calculateCoreStats(lastWeekActivities);
  const dailyMetrics = buildDailyMetricsTrend(activities, 28);
  const racePacePrediction = buildRacePacePrediction(lastWeekActivities, raceDistanceKm);
  const weeklyRacePaceProjection = buildWeeklyRacePaceProjection(trend, raceDistanceKm);
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

  if (racePacePrediction.predictedPaceMinPerKm && raceDistanceKm) {
    nextFocus.push(`Model check: about ${racePacePrediction.predictedPaceMinPerKm} min/km for ${raceDistanceKm} km based on last week — tune with tempo and long-run rehearsals.`);
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
    },
    lastWeekSummary,
    dailyMetrics,
    racePacePrediction,
    weeklyRacePaceProjection
  };
}

module.exports = {
  buildCoachReview,
  buildWeeklyTrend,
  calculateCoreStats,
  buildDailyMetricsTrend,
  buildRacePacePrediction
};
