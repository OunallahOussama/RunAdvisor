const express = require('express');
const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { findSimilarActivities, generateRecommendations } = require('../services/mlService');
const { buildCoachReview } = require('../services/trainingInsights');

const router = express.Router();

/**
 * Get personalized training recommendations
 * GET /api/recommendations?days=7
 */
router.get('/', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const raceDistance = req.query.raceDistance ? parseFloat(req.query.raceDistance) : null;
    const raceDate = req.query.raceDate ? new Date(req.query.raceDate) : null;
    const raceName = req.query.raceName || null;

    const user = await User.findById(req.userId);

    const recentActivities = await Activity.find({
      userId: req.userId,
      date: { $gte: sinceDate }
    }).sort({ date: -1 });

    if (recentActivities.length === 0) {
      return res.json({
        success: true,
        recommendations: [],
        message: 'No recent activities found for recommendations. Add a few activities to get race-specific advice.'
      });
    }

    const recommendations = await generateRecommendations(
      req.userId,
      recentActivities,
      user,
      { raceDistance, raceDate, raceName }
    );

    const introMessage = raceDistance && raceDate
      ? `Loaded ${recommendations.length} recommendations for your next ${raceName || 'race'}.`
      : `Loaded ${recommendations.length} recommendations based on your recent training.`;

    res.json({
      success: true,
      recommendations,
      analyzedActivities: recentActivities.length,
      message: introMessage
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * Get coach review, summary metrics, and training trends
 * GET /api/recommendations/coach-review?days=28
 */
router.get('/coach-review', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 28;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const raceDistance = req.query.raceDistance ? parseFloat(req.query.raceDistance) : null;
    const raceDate = req.query.raceDate ? new Date(req.query.raceDate) : null;
    const raceName = req.query.raceName || null;

    const user = await User.findById(req.userId);
    const recentActivities = await Activity.find({
      userId: req.userId,
      date: { $gte: sinceDate }
    }).sort({ date: -1 });

    if (recentActivities.length === 0) {
      return res.json({
        success: true,
        summary: null,
        trend: [],
        coachReview: null,
        analyzedActivities: 0,
        message: 'No recent activities found for coach review. Sync Strava or add manual logs to unlock trends.'
      });
    }

    const insights = buildCoachReview(recentActivities, user, {
      days,
      raceDistance,
      raceDate,
      raceName
    });

    res.json({
      success: true,
      ...insights,
      analyzedActivities: recentActivities.length,
      message: `Analyzed ${recentActivities.length} recent activities across the last ${days} day(s).`
    });
  } catch (error) {
    console.error('Error generating coach review:', error);
    res.status(500).json({ error: 'Failed to generate coach review' });
  }
});

/**
 * Get recommendations based on vector similarity
 * POST /api/recommendations/similar
 */
router.post('/similar', auth, async (req, res) => {
  try {
    const { activityId, limit = 5 } = req.body;
    
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Find similar activities
    const similarActivities = await findSimilarActivities(
      activity.performanceVector,
      req.userId,
      limit
    );
    
    res.json({ 
      success: true, 
      baseActivity: activity,
      similar: similarActivities 
    });
  } catch (error) {
    console.error('Error finding similar activities:', error);
    res.status(500).json({ error: 'Failed to find similar activities' });
  }
});

/**
 * Accept or reject recommendation
 * PUT /api/recommendations/:id
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    if (!id || id === 'undefined' || id === 'null') {
      console.warn('Recommendation update called with invalid id:', id);
      return res.status(400).json({ error: 'Recommendation ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn('Recommendation update called with non-ObjectId id:', id);
      return res.status(400).json({ error: 'Invalid recommendation ID' });
    }

    const recommendation = await require('../models/Recommendation').findByIdAndUpdate(
      id,
      { status, feedback, updatedAt: new Date() },
      { new: true }
    );

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    res.json({ success: true, recommendation });
  } catch (error) {
    console.error('Error updating recommendation:', error);
    res.status(500).json({ error: 'Failed to update recommendation' });
  }
});

module.exports = router;
