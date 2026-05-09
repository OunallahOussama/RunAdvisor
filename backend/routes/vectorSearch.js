const express = require('express');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * Vector similarity search
 * POST /api/vector-search
 */
router.post('/', auth, async (req, res) => {
  try {
    const { vector, limit = 10, userSpecific = true } = req.body;
    
    if (!vector || !Array.isArray(vector) || vector.length !== 6) {
      return res.status(400).json({ 
        error: 'Invalid vector. Expected array of 6 numbers.' 
      });
    }
    
    let query = {};
    if (userSpecific) {
      query.userId = req.userId;
    }
    
    // Calculate cosine similarity for each activity
    const allActivities = await Activity.find(query);
    
    const scoredActivities = allActivities.map(activity => {
      const similarity = cosineSimilarity(vector, activity.performanceVector);
      return {
        ...activity.toObject(),
        similarity: similarity
      };
    });
    
    // Sort by similarity and limit results
    const results = scoredActivities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    res.json({ 
      success: true, 
      results: results,
      query: vector
    });
  } catch (error) {
    console.error('Vector search error:', error);
    res.status(500).json({ error: 'Vector search failed' });
  }
});

/**
 * Search activities by distance range
 * GET /api/vector-search/by-distance?min=5&max=15
 */
router.get('/by-distance', auth, async (req, res) => {
  try {
    const min = parseFloat(req.query.min) || 0;
    const max = parseFloat(req.query.max) || 100;
    
    const activities = await Activity.find({
      userId: req.userId,
      distance: {
        $gte: min * 1000,
        $lte: max * 1000
      }
    }).sort({ date: -1 });
    
    res.json({ 
      success: true, 
      activities: activities,
      range: { min, max },
      count: activities.length
    });
  } catch (error) {
    console.error('Distance search error:', error);
    res.status(500).json({ error: 'Distance search failed' });
  }
});

/**
 * Search activities by pace range
 * GET /api/vector-search/by-pace?min=5&max=8
 */
router.get('/by-pace', auth, async (req, res) => {
  try {
    const min = parseFloat(req.query.min) || 0;
    const max = parseFloat(req.query.max) || 15;
    
    const activities = await Activity.find({
      userId: req.userId,
      pace: {
        $gte: min,
        $lte: max
      }
    }).sort({ date: -1 });
    
    res.json({ 
      success: true, 
      activities: activities,
      range: { min, max },
      count: activities.length
    });
  } catch (error) {
    console.error('Pace search error:', error);
    res.status(500).json({ error: 'Pace search failed' });
  }
});

/**
 * Cosine similarity calculation
 */
function cosineSimilarity(vec1, vec2) {
  if (!vec2) return 0;
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
}

module.exports = router;
