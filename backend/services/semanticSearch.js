const { cosineSimilarity } = require('../utils/vectorMath');

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'my', 'run', 'runs']);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Lightweight local semantic vector (bag-of-words hash) — no external API required.
 */
function buildSemanticVector(activity) {
  const text = [
    activity.name,
    activity.type,
    activity.notes,
    `pace${activity.pace}`,
    `distance${Math.round(Number(activity.distance || 0) / 1000)}`,
    `elevation${activity.elevationGain}`
  ].join(' ');

  const tokens = tokenize(text);
  const dims = 32;
  const vector = new Array(dims).fill(0);

  tokens.forEach((token) => {
    let hash = 0;

    for (let i = 0; i < token.length; i += 1) {
      hash = (hash * 31 + token.charCodeAt(i)) % dims;
    }

    vector[hash] += 1;
  });

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  return magnitude > 0 ? vector.map((value) => value / magnitude) : vector;
}

function buildQueryVector(query) {
  return buildSemanticVector({ name: query, notes: query, type: 'run' });
}

function searchActivitiesSemantically(activities, query, limit = 10) {
  const queryVector = buildQueryVector(query);

  return activities
    .map((activity) => {
      const vector = activity.semanticVector?.length
        ? activity.semanticVector
        : buildSemanticVector(activity);

      return {
        activityId: activity._id,
        name: activity.name,
        date: activity.date,
        type: activity.type,
        distanceKm: Number((activity.distance || 0) / 1000).toFixed(2),
        pace: activity.pace,
        score: Number(cosineSimilarity(queryVector, vector).toFixed(3))
      };
    })
    .filter((item) => item.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = {
  buildSemanticVector,
  buildQueryVector,
  searchActivitiesSemantically,
  tokenize
};
