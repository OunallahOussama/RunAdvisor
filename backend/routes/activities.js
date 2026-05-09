const express = require('express');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * Get user's activities
 * GET /api/activities?limit=20&sort=-date
 */
router.get('/', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;
    const sort = req.query.sort || '-date';
    
    const activities = await Activity.find({ userId: req.userId })
      .sort(sort)
      .limit(limit)
      .skip(skip);
    
    const total = await Activity.countDocuments({ userId: req.userId });
    
    res.json({ 
      success: true, 
      activities: activities,
      total: total,
      page: skip / limit + 1
    });
  } catch (error) {
    console.error('Activities fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * Get activity by ID
 * GET /api/activities/:id
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Verify ownership
    if (activity.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    res.json({ success: true, activity });
  } catch (error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

/**
 * Get weekly summary
 * GET /api/activities/summary/weekly
 */
router.get('/summary/weekly', auth, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const activities = await Activity.find({
      userId: req.userId,
      date: { $gte: sevenDaysAgo }
    });
    
    const summary = {
      totalDistance: 0,
      totalDuration: 0,
      totalElevation: 0,
      activityCount: 0,
      avgPace: 0,
      avgHeartRate: 0,
      activities: activities
    };
    
    activities.forEach(activity => {
      summary.totalDistance += activity.distance / 1000; // Convert to km
      summary.totalDuration += activity.movingTime / 60; // Convert to minutes
      summary.totalElevation += activity.elevationGain;
      summary.activityCount += 1;
      if (activity.avgHeartRate) summary.avgHeartRate += activity.avgHeartRate;
    });
    
    if (summary.activityCount > 0) {
      summary.avgPace = summary.totalDistance / (summary.totalDuration / 60);
      summary.avgHeartRate /= summary.activityCount;
    }
    
    res.json({ success: true, summary });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * Add manual activity
 * POST /api/activities
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      type,
      distance,
      duration,
      date,
      elevationGain,
      avgHeartRate,
      maxHeartRate,
      avgCadence,
      notes
    } = req.body;
    
    const pace = (duration / 60) / (distance / 1000);
    
    const activity = new Activity({
      userId: req.userId,
      name,
      type,
      distance: distance * 1000, // Store in meters
      duration,
      movingTime: duration,
      elevationGain: elevationGain || 0,
      pace,
      avgHeartRate,
      maxHeartRate,
      avgCadence,
      date: new Date(date),
      notes,
      performanceVector: [
        distance / 10,
        duration / 3600,
        pace / 8,
        (elevationGain || 0) / 100,
        (avgHeartRate || 120) / 200,
        (avgCadence || 170) / 200
      ]
    });
    
    await activity.save();
    
    res.json({ success: true, activity });
  } catch (error) {
    console.error('Activity creation error:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

/**
 * Delete activity
 * DELETE /api/activities/:id
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    if (activity.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await Activity.deleteOne({ _id: req.params.id });
    
    res.json({ success: true, message: 'Activity deleted' });
  } catch (error) {
    console.error('Activity deletion error:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

module.exports = router;
