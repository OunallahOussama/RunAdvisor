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
      title: 'Sync-Led Weekly Training Block',
      description: 'Use your synced training load to structure one quality session, one long aerobic run, and enough easy volume to absorb the work.',
      type: 'training_plan',
      recommendedDistance: Math.max(5, Number((stats.totalDistance * 1.1).toFixed(2))),
      recommendedPace: Number((stats.avgPace + 0.4).toFixed(2)),
      recommendedDuration: Math.round((stats.avgDurationMinutes || 45) * 1.1),
      recommendedType: 'Progression run',
      priority: 'high',
      confidence: 'high',
      focusArea: 'consistency',
      timeHorizon: 'Next 7 days',
      reasoning: `Based on ${stats.activityCount} synced runs from Strava over ${stats.daysSpan} day(s), you have enough recent data to nudge volume without guessing.`,
      whyNow: `Your recent block totals ${stats.totalDistance.toFixed(2)} km, which is enough history to tune next week's distance and pacing more precisely.`,
      actionItems: [
        `Keep your next long run close to ${Math.max(stats.maxDistance, stats.avgDistance + 2).toFixed(2)} km at a conversational effort.`,
        `Schedule one controlled quality session at around ${(stats.avgPace - 0.2).toFixed(2)} min/km and protect the day after with easy running.`,
        'Sync Strava again after your next key workout so the coach review can re-balance the following week.'
      ],
      watchOut: 'Do not stack the quality session and the long run back-to-back unless your legs feel fresh within 24 hours.'
    });
  }

  if (stats.avgPace < 6 && stats.activityCount >= 3) {
    recommendations.push({
      title: 'Schedule Recovery Run',
      description: 'Your recent pace suggests a harder training block, so the next run should deliberately reduce stress and preserve freshness.',
      type: 'recovery',
      recommendedPace: stats.avgPace + 2,
      recommendedDistance: stats.avgDistance * 0.8,
      recommendedDuration: Math.max(30, Math.round(stats.avgDurationMinutes * 0.75)),
      recommendedType: 'Easy recovery run',
      priority: 'high',
      confidence: 'high',
      focusArea: 'recovery',
      timeHorizon: 'Next 48 hours',
      reasoning: `Your average pace of ${stats.avgPace.toFixed(2)} min/km with ${stats.hardSessionCount} quicker session(s) suggests recent training intensity is elevated.`,
      whyNow: 'Recovery is most useful immediately after a denser or faster block, when adaptation depends on lowering mechanical and cardiovascular strain.',
      actionItems: [
        `Cap the run at ${(stats.avgDistance * 0.8).toFixed(2)} km and keep the effort around ${(stats.avgPace + 1.5).toFixed(2)} to ${(stats.avgPace + 2).toFixed(2)} min/km.`,
        'Choose flat terrain and finish feeling like you could comfortably continue for another 10 minutes.',
        'If fatigue still lingers afterward, swap the next session for mobility or full rest.'
      ],
      watchOut: 'If your heart rate is still unusually high on easy pace, extend recovery instead of forcing the next quality workout.'
    });

    recommendations.push({
      title: 'Add Aerobic Endurance Session',
      description: 'Balance faster work with a longer steady session so your aerobic base keeps pace with your speed gains.',
      type: 'training_plan',
      recommendedPace: stats.avgPace + 1,
      recommendedDistance: Math.max(stats.avgDistance, stats.maxDistance * 0.9),
      recommendedDuration: Math.round(Math.max(stats.avgDurationMinutes, stats.longRunDurationMinutes * 0.8)),
      recommendedType: 'Steady aerobic run',
      priority: 'medium',
      confidence: 'medium',
      focusArea: 'endurance',
      timeHorizon: 'This week',
      reasoning: 'A supplemental endurance session helps balance high-intensity training and improve resilience for future race-specific workouts.',
      whyNow: 'Your pace profile is trending fast enough that endurance support will do more for durability than adding yet another hard workout.',
      actionItems: [
        `Run ${Math.max(stats.avgDistance, stats.maxDistance * 0.9).toFixed(2)} km at around ${(stats.avgPace + 0.8).toFixed(2)} to ${(stats.avgPace + 1.2).toFixed(2)} min/km.`,
        'Keep cadence relaxed and finish the final 10 minutes stronger only if breathing stays controlled.',
        'Hydrate and fuel as if this were a dress rehearsal for a future race-specific long run.'
      ],
      watchOut: 'If you are carrying soreness from speed work, shorten the session before you speed it up.'
    });
  }

  if (stats.avgDistance < 10) {
    recommendations.push({
      title: 'Increase Long Run Distance',
      description: 'Build endurance by gradually increasing your longest run.',
      type: 'training_plan',
      recommendedDistance: stats.maxDistance * 1.1,
      recommendedPace: stats.avgPace + 1,
      recommendedDuration: Math.round(Math.max(stats.longRunDurationMinutes * 1.05, stats.avgDurationMinutes + 15)),
      recommendedType: 'Long run',
      priority: 'medium',
      confidence: 'medium',
      focusArea: 'long_run',
      timeHorizon: 'Next long run',
      reasoning: `Your longest run in this review window was ${stats.maxDistance.toFixed(2)} km. A small extension will build aerobic base without a sharp volume jump.`,
      whyNow: 'The safest time to extend endurance is when the target increase stays close to 10% and recent training has been reasonably consistent.',
      actionItems: [
        `Extend your next long run to ${(stats.maxDistance * 1.1).toFixed(2)} km and keep the first two thirds truly easy.`,
        'Take fuel or fluids if the session runs beyond an hour so the effort stays aerobic instead of turning into a grind.',
        'Log post-run notes about how your legs felt in the final 20 minutes to guide the next build step.'
      ],
      watchOut: 'If the final third of the run becomes a survival effort, keep the distance the same next week instead of extending again.'
    });
  }

  if (stats.activityCount >= 5) {
    recommendations.push({
      title: 'Rest Day',
      description: 'You have been active on most days in the window, so a full rest day will likely improve your next key session more than extra mileage will.',
      type: 'rest_day',
      priority: 'high',
      confidence: 'high',
      focusArea: 'recovery',
      timeHorizon: 'Next 24 hours',
      reasoning: `${stats.activityCount} activities in ${stats.daysSpan} days is enough density that rest will help absorb the work already completed.`,
      whyNow: 'Adaptation happens after stress is reduced, not while the body keeps accumulating training load.',
      actionItems: [
        'Take one full day off from running or replace it with light walking and mobility only.',
        'Use the extra time for sleep, hydration, and nutrition instead of cross-training hard.',
        'Return with an easy run first, then decide whether you are ready for intensity.'
      ],
      watchOut: 'Do not turn the rest day into a hidden workout by adding strenuous cross-training.'
    });
  }

  if (stats.avgPace > 7 && stats.activityCount >= 2) {
    recommendations.push({
      title: 'Add Speed Work',
      description: 'Include tempo runs or intervals to improve pace.',
      type: 'training_plan',
      recommendedPace: stats.avgPace - 1,
      recommendedDistance: stats.avgDistance * 0.8,
      recommendedDuration: Math.max(30, Math.round(stats.avgDurationMinutes * 0.85)),
      recommendedType: 'Tempo session',
      priority: 'medium',
      confidence: 'medium',
      focusArea: 'speed',
      timeHorizon: 'This week',
      reasoning: `Current average pace is ${stats.avgPace.toFixed(2)} min/km. One structured faster session can improve economy without overhauling the whole week.`,
      whyNow: 'You appear to have enough aerobic work in place that a controlled tempo stimulus should sharpen pace efficiently.',
      actionItems: [
        `Try a 10-minute warm-up, 3 x 8 minutes near ${(stats.avgPace - 0.7).toFixed(2)} to ${(stats.avgPace - 1).toFixed(2)} min/km, then a relaxed cooldown.`,
        'Keep recoveries easy jogs, not standing rests, so the workout stays race-useful.',
        'Follow the session with an easy day instead of another moderate run.'
      ],
      watchOut: 'If you cannot hold even effort across the repeats, slow the target pace before adding more volume.'
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
      recommendedDuration: Math.max(25, Math.round((raceDistance * targetPace) * 0.65)),
      recommendedType: raceDays <= 14 ? 'Race-sharpening session' : 'Race-pace workout',
      priority: raceDays <= 14 ? 'high' : 'medium',
      confidence: raceDays <= 21 ? 'high' : 'medium',
      focusArea: 'race_specific',
      timeHorizon: raceDays <= 14 ? 'Before race week ends' : 'Next 1-2 weeks',
      reasoning: `Your race is ${raceDays} days away. The goal now is to arrive sharp enough to perform without carrying unnecessary fatigue.`,
      whyNow: `A ${raceDistance} km event rewards specific pacing practice more than generic extra mileage at this stage.`,
      actionItems: raceDays <= 14
        ? [
          `Keep one short sharpening workout near ${targetPace.toFixed(2)} min/km and cut back the rest of the week's volume.`,
          'Prioritize sleep and avoid experimenting with new shoes, workouts, or fueling in the final days.',
          'Use easy runs to stay loose, not to chase fitness.'
        ]
        : [
          `Plan one race-pace session that covers roughly ${(raceDistance * 0.6).toFixed(2)} km of total work at or just slower than ${targetPace.toFixed(2)} min/km.`,
          'Pair that workout with one easy or recovery day before and after to preserve quality.',
          'Reassess pace after the session instead of locking in a goal too early.'
        ],
      watchOut: raceDays <= 14
        ? 'Avoid squeezing in a final hard workout just for confidence; fitness gains are limited this close to race day.'
        : 'Do not let race-specific work crowd out easy recovery days while mileage is still building.'
    });

    if (raceDistance >= 21 && raceDays <= 30) {
      recommendations.push({
        title: 'Race-Specific Long Run',
        description: 'Add a long training run that mirrors your race distance and terrain.',
        type: 'training_plan',
        recommendedDistance: Math.min(raceDistance * 0.9, stats.maxDistance * 1.15),
        recommendedDuration: Math.round(Math.min(raceDistance * stats.avgPace * 0.9, stats.longRunDurationMinutes * 1.15)),
        recommendedType: 'Race-specific long run',
        priority: 'high',
        confidence: 'medium',
        focusArea: 'race_specific',
        timeHorizon: 'Next 2 weeks',
        reasoning: 'A long run with race-like pacing builds confidence and exposes fueling or pacing issues while there is still time to adjust.',
        whyNow: 'The window is short enough that specificity matters, but still long enough to recover from one demanding long session.',
        actionItems: [
          `Aim for ${Math.min(raceDistance * 0.9, stats.maxDistance * 1.15).toFixed(2)} km with sections that mirror race terrain or effort.`,
          'Practice fueling and hydration exactly as you expect to do on race day.',
          'Take the following day very easy or fully off so the workout becomes productive instead of draining.'
        ],
        watchOut: 'Skip this session if you are carrying fatigue or minor niggles; healthy consistency beats one heroic run.'
      });
    }
  }

  return recommendations;
}

