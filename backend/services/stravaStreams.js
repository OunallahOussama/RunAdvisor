const { stravaAxios } = require('../utils/stravaCredentials');

const DEFAULT_KEYS = ['time', 'distance', 'altitude', 'heartrate', 'cadence', 'velocity_smooth'];

function downsampleSeries(values, maxPoints = 120) {
  if (!Array.isArray(values) || values.length <= maxPoints) {
    return values || [];
  }

  const step = Math.ceil(values.length / maxPoints);
  const sampled = [];

  for (let i = 0; i < values.length; i += step) {
    sampled.push(values[i]);
  }

  return sampled;
}

function normalizeStreamPayload(streams) {
  const byKey = {};

  (streams || []).forEach((stream) => {
    if (stream?.type) {
      byKey[stream.type] = stream.data;
    }
  });

  const time = byKey.time || [];
  const distance = byKey.distance || [];
  const altitude = byKey.altitude || [];
  const heartrate = byKey.heartrate || [];
  const cadence = byKey.cadence || [];
  const velocity = byKey.velocity_smooth || [];

  const paceMinPerKm = velocity.map((mps) => {
    if (!mps || mps <= 0) {
      return null;
    }

    return Number((1000 / (mps * 60)).toFixed(2));
  });

  return {
    pointCount: time.length,
    time: downsampleSeries(time),
    distance: downsampleSeries(distance),
    altitude: downsampleSeries(altitude),
    heartrate: downsampleSeries(heartrate),
    cadence: downsampleSeries(cadence),
    paceMinPerKm: downsampleSeries(paceMinPerKm)
  };
}

async function fetchActivityStreams(accessToken, stravaActivityId, keys = DEFAULT_KEYS) {
  const response = await stravaAxios.get(
    `https://www.strava.com/api/v3/activities/${stravaActivityId}/streams`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        keys: keys.join(','),
        key_by_type: true
      }
    }
  );

  const raw = response.data;
  const streams = keys.map((key) => raw[key]).filter(Boolean);

  return normalizeStreamPayload(streams);
}

async function fetchAthleteStats(accessToken, stravaAthleteId) {
  const response = await stravaAxios.get(
    `https://www.strava.com/api/v3/athletes/${stravaAthleteId}/stats`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  return response.data;
}

async function fetchSegmentEfforts(accessToken, stravaActivityId, limit = 10) {
  const response = await stravaAxios.get(
    `https://www.strava.com/api/v3/activities/${stravaActivityId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { include_all_efforts: false }
    }
  );

  const efforts = response.data?.segment_efforts || [];

  return efforts.slice(0, limit).map((effort) => ({
    id: effort.id,
    name: effort.name,
    distance: effort.distance,
    elapsedTime: effort.elapsed_time,
    prRank: effort.pr_rank,
    komRank: effort.kom_rank,
    averageCadence: effort.average_cadence,
    averageWatts: effort.average_watts
  }));
}

module.exports = {
  fetchActivityStreams,
  fetchAthleteStats,
  fetchSegmentEfforts,
  normalizeStreamPayload,
  downsampleSeries
};
