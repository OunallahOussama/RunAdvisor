const { cosineSimilarity } = require('../utils/vectorMath');

const SEGMENT_DEFS = [
  { key: 'pace', label: 'Pace block', indices: [0, 2] },
  { key: 'volume', label: 'Volume block', indices: [0, 1] },
  { key: 'terrain', label: 'Terrain & effort', indices: [3, 4, 5] }
];

function padVector(values, size = 6) {
  const vector = Array.isArray(values) ? [...values] : [];

  while (vector.length < size) {
    vector.push(0);
  }

  return vector.slice(0, size);
}

function extractSegmentVector(performanceVector, indices) {
  const full = padVector(performanceVector);
  const values = indices.map((index) => full[index] ?? 0);

  while (values.length < 3) {
    values.push(0);
  }

  return values.slice(0, 3);
}

function getActivitySegments(activity) {
  const vector = padVector(activity.performanceVector);

  return SEGMENT_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    vector: extractSegmentVector(vector, def.indices)
  }));
}

function scoreSegmentPair(querySegment, candidateSegment) {
  return cosineSimilarity(querySegment.vector, candidateSegment.vector);
}

/**
 * Find similar run segments across activities using cosine similarity per segment block.
 */
function findSimilarRunSegments(activities, { activityId = null, limit = 6 } = {}) {
  if (!Array.isArray(activities) || activities.length < 2) {
    return [];
  }

  const baseActivity = activityId
    ? activities.find((item) => String(item._id) === String(activityId))
    : activities[0];

  if (!baseActivity?.performanceVector?.length) {
    return [];
  }

  const baseSegments = getActivitySegments(baseActivity);
  const matches = [];

  activities.forEach((candidate) => {
    if (String(candidate._id) === String(baseActivity._id)) {
      return;
    }

    if (!candidate.performanceVector?.length) {
      return;
    }

    const candidateSegments = getActivitySegments(candidate);

    baseSegments.forEach((baseSegment) => {
      const bestCandidate = candidateSegments
        .map((candidateSegment) => ({
          candidateSegment,
          similarity: scoreSegmentPair(baseSegment, candidateSegment)
        }))
        .sort((a, b) => b.similarity - a.similarity)[0];

      if (!bestCandidate || bestCandidate.similarity <= 0.55) {
        return;
      }

      matches.push({
        segmentKey: baseSegment.key,
        segmentLabel: baseSegment.label,
        similarity: Number(bestCandidate.similarity.toFixed(3)),
        matchedSegmentLabel: bestCandidate.candidateSegment.label,
        baseActivity: {
          id: baseActivity._id,
          name: baseActivity.name,
          date: baseActivity.date,
          distanceKm: Number((baseActivity.distance || 0) / 1000).toFixed(2),
          pace: baseActivity.pace
        },
        similarActivity: {
          id: candidate._id,
          name: candidate.name,
          date: candidate.date,
          distanceKm: Number((candidate.distance || 0) / 1000).toFixed(2),
          pace: candidate.pace
        }
      });
    });
  });

  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

function buildUserPreferenceVector(user = {}) {
  const experienceMap = {
    beginner: 0.25,
    intermediate: 0.55,
    advanced: 0.85
  };

  return padVector([
    Number(user.preferredDistance || 10) / 42.2,
    Number(user.goalPaceMinPerKm || 6) / 12,
    Number(user.weeklyTrainingLoadKm || 30) / 120,
    experienceMap[user.experience] ?? 0.5,
    Array.isArray(user.trainingGoals) ? Math.min(user.trainingGoals.length / 4, 1) : 0,
    user.stravaId ? 1 : 0.3
  ]);
}

/**
 * Build a normalized per-km pace profile from Strava metric splits (up to 12 km).
 */
function buildSplitProfileVector(splits) {
  if (!Array.isArray(splits) || splits.length === 0) {
    return null;
  }

  const paces = splits.slice(0, 12).map((split) => {
    const distanceKm = Number(split.distance || 0) / 1000;
    const movingMin = Number(split.moving_time || 0) / 60;

    if (!distanceKm || !movingMin) {
      return null;
    }

    return movingMin / distanceKm;
  }).filter((pace) => pace != null && pace > 0);

  if (!paces.length) {
    return null;
  }

  const maxPace = Math.max(...paces);

  return paces.map((pace) => Number((pace / maxPace).toFixed(4)));
}

function compareSplitProfiles(splitsA, splitsB) {
  const vectorA = buildSplitProfileVector(splitsA);
  const vectorB = buildSplitProfileVector(splitsB);

  if (!vectorA || !vectorB) {
    return null;
  }

  const size = Math.max(vectorA.length, vectorB.length);
  const paddedA = padVector(vectorA, size);
  const paddedB = padVector(vectorB, size);

  return Number(cosineSimilarity(paddedA, paddedB).toFixed(3));
}

function findSimilarActivitiesForId(activities, activityId, limit = 5) {
  const base = activities.find((item) => String(item._id) === String(activityId));

  if (!base?.performanceVector?.length) {
    return [];
  }

  return activities
    .filter((item) => String(item._id) !== String(activityId) && item.performanceVector?.length)
    .map((item) => ({
      activityId: item._id,
      name: item.name,
      date: item.date,
      type: item.type,
      distanceKm: Number((item.distance || 0) / 1000).toFixed(2),
      pace: item.pace,
      elevationGain: item.elevationGain,
      similarity: Number(cosineSimilarity(base.performanceVector, item.performanceVector).toFixed(3))
    }))
    .filter((item) => item.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

function matchActivitiesToProfile(activities, user, limit = 5) {
  const preferenceVector = buildUserPreferenceVector(user);

  return activities
    .filter((activity) => activity.performanceVector?.length)
    .map((activity) => ({
      activityId: activity._id,
      name: activity.name,
      date: activity.date,
      distanceKm: Number((activity.distance || 0) / 1000).toFixed(2),
      pace: activity.pace,
      similarity: Number(cosineSimilarity(preferenceVector, activity.performanceVector).toFixed(3))
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

module.exports = {
  findSimilarRunSegments,
  findSimilarActivitiesForId,
  buildUserPreferenceVector,
  matchActivitiesToProfile,
  getActivitySegments,
  buildSplitProfileVector,
  compareSplitProfiles
};