async function generateRecommendations(userId, recentActivities, user, raceContext = {}) {
  const recommendations = buildRecommendations(userId, recentActivities, user, raceContext);
  const savedRecommendations = [];

  await Recommendation.deleteMany({
    userId,
    status: 'pending'
  });

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
  let paceCount = 0;
  let totalDurationMinutes = 0;
  let longRunDurationMinutes = 0;
  let minDate = new Date();
  let maxDate = new Date(0);

  activities.forEach((activity) => {
    const distanceKm = activity.distance / 1000;
    const durationMinutes = (activity.movingTime || activity.duration || 0) / 60;

    totalDistance += distanceKm;
    totalDurationMinutes += durationMinutes;

    if (distanceKm >= maxDistance) {
      maxDistance = distanceKm;
      longRunDurationMinutes = durationMinutes;
    }

    if (activity.pace) {
      totalPace += activity.pace;
      paceCount += 1;
    }

    const date = new Date(activity.date);
    minDate = date < minDate ? date : minDate;
    maxDate = date > maxDate ? date : maxDate;
  });

  const activityCount = activities.length;
  const avgPace = paceCount ? totalPace / paceCount : 0;
  const hardSessionCount = activities.filter((activity) => (
    activity.pace && avgPace && activity.pace <= avgPace - 0.35
  )).length;

  return {
    totalDistance,
    avgDistance: activityCount ? totalDistance / activityCount : 0,
    maxDistance,
    avgPace,
    avgDurationMinutes: activityCount ? totalDurationMinutes / activityCount : 0,
    longRunDurationMinutes,
    activityCount,
    hardSessionCount,
    daysSpan: Math.max(1, Math.ceil((maxDate - minDate) / (24 * 60 * 60 * 1000)) + 1)
  };
}

const { cosineSimilarity } = require('../utils/vectorMath');

module.exports = {
  findSimilarActivities,
  generateRecommendations,
  buildRecommendations,
  calculateActivityStats,
  cosineSimilarity
};
