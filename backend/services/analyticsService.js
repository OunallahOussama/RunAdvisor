/**
 * analyticsService
 *
 * Computes the rich numeric inputs that power the professional training
 * report. Given a userId and a window of activities, it produces:
 *   - Aggregate volume, pace, elevation, HR, intensity distribution.
 *   - Training-load proxies (weekly load, ACWR, monotony, strain).
 *   - Trend deltas (current vs previous 7d and 28d).
 *   - Per-activity analytics (km splits, fastest/slowest km, pace
 *     variability, negative/positive split, HR drift, RPE estimate).
 *   - PRs / best efforts in the window.
 *
 * All values are derived from data the project already persists.
 * HR-based intensity falls back to pace-based when HR is missing.
 */

const Activity = require('../models/Activity');

const DAY_MS = 24 * 60 * 60 * 1000;

function round(value, decimals = 1) {
  if (!Number.isFinite(Number(value))) {
    return 0;
  }

  const factor = 10 ** decimals;
  return Math.round(Number(value) * factor) / factor;
}

function isRun(activity = {}) {
  const type = String(activity.type || '').toLowerCase();
  return !type || type.includes('run');
}

function distanceKm(activity) {
  return Number(activity?.distance || 0) / 1000;
}

function movingMinutes(activity) {
  return Number(activity?.movingTime || activity?.duration || 0) / 60;
}

function paceMinPerKm(activity) {
  if (Number.isFinite(Number(activity?.pace)) && Number(activity.pace) > 0) {
    return Number(activity.pace);
  }

  const dk = distanceKm(activity);
  const mins = movingMinutes(activity);
  return dk > 0 && mins > 0 ? mins / dk : 0;
}

