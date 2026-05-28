const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const {
  buildTrainingProgress,
  normalizeChallengesInput,
  CHALLENGE_KINDS
} = require('../services/trainingProgress');

const router = express.Router();

/**
 * Training load, goals progress, challenges, predictions.
 * GET /api/training/progress
 */
router.get('/progress', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const progress = await buildTrainingProgress(user);
    res.json({ success: true, progress });
  } catch (error) {
    console.error('Training progress error:', error);
    res.status(500).json({ error: 'Failed to load training progress' });
  }
});

/**
 * Replace active training challenges.
 * PUT /api/training/challenges
 */
router.put('/challenges', auth, async (req, res) => {
  try {
    const normalized = normalizeChallengesInput(req.body?.challenges);

    if (normalized === null) {
      return res.status(400).json({
        error: 'Invalid challenges',
        allowedKinds: CHALLENGE_KINDS
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { trainingChallenges: normalized, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const progress = await buildTrainingProgress(user);
    res.json({
      success: true,
      challenges: progress.challenges,
      progress
    });
  } catch (error) {
    console.error('Training challenges update error:', error);
    res.status(500).json({ error: 'Failed to update challenges' });
  }
});

module.exports = router;
