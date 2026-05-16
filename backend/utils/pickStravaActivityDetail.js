/**
 * Curated Strava GET /activities/{id} payload for the frontend (smaller than full JSON).
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>|null}
 */
function pickStravaActivityDetail(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const map = raw.map && typeof raw.map === 'object' ? raw.map : null;

  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    distance: raw.distance,
    moving_time: raw.moving_time,
    elapsed_time: raw.elapsed_time,
    total_elevation_gain: raw.total_elevation_gain,
    start_date: raw.start_date,
    timezone: raw.timezone,
    average_speed: raw.average_speed,
    max_speed: raw.max_speed,
    has_heartrate: raw.has_heartrate,
    average_heartrate: raw.average_heartrate,
    max_heartrate: raw.max_heartrate,
    suffer_score: raw.suffer_score,
    calories: raw.calories,
    description: raw.description,
    gear_id: raw.gear_id,
    device_name: raw.device_name,
    achievement_count: raw.achievement_count,
    kudos_count: raw.kudos_count,
    comment_count: raw.comment_count,
    average_cadence: raw.average_cadence,
    max_cadence: raw.max_cadence,
    map: map
      ? {
          id: map.id,
          summary_polyline: map.summary_polyline,
          polyline: map.polyline,
          resource_state: map.resource_state
        }
      : null,
    start_latlng: raw.start_latlng,
    end_latlng: raw.end_latlng,
    location_city: raw.location_city,
    location_state: raw.location_state,
    location_country: raw.location_country,
    splits_metric: raw.splits_metric,
    splits_standard: raw.splits_standard,
    pr_count: raw.pr_count,
    workout_type: raw.workout_type
  };
}

module.exports = { pickStravaActivityDetail };
