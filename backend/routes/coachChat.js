const express = require('express');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const {
  buildChatContext,
  getChatHistory,
  sendChatMessage,
  COACH_NOTIFICATION_TYPES
} = require('../services/coachChatService');

const router = express.Router();

/**
 * Structured context for the coach chat widget (no OpenAI call).
 * GET /api/coach/chat/context
 */
router.get('/context', auth, async (req, res) => {
  try {
    const context = await buildChatContext(req.userId, req.user);
    res.json({ success: true, ...context });
  } catch (error) {
    console.error('Coach chat context error:', error);
    res.status(500).json({ error: 'Failed to load coach context' });
  }
});

/**
 * Recent chat messages.
 * GET /api/coach/chat/history?limit=20
 */
router.get('/history', auth, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const messages = await getChatHistory(req.userId, limit);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Coach chat history error:', error);
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

/**
 * Mark coach-related notifications as read (called when widget opens).
 * POST /api/coach/chat/mark-read
 */
router.post('/mark-read', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.userId, readAt: null, type: { $in: COACH_NOTIFICATION_TYPES } },
      { readAt: new Date() }
    );
    res.json({ success: true, modified: result?.modifiedCount || 0 });
  } catch (error) {
    console.error('Coach chat mark-read error:', error);
    res.status(500).json({ error: 'Failed to mark coach notifications as read' });
  }
});

/**
 * Send a message to the coach.
 * POST /api/coach/chat
 * body: { message: string }
 */
router.post('/', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const result = await sendChatMessage(req.userId, req.user, message);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: error.message,
        retryAfter: error.retryAfter || 3600
      });
    }
    console.error('Coach chat send error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
