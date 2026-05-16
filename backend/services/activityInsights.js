const { compareSplitProfiles } = require('./vectorSegments');

function formatPace(minPerKm) {
  if (!minPerKm || !Number.isFinite(minPerKm)) {
    return null;
  }

  return `${minPerKm.toFixed(1)} min/km`;
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
    lines.push(`Climbing ${Math.round(elev)} m over ${distanceKm.toFixed(1)} km — factor terrain into recovery and next-week load.`);
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

  return {
    highlights,
    summary: lines.length ? lines.join(' ') : 'Add more split or heart-rate data on Strava to unlock deeper pacing insights for this run.',
    splitCount: Array.isArray(splits) ? splits.length : 0
  };
}

module.exports = {
  buildActivityInsight,
  compareSplitProfiles
};
