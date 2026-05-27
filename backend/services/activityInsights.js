const { compareSplitProfiles } = require('./vectorSegments');
const { round, formatPaceMinPerKm } = require('../utils/numbers');

function formatPace(minPerKm) {
  if (!minPerKm || !Number.isFinite(minPerKm)) {
    return null;
  }

  return formatPaceMinPerKm(minPerKm);
}

function formatMovingTime(seconds) {
  const total = Math.round(Number(seconds) || 0);
  if (total <= 0) {
    return null;
  }

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function buildTechDetailLines(activity, stravaDetail = null) {
  const lines = [];
  const distanceKm = round(Number(activity?.distance || 0) / 1000);
  const paceLabel = formatPace(activity?.pace);
  const movingLabel = formatMovingTime(activity?.movingTime || activity?.duration);
  const summaryParts = [];

  if (distanceKm > 0) {
    summaryParts.push(`${distanceKm} km`);
  }

  if (paceLabel) {
    summaryParts.push(paceLabel);
  }

  if (movingLabel) {
    summaryParts.push(`${movingLabel} moving`);
  }

  if (summaryParts.length) {
    lines.push(summaryParts.join(' · '));
  }

  const elev = Math.round(Number(stravaDetail?.total_elevation_gain ?? activity?.elevationGain ?? 0));

  if (elev > 0) {
    lines.push(`Elevation +${elev} m`);
  }

  const avgHr = stravaDetail?.average_heartrate ?? activity?.avgHeartRate;
  const maxHr = stravaDetail?.max_heartrate ?? activity?.maxHeartRate;

  if (avgHr) {
    lines.push(
      `HR avg ${Math.round(avgHr)} bpm${maxHr ? ` · max ${Math.round(maxHr)} bpm` : ''}`
    );
  }

  if (stravaDetail?.average_cadence || activity?.avgCadence) {
    lines.push(`Cadence avg ${Math.round(stravaDetail?.average_cadence ?? activity.avgCadence)} spm`);
  }

  if (stravaDetail?.suffer_score || activity?.sufferScore) {
    lines.push(`Relative effort ${stravaDetail?.suffer_score ?? activity.sufferScore}`);
  }

  if (stravaDetail?.calories || activity?.calories) {
    lines.push(`Calories ${Math.round(stravaDetail?.calories ?? activity.calories)}`);
  }

  if (stravaDetail?.device_name) {
    lines.push(`Device ${stravaDetail.device_name}`);
  }

  return lines;
}

function buildTldr(highlights, narrativeLines) {
  if (highlights.length && narrativeLines.length) {
    return `${highlights[0]} — ${narrativeLines[0].replace(/\.$/, '')}.`;
  }

  if (highlights.length) {
    return `${highlights[0]} on this session.`;
  }

  if (narrativeLines.length) {
    const first = narrativeLines[0];
    return first.length > 140 ? `${first.slice(0, 137).trim()}…` : first;
  }

  return 'Solid session logged — open RunAdvisor for pacing and load context.';
}

/**
 * Rule-based run insight from Strava splits and activity metrics (no external LLM).
 */
function buildActivityInsight(activity, stravaDetail = null) {
  const splits = stravaDetail?.splits_metric;
  const lines = [];
  const highlights = [];

  if (Array.isArray(splits) && splits.length >= 2) {
    const kmPaces = splits.map((split, index) => {
      const distanceKm = Number(split.distance || 0) / 1000;
      const movingMin = Number(split.moving_time || 0) / 60;

      if (!distanceKm || !movingMin) {
        return null;
      }

      return { km: index + 1, pace: movingMin / distanceKm };
    }).filter(Boolean);

    if (kmPaces.length >= 2) {
      const firstHalf = kmPaces.slice(0, Math.ceil(kmPaces.length / 2));
      const secondHalf = kmPaces.slice(Math.ceil(kmPaces.length / 2));
      const avg = (arr) => arr.reduce((sum, item) => sum + item.pace, 0) / arr.length;
      const firstAvg = avg(firstHalf);
      const secondAvg = avg(secondHalf);
      const delta = secondAvg - firstAvg;

      if (delta <= -0.15) {
        highlights.push('Negative split');
        lines.push('You ran the second half faster than the first — strong pacing discipline.');
      } else if (delta >= 0.2) {
        highlights.push('Positive split');
        lines.push('Pace faded in the second half. Consider starting slightly easier on your next long effort.');
      } else {
        highlights.push('Even pacing');
        lines.push('Pace stayed relatively steady across kilometers — good control for race rehearsal.');
      }

      const fastest = kmPaces.reduce((best, item) => (item.pace < best.pace ? item : best), kmPaces[0]);
      const slowest = kmPaces.reduce((worst, item) => (item.pace > worst.pace ? item : worst), kmPaces[0]);
      lines.push(
        `Fastest km ${fastest.km} (${formatPace(fastest.pace)}), slowest km ${slowest.km} (${formatPace(slowest.pace)}).`
      );
    }
  }

  const elev = Number(stravaDetail?.total_elevation_gain ?? activity?.elevationGain ?? 0);
  const distanceKm = Number(activity?.distance || 0) / 1000;

  if (elev > 150 && distanceKm > 0) {
    lines.push(`Climbing ${Math.round(elev)} m over ${round(distanceKm)} km — factor terrain into recovery and next-week load.`);
  }

  if (stravaDetail?.suffer_score) {
    lines.push(`Relative effort (Strava): ${stravaDetail.suffer_score}. Use this to balance easy days after hard sessions.`);
  }

  if (stravaDetail?.average_heartrate && stravaDetail?.max_heartrate) {
    const hrReserve = stravaDetail.max_heartrate - stravaDetail.average_heartrate;

    if (hrReserve < 25) {
      lines.push('Heart rate stayed in a narrow band — likely a steady aerobic or tempo effort.');
    }
  }

  const summary = lines.length
    ? lines.join(' ')
    : 'Add more split or heart-rate data on Strava to unlock deeper pacing insights for this run.';

  return {
    highlights,
    summary,
    tldr: buildTldr(highlights, lines),
    techDetails: buildTechDetailLines(activity, stravaDetail),
    splitCount: Array.isArray(splits) ? splits.length : 0
  };
}

module.exports = {
  buildActivityInsight,
  buildTechDetailLines,
  compareSplitProfiles
};