function stddev(values) {
  if (!values || values.length < 2) {
    return 0;
  }

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function average(values) {
  if (!values || values.length === 0) {
    return 0;
  }

  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Effort proxy used for training load and intensity bucketing.
 *
 *   - If we have an avg HR and a user max HR, we use HR reserve %.
 *   - Otherwise we fall back to pace-relative effort against the
 *     user's recent average pace (faster than avg → harder).
 *   - Final value is clamped to [0, 1].
 */
function estimateEffortIntensity(activity, baseline = {}) {
  const { avgPace, restingHr = 55 } = baseline;
  const maxHr = baseline.maxHr || 190;
  const avgHr = Number(activity?.avgHeartRate || 0);

  if (avgHr > 0 && maxHr > restingHr) {
    const reserve = Math.max(0, Math.min(1, (avgHr - restingHr) / (maxHr - restingHr)));
    return Number(reserve.toFixed(3));
  }

  const pace = paceMinPerKm(activity);
  if (!pace || !avgPace) {
    return 0.55;
  }

  const delta = (avgPace - pace) / avgPace;
  return Math.max(0.25, Math.min(1, 0.55 + delta * 1.4));
}

function intensityBucketFromValue(value) {
  if (value < 0.6) {
    return 'easy';
  }
  if (value < 0.75) {
    return 'tempo';
  }
  if (value < 0.88) {
    return 'threshold';
  }
  return 'vo2';
}

function estimateRpe(activity, baseline) {
  const intensity = estimateEffortIntensity(activity, baseline);
  return Math.max(2, Math.min(10, Math.round(2 + intensity * 8)));
}

function trimpLikeLoad(activity, baseline) {
  const intensity = estimateEffortIntensity(activity, baseline);
  const mins = movingMinutes(activity);
  return Math.round(mins * intensity * 10);
}

/**
 * Returns an empty analytics scaffold so the report layer can still
 * render gracefully when the user has no data.
 */
function emptyAnalytics(windowDays) {
  return {
    window: { days: windowDays, activityCount: 0 },
    volume: {
      totalDistanceKm: 0,
      totalMovingMinutes: 0,
      runsPerWeek: 0,
      avgDistanceKm: 0,
      longestRunKm: 0,
      totalElevationM: 0
    },
    pace: { avgPaceMinPerKm: 0, fastestPaceMinPerKm: 0, slowestPaceMinPerKm: 0 },
    heartRate: { avgHeartRate: 0, maxHeartRate: 0 },
    intensityDistribution: { easy: 0, tempo: 0, threshold: 0, vo2: 0 },
    intensityDistributionMinutes: { easy: 0, tempo: 0, threshold: 0, vo2: 0 },
    trainingLoad: {
      weeklyLoad: 0,
      acwr: 0,
      monotony: 0,
      strain: 0,
      acuteLoad: 0,
      chronicLoad: 0
    },
    trends: {
      distanceDeltaPctWoW: null,
      distanceDeltaPct28d: null,
      paceDeltaSecPerKmWoW: null,
      currentWeekDistanceKm: 0,
      previousWeekDistanceKm: 0
    },
    weeklyLoadSeries: [],
    perActivity: [],
    personalRecords: {
      longestRunKm: 0,
      biggestClimbM: 0,
      fastestPaceMinPerKm: 0,
      fastestKilometerPaceMinPerKm: 0
    },
    dataQuality: {
      hasHeartRate: false,
      hasSplits: false,
      hasPower: false
    }
  };
}

/**
 * Build per-kilometer splits from the persisted Strava splits_metric
 * when available, otherwise from the downsampled streamSummary.
 */
function deriveKmSplits(activity) {
  const splits = Array.isArray(activity.splitsMetric) ? activity.splitsMetric : [];

  if (splits.length >= 2) {
    return splits.map((split, index) => {
      const dk = Number(split.distance || 0) / 1000;
      const mins = Number(split.moving_time || split.elapsed_time || 0) / 60;
      const pace = dk > 0 && mins > 0 ? mins / dk : 0;

      return {
        km: split.split != null ? Number(split.split) : index + 1,
        pace: pace ? round(pace, 2) : null,
        avgHr: Number.isFinite(Number(split.average_heartrate))
          ? Math.round(Number(split.average_heartrate))
          : null,
        elevDiffM: Number.isFinite(Number(split.elevation_difference))
          ? round(Number(split.elevation_difference), 0)
          : null
      };
    });
  }

  // Fallback: derive 1km buckets from the stream summary
  const stream = activity.streamSummary;
  if (!stream || !Array.isArray(stream.distance) || !Array.isArray(stream.time) || stream.distance.length < 3) {
    return [];
  }

  const totalKm = Math.floor((stream.distance[stream.distance.length - 1] || 0) / 1000);
  if (totalKm < 1) {
    return [];
  }

  const buckets = [];
  let nextKm = 1;
  let kmStartIdx = 0;

  for (let i = 0; i < stream.distance.length; i += 1) {
    const distMeters = stream.distance[i];

    if (distMeters >= nextKm * 1000 && nextKm <= totalKm) {
      const startTime = stream.time[kmStartIdx] || 0;
      const endTime = stream.time[i] || startTime;
      const dt = (endTime - startTime) / 60;
      const hrSlice = stream.heartrate
        ? stream.heartrate.slice(kmStartIdx, i).filter(Number.isFinite)
        : [];

      buckets.push({
        km: nextKm,
        pace: dt > 0 ? round(dt, 2) : null,
        avgHr: hrSlice.length ? Math.round(average(hrSlice)) : null,
        elevDiffM: null
      });

      kmStartIdx = i;
      nextKm += 1;
    }
  }

  return buckets;
}

/**
 * Computes per-activity analytics: pace variability, negative/positive
 * split, fastest/slowest km, HR drift, RPE estimate, and a one-line
 * summary suitable for inclusion in the AI prompt.
 */
function analyzeActivity(activity, baseline) {
  const dk = distanceKm(activity);
  const pace = paceMinPerKm(activity);
  const mins = movingMinutes(activity);
  const splits = deriveKmSplits(activity);
  const paces = splits.map((s) => s.pace).filter((p) => Number.isFinite(p) && p > 0);
  const variability = stddev(paces);
  const firstHalf = splits.slice(0, Math.ceil(splits.length / 2));
  const secondHalf = splits.slice(Math.ceil(splits.length / 2));
  const firstHalfPace = average(firstHalf.map((s) => s.pace).filter(Boolean));
  const secondHalfPace = average(secondHalf.map((s) => s.pace).filter(Boolean));
  const paceDelta = firstHalfPace && secondHalfPace ? secondHalfPace - firstHalfPace : null;
  let splitProfile = 'even';

  if (paceDelta != null && paceDelta <= -0.15) {
    splitProfile = 'negative';
  } else if (paceDelta != null && paceDelta >= 0.2) {
    splitProfile = 'positive';
  }

  const firstHalfHr = average(firstHalf.map((s) => s.avgHr).filter(Number.isFinite));
  const secondHalfHr = average(secondHalf.map((s) => s.avgHr).filter(Number.isFinite));
  const hrDriftBpm = firstHalfHr && secondHalfHr ? round(secondHalfHr - firstHalfHr, 1) : null;
  const fastest = splits.reduce((best, s) => (s.pace && (!best || s.pace < best.pace) ? s : best), null);
  const slowest = splits.reduce((worst, s) => (s.pace && (!worst || s.pace > worst.pace) ? s : worst), null);
  const intensity = estimateEffortIntensity(activity, baseline);
  const rpe = estimateRpe(activity, baseline);

  return {
    activityId: String(activity._id),
    stravaActivityId: activity.stravaActivityId || null,
    name: activity.name,
    date: activity.date,
    distanceKm: round(dk, 2),
    movingMinutes: round(mins, 1),
    avgPaceMinPerKm: pace ? round(pace, 2) : null,
    elevationGainM: Number(activity.elevationGain || 0),
    avgHeartRate: Number(activity.avgHeartRate || 0) || null,
    maxHeartRate: Number(activity.maxHeartRate || 0) || null,
    sufferScore: Number(activity.sufferScore || 0) || null,
    averageWatts: Number(activity.averageWatts || 0) || null,
    splits,
    paceVariabilityMinPerKm: paces.length >= 2 ? round(variability, 2) : null,
    splitProfile,
    firstHalfPaceMinPerKm: firstHalfPace ? round(firstHalfPace, 2) : null,
    secondHalfPaceMinPerKm: secondHalfPace ? round(secondHalfPace, 2) : null,
    paceDeltaMinPerKm: paceDelta != null ? round(paceDelta, 2) : null,
    hrDriftBpm,
    fastestKilometer: fastest ? { km: fastest.km, pace: fastest.pace } : null,
    slowestKilometer: slowest ? { km: slowest.km, pace: slowest.pace } : null,
    estimatedIntensity: round(intensity, 2),
    intensityBucket: intensityBucketFromValue(intensity),
    estimatedRpe: rpe,
    load: trimpLikeLoad(activity, baseline)
  };
}

function buildWeeklyLoadSeries(activities, windowDays) {
  const weeks = Math.max(1, Math.ceil(windowDays / 7));
  const now = new Date();
  const series = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const end = new Date(now.getTime() - i * 7 * DAY_MS);
    const start = new Date(end.getTime() - 7 * DAY_MS);
    const inWindow = activities.filter((a) => {
      const t = new Date(a.date).getTime();
      return t > start.getTime() && t <= end.getTime();
    });
    const totalDistanceKm = inWindow.reduce((sum, a) => sum + distanceKm(a), 0);
    const totalMinutes = inWindow.reduce((sum, a) => sum + movingMinutes(a), 0);
    const totalLoad = inWindow.reduce((sum, a) => sum + a.__load, 0);

    series.push({
      weekStart: start.toISOString().slice(0, 10),
      weekEnd: end.toISOString().slice(0, 10),
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      totalDistanceKm: round(totalDistanceKm, 1),
      totalMovingMinutes: round(totalMinutes, 0),
      load: Math.round(totalLoad),
      activityCount: inWindow.length
    });
  }

  return series;
}

function computeAcwrMonotonyStrain(activities) {
  const now = Date.now();
  const acuteStart = now - 7 * DAY_MS;
  const chronicStart = now - 28 * DAY_MS;

  const acute = activities.filter((a) => new Date(a.date).getTime() >= acuteStart);
  const chronic = activities.filter((a) => new Date(a.date).getTime() >= chronicStart);

  const acuteLoad = acute.reduce((sum, a) => sum + a.__load, 0);
  const chronicLoad28d = chronic.reduce((sum, a) => sum + a.__load, 0);
  const chronicWeeklyAvg = chronicLoad28d / 4;

  const acwr = chronicWeeklyAvg > 0 ? acuteLoad / chronicWeeklyAvg : 0;

  // Monotony = mean(daily load) / stdev(daily load) over the last 7 days
  const dailyLoads = new Array(7).fill(0);
  acute.forEach((a) => {
    const dayIdx = 6 - Math.floor((now - new Date(a.date).getTime()) / DAY_MS);
    if (dayIdx >= 0 && dayIdx < 7) {
      dailyLoads[dayIdx] += a.__load;
    }
  });

  const meanDaily = average(dailyLoads);
  const sd = stddev(dailyLoads);
  const monotony = sd > 0 ? meanDaily / sd : 0;
  const strain = acuteLoad * monotony;

  return {
    weeklyLoad: Math.round(acuteLoad),
    acuteLoad: Math.round(acuteLoad),
    chronicLoad: Math.round(chronicWeeklyAvg),
    acwr: round(acwr, 2),
    monotony: round(monotony, 2),
    strain: Math.round(strain)
  };
}

function computeIntensityDistribution(activities) {
  const counts = { easy: 0, tempo: 0, threshold: 0, vo2: 0 };
  const minutes = { easy: 0, tempo: 0, threshold: 0, vo2: 0 };
  const totalMinutes = activities.reduce((sum, a) => sum + movingMinutes(a), 0) || 1;

  activities.forEach((a) => {
    const bucket = a.__bucket;
    counts[bucket] += 1;
    minutes[bucket] += movingMinutes(a);
  });

  return {
    counts,
    minutes: {
      easy: round(minutes.easy, 0),
      tempo: round(minutes.tempo, 0),
      threshold: round(minutes.threshold, 0),
      vo2: round(minutes.vo2, 0)
    },
    pct: {
      easy: round((minutes.easy / totalMinutes) * 100, 0),
      tempo: round((minutes.tempo / totalMinutes) * 100, 0),
      threshold: round((minutes.threshold / totalMinutes) * 100, 0),
      vo2: round((minutes.vo2 / totalMinutes) * 100, 0)
    }
  };
}

function computeTrends(activities) {
  const now = Date.now();
  const thisWeek = activities.filter((a) => new Date(a.date).getTime() >= now - 7 * DAY_MS);
  const prevWeek = activities.filter((a) => {
    const t = new Date(a.date).getTime();
    return t >= now - 14 * DAY_MS && t < now - 7 * DAY_MS;
  });
  const this28 = activities.filter((a) => new Date(a.date).getTime() >= now - 28 * DAY_MS);
  const prev28 = activities.filter((a) => {
    const t = new Date(a.date).getTime();
    return t >= now - 56 * DAY_MS && t < now - 28 * DAY_MS;
  });

  const sumKm = (arr) => arr.reduce((sum, a) => sum + distanceKm(a), 0);
  const sumLoad = (arr) => arr.reduce((sum, a) => sum + a.__load, 0);

  const currentWeekKm = sumKm(thisWeek);
  const previousWeekKm = sumKm(prevWeek);
  const distanceDeltaPctWoW = previousWeekKm > 0
    ? round(((currentWeekKm - previousWeekKm) / previousWeekKm) * 100, 0)
    : null;

  const this28Km = sumKm(this28);
  const prev28Km = sumKm(prev28);
  const distanceDeltaPct28d = prev28Km > 0
    ? round(((this28Km - prev28Km) / prev28Km) * 100, 0)
    : null;

  const meanPace = (arr) => {
    const paces = arr.map(paceMinPerKm).filter((p) => p > 0);
    return paces.length ? average(paces) : 0;
  };

  const thisWeekPace = meanPace(thisWeek);
  const prevWeekPace = meanPace(prevWeek);
  const paceDeltaSecPerKmWoW = thisWeekPace && prevWeekPace
    ? Math.round((thisWeekPace - prevWeekPace) * 60)
    : null;

  return {
    currentWeekDistanceKm: round(currentWeekKm, 1),
    previousWeekDistanceKm: round(previousWeekKm, 1),
    distanceDeltaPctWoW,
    distanceDeltaPct28d,
    paceDeltaSecPerKmWoW,
    currentWeekLoad: Math.round(sumLoad(thisWeek)),
    previousWeekLoad: Math.round(sumLoad(prevWeek))
  };
}

function computePersonalRecords(activities) {
  if (!activities.length) {
    return {
      longestRunKm: 0,
      biggestClimbM: 0,
      fastestPaceMinPerKm: 0,
      fastestKilometerPaceMinPerKm: 0,
      highestSufferScore: null,
      mostRecentLongRun: null
    };
  }

  let longestRunKm = 0;
  let biggestClimbM = 0;
  let fastestPace = Infinity;
  let fastestKmPace = Infinity;
  let highestSuffer = null;
  let mostRecentLongRun = null;

  activities.forEach((a) => {
    const dk = distanceKm(a);
    if (dk > longestRunKm) {
      longestRunKm = dk;
    }
    if (Number(a.elevationGain || 0) > biggestClimbM) {
      biggestClimbM = Number(a.elevationGain || 0);
    }
    const p = paceMinPerKm(a);
    if (p > 0 && p < fastestPace && dk >= 3) {
      fastestPace = p;
    }
    if (Number(a.sufferScore || 0) > 0 && (!highestSuffer || a.sufferScore > highestSuffer.score)) {
      highestSuffer = { score: Number(a.sufferScore), date: a.date, name: a.name };
    }
    if (dk >= 12 && (!mostRecentLongRun || new Date(a.date) > new Date(mostRecentLongRun.date))) {
      mostRecentLongRun = { date: a.date, distanceKm: round(dk, 1), name: a.name };
    }
    const splits = Array.isArray(a.splitsMetric) ? a.splitsMetric : [];
    splits.forEach((s) => {
      const dkm = Number(s.distance || 0) / 1000;
      const mins = Number(s.moving_time || 0) / 60;
      if (dkm > 0.95 && dkm < 1.1 && mins > 0) {
        const kmPace = mins / dkm;
        if (kmPace < fastestKmPace) {
          fastestKmPace = kmPace;
        }
      }
    });
  });

  return {
    longestRunKm: round(longestRunKm, 1),
    biggestClimbM: round(biggestClimbM, 0),
    fastestPaceMinPerKm: Number.isFinite(fastestPace) ? round(fastestPace, 2) : 0,
    fastestKilometerPaceMinPerKm: Number.isFinite(fastestKmPace) ? round(fastestKmPace, 2) : 0,
    highestSufferScore: highestSuffer,
    mostRecentLongRun
  };
}

/**
 * Main entrypoint. Accepts either (userId, options) or (activities, options).
 */
async function buildAnalytics(userIdOrActivities, options = {}) {
  const windowDays = options.windowDays || 84;
  const user = options.user || {};
  const sinceDate = new Date(Date.now() - windowDays * DAY_MS);

  let activities;
  if (Array.isArray(userIdOrActivities)) {
    activities = userIdOrActivities.filter((a) => new Date(a.date) >= sinceDate);
  } else {
    activities = await Activity.find({
      userId: userIdOrActivities,
      date: { $gte: sinceDate }
    }).sort({ date: 1 });
  }

  activities = activities.filter(isRun);

  if (activities.length === 0) {
    return emptyAnalytics(windowDays);
  }

  const paces = activities.map(paceMinPerKm).filter((p) => p > 0);
  const baseline = {
    avgPace: paces.length ? average(paces) : 0,
    maxHr: Number(user.maxHeartRate) || 190,
    restingHr: Number(user.restingHeartRate) || 55
  };

  // annotate
  activities.forEach((a) => {
    const intensity = estimateEffortIntensity(a, baseline);
    a.__intensity = intensity;
    a.__bucket = intensityBucketFromValue(intensity);
    a.__load = trimpLikeLoad(a, baseline);
  });

  const totalDistanceKm = activities.reduce((sum, a) => sum + distanceKm(a), 0);
  const totalMovingMinutes = activities.reduce((sum, a) => sum + movingMinutes(a), 0);
  const totalElevationM = activities.reduce((sum, a) => sum + Number(a.elevationGain || 0), 0);
  const longestRunKm = activities.reduce((max, a) => Math.max(max, distanceKm(a)), 0);
  const fastestPace = paces.length ? Math.min(...paces) : 0;
  const slowestPace = paces.length ? Math.max(...paces) : 0;

  const hrValues = activities.map((a) => Number(a.avgHeartRate || 0)).filter((v) => v > 0);
  const maxHrValues = activities.map((a) => Number(a.maxHeartRate || 0)).filter((v) => v > 0);

  const intensity = computeIntensityDistribution(activities);
  const load = computeAcwrMonotonyStrain(activities);
  const trends = computeTrends(activities);
  const weeklyLoadSeries = buildWeeklyLoadSeries(activities, windowDays);
  const personalRecords = computePersonalRecords(activities);

  // Per-activity: keep the most recent 8 (or all if <8) so the AI prompt
  // stays compact but representative.
  const sortedRecent = [...activities].sort((a, b) => new Date(b.date) - new Date(a.date));
  const perActivity = sortedRecent.slice(0, 8).map((a) => analyzeActivity(a, baseline));

  const weeks = Math.max(1, windowDays / 7);
  const dataQuality = {
    hasHeartRate: hrValues.length > 0,
    hasSplits: activities.some((a) => Array.isArray(a.splitsMetric) && a.splitsMetric.length > 1),
    hasPower: activities.some((a) => Number(a.averageWatts || 0) > 0)
  };

  return {
    window: {
      days: windowDays,
      activityCount: activities.length,
      firstActivityDate: activities[0].date,
      lastActivityDate: activities[activities.length - 1].date
    },
    volume: {
      totalDistanceKm: round(totalDistanceKm, 1),
      totalMovingMinutes: round(totalMovingMinutes, 0),
      runsPerWeek: round(activities.length / weeks, 1),
      avgDistanceKm: round(totalDistanceKm / activities.length, 2),
      longestRunKm: round(longestRunKm, 1),
      totalElevationM: round(totalElevationM, 0)
    },
    pace: {
      avgPaceMinPerKm: baseline.avgPace ? round(baseline.avgPace, 2) : 0,
      fastestPaceMinPerKm: fastestPace ? round(fastestPace, 2) : 0,
      slowestPaceMinPerKm: slowestPace ? round(slowestPace, 2) : 0
    },
    heartRate: {
      avgHeartRate: hrValues.length ? Math.round(average(hrValues)) : 0,
      maxHeartRate: maxHrValues.length ? Math.max(...maxHrValues) : 0,
      restingHrAssumed: baseline.restingHr,
      maxHrAssumed: baseline.maxHr
    },
    intensityDistribution: intensity.pct,
    intensityDistributionMinutes: intensity.minutes,
    intensityDistributionCounts: intensity.counts,
    trainingLoad: load,
    trends,
    weeklyLoadSeries,
    perActivity,
    personalRecords,
    dataQuality
  };
}

module.exports = {
  buildAnalytics,
  analyzeActivity,
  deriveKmSplits,
  estimateEffortIntensity,
  intensityBucketFromValue,
  estimateRpe,
  trimpLikeLoad,
  computeAcwrMonotonyStrain,
  computeIntensityDistribution,
  computeTrends,
  computePersonalRecords,
  buildWeeklyLoadSeries
};
