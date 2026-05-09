const express = require('express');
const axios = require('axios');
const Activity = require('../models/Activity');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure axios for Strava API calls
const stravaAxios = axios.create({
  httpsAgent: new (require('https').Agent)({
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  })
});

/**
 * Exchange Strava authorization code for access token
 * POST /api/strava/authenticate
 */
router.post('/authenticate', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.userId;
    
    const response = await stravaAxios.post('https://www.strava.com/api/v3/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.STRAVA_REDIRECT_URI || 'http://localhost:3000/callback'
    });
    
    const { access_token, refresh_token, expires_at } = response.data;
    const athlete = response.data.athlete;
    
    // Update user with Strava tokens
    await User.findByIdAndUpdate(userId, {
      stravaId: athlete.id,
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaExpiresAt: new Date(expires_at * 1000)
    });
    
    res.json({ 
      success: true, 
      athlete: athlete,
      accessToken: access_token 
    });
  } catch (error) {
    const errData = error.response?.data || { message: error.message };
    console.error('Strava auth error:', errData);
    res.status(400).json({ error: 'Failed to authenticate with Strava', details: errData });
  }
});

/**
 * Fetch recent activities from Strava
 * GET /api/strava/activities
 */
router.get('/activities', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const limit = req.query.limit || 10;
    
    // Refresh token if needed
    if (new Date() > user.stravaExpiresAt) {
      await refreshStravaToken(user);
    }
    
    // Fetch activities from Strava
    const response = await stravaAxios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        'Authorization': `Bearer ${user.stravaAccessToken}`
      },
      params: { per_page: limit }
    });
    
    const activities = response.data;
    
    // Save or update activities in our database
    for (const activity of activities) {
      const pace = (activity.moving_time / 60) / (activity.distance / 1000);
      
      await Activity.findOneAndUpdate(
        { stravaActivityId: activity.id },
        {
          userId: req.userId,
          stravaActivityId: activity.id,
          name: activity.name,
          type: activity.type.toLowerCase(),
          distance: activity.distance,
          duration: activity.elapsed_time,
          movingTime: activity.moving_time,
          elevationGain: activity.total_elevation_gain,
          pace: pace,
          avgHeartRate: activity.average_heartrate,
          maxHeartRate: activity.max_heartrate,
          avgCadence: activity.average_cadence,
          date: new Date(activity.start_date),
          polyline: activity.map?.polyline,
          performanceVector: generatePerformanceVector(activity),
          notes: activity.description
        },
        { upsert: true, new: true }
      );
    }
    
    res.json({ 
      success: true, 
      count: activities.length,
      activities: activities 
    });
  } catch (error) {
    console.error('Error fetching Strava activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * Sync single activity details
 * POST /api/strava/sync-activity/:activityId
 */
router.post('/sync-activity/:activityId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    const response = await stravaAxios.get(
      `https://www.strava.com/api/v3/activities/${req.params.activityId}`,
      {
        headers: { 'Authorization': `Bearer ${user.stravaAccessToken}` }
      }
    );
    
    const activity = response.data;
    const pace = (activity.moving_time / 60) / (activity.distance / 1000);
    
    const savedActivity = await Activity.findOneAndUpdate(
      { stravaActivityId: activity.id },
      {
        userId: req.userId,
        stravaActivityId: activity.id,
        name: activity.name,
        type: activity.type.toLowerCase(),
        distance: activity.distance,
        duration: activity.elapsed_time,
        movingTime: activity.moving_time,
        elevationGain: activity.total_elevation_gain,
        pace: pace,
        avgHeartRate: activity.average_heartrate,
        date: new Date(activity.start_date),
        performanceVector: generatePerformanceVector(activity)
      },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, activity: savedActivity });
  } catch (error) {
    console.error('Error syncing activity:', error);
    res.status(500).json({ error: 'Failed to sync activity' });
  }
});

/**
 * Helper function to refresh Strava token
 */
async function refreshStravaToken(user) {
  try {
    const response = await stravaAxios.post('https://www.strava.com/api/v3/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: user.stravaRefreshToken
    });
    
    user.stravaAccessToken = response.data.access_token;
    user.stravaRefreshToken = response.data.refresh_token;
    user.stravaExpiresAt = new Date(response.data.expires_at * 1000);
    await user.save();
  } catch (error) {
    console.error('Error refreshing Strava token:', error);
  }
}

/**
 * Generate performance vector from activity metrics
 * Used for vector search and ML
 */
function generatePerformanceVector(activity) {
  return [
    activity.distance / 10000, // Normalized distance
    activity.moving_time / 3600, // Hours
    (activity.distance / 1000) / (activity.moving_time / 60), // Pace (km/min)
    activity.total_elevation_gain / 100, // Normalized elevation
    activity.average_heartrate ? activity.average_heartrate / 200 : 0.5, // Normalized HR
    activity.average_cadence ? activity.average_cadence / 200 : 0.5 // Normalized cadence
  ];
}

module.exports = router;
