const Activity = require('../models/Activity');
const Recommendation = require('../models/Recommendation');

/**
 * Find activities similar to a given performance vector
 */
async function findSimilarActivities(vector, userId, limit = 5) {
  const allActivities = await Activity.find({ userId });

  const scored = allActivities.map((activity) => ({
    ...activity.toObject(),
    similarity: cosineSimilarity(vector, activity.performanceVector)
  }));

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

function buildRecommendations(userId, recentActivities, user, raceContext = {}) {
  const recommendations = [];
  const stats = calculateActivityStats(recentActivities);
  const { raceDistance, raceDate, raceName } = raceContext;
  const raceDays = raceDate ? Math.max(0, Math.ceil((new Date(raceDate) - Date.now()) / (24 * 60 * 60 * 1000))) : null;
  const hasStravaConnection = Boolean(user?.stravaId);

  if (hasStravaConnection && stats.activityCount >= 2) {
    recommendations.push({
      title: 'Strava-Based Weekly Training Plan',
      description: 'Your plan now adapts directly to your synced Strava runs. Keep syncing after key sessions for better pacing and recovery recommendations.',
      type: 'training_plan',
      recommendedDistance: Math.max(5, Number((stats.totalDistance * 1.1).toFixed(1))),
      recommendedPace: Number((stats.avgPace + 0.4).toFixed(1)),
      priority: 'high',
      reasoning: `Based on ${stats.activityCount} synced runs from Strava over ${stats.daysSpan} day(s), we recommend a controlled mileage increase with recovery-aware pacing.`
    });
  }

  if (stats.avgPace < 6 && stats.activityCount >= 3) {
    recommendations.push({
      title: 'Schedule Recovery Run',
      description: 'You\'ve been running fast recently. A recovery run will help prevent injury.',
      type: 'recovery',
      recommendedPace: stats.avgPace + 2,
      recommendedDistance: stats.avgDistance * 0.8,
      priority: 'high',
      reasoning: `Your average pace of ${stats.avgPace.toFixed(1)} min/km suggests high-intensity training.`
    });

    recommendations.push({
      title: 'Add Aerobic Endurance Session',
      description: 'Support your speed work with steady endurance training to keep your legs fresh.',
      type: 'training_plan',
      recommendedPace: stats.avgPace + 1,
      recommendedDistance: Math.max(stats.avgDistance, stats.maxDistance * 0.9),
      priority: 'medium',
      reasoning: `A supplemental endurance session helps balance high-intensity training and build resilience.`
    });
  }

  if (stats.avgDistance < 10) {
    recommendations.push({
      title: 'Increase Long Run Distance',
      description: 'Build endurance by gradually increasing your longest run.',
      type: 'training_plan',
      recommendedDistance: stats.maxDistance * 1.1,
      recommendedPace: stats.avgPace + 1,
      priority: 'medium',
      reasoning: `Your longest run this week was ${stats.maxDistance.toFixed(1)}km. Increasing to ${(stats.maxDistance * 1.1).toFixed(1)}km will build aerobic base.`
    });
  }

  if (stats.activityCount >= 5) {
    recommendations.push({
      title: 'Rest Day',
      description: 'You\'ve been active every day. Take a rest day for recovery.',
      type: 'rest_day',
      priority: 'high',
      reasoning: `${stats.activityCount} activities in ${stats.daysSpan} days. Rest is crucial for adaptation.`
    });
  }

  if (stats.avgPace > 7 && stats.activityCount >= 2) {
    recommendations.push({
      title: 'Add Speed Work',
      description: 'Include tempo runs or intervals to improve pace.',
      type: 'training_plan',
      recommendedPace: stats.avgPace - 1,
      recommendedDistance: stats.avgDistance * 0.8,
      priority: 'medium',
      reasoning: `Current average pace is ${stats.avgPace.toFixed(1)} min/km. Speed work can improve performance.`
    });
  }

  if (raceDistance && raceDays !== null) {
    const targetPace = Math.max(stats.avgPace - 0.5, 3.5);
    const raceDescription = raceName ? `for your upcoming ${raceName}` : 'for your upcoming race';
    const raceTitle = raceDays <= 14 ? 'Taper for Race Day' : 'Race Preparation Plan';

    recommendations.push({
      title: raceTitle,
      description: `Tune your training ${raceDescription} with priority on smart recovery and pace control.`,
      type: 'training_plan',
      recommendedPace: targetPace,
      recommendedDistance: Math.max(3, raceDistance * 0.6),
      priority: raceDays <= 14 ? 'high' : 'medium',
      reasoning: `Your race is ${raceDays} days away. Focus on maintaining fitness while reducing fatigue.`
    });

    if (raceDistance >= 21 && raceDays <= 30) {
      recommendations.push({
        title: 'Race-Specific Long Run',
        description: 'Add a long training run that mirrors your race distance and terrain.',
        type: 'training_plan',
        recommendedDistance: Math.min(raceDistance * 0.9, stats.maxDistance * 1.15),
        priority: 'high',
        reasoning: `A long run with race-like pacing will help you build confidence ahead of the event.`
      });
    }
  }

  return recommendations;
}

async function generateRecommendations(userId, recentActivities, user, raceContext = {}) {
  const recommendations = buildRecommendations(userId, recentActivities, user, raceContext);
  const savedRecommendations = [];

  for (const rec of recommendations) {
    const recommendation = new Recommendation({
      userId,
      ...rec,
      basedOnActivities: recentActivities.map((a) => a._id),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    const saved = await recommendation.save();
    savedRecommendations.push(saved);
  }

  return savedRecommendations;
}

function calculateActivityStats(activities) {
  let totalDistance = 0;
  let maxDistance = 0;
  let totalPace = 0;
  let minDate = new Date();
  let maxDate = new Date(0);

  activities.forEach((activity) => {
    const distanceKm = activity.distance / 1000;
    totalDistance += distanceKm;
    maxDistance = Math.max(maxDistance, distanceKm);
    totalPace += activity.pace || 0;
    const date = new Date(activity.date);
    minDate = date < minDate ? date : minDate;
    maxDate = date > maxDate ? date : maxDate;
  });

  const activityCount = activities.length;
  return {
    totalDistance,
    avgDistance: totalDistance / activityCount,
    maxDistance,
    avgPace: totalPace / activityCount,
    activityCount,
    daysSpan: Math.max(1, Math.ceil((maxDate - minDate) / (24 * 60 * 60 * 1000)) + 1)
  };
}

function cosineSimilarity(vec1 = [], vec2 = []) {
  if (!vec1.length || !vec2.length || vec1.length !== vec2.length) return 0;

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i += 1) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
}

module.exports = {
  findSimilarActivities,
  generateRecommendations,
  buildRecommendations,
  calculateActivityStats,
  cosineSimilarity
};
