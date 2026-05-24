const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const {
  listForUser,
  countUnread,
  markRead,
  markAllRead
} = require('../services/notificationService');

const router = express.Router();

function serializeNotification(doc) {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id,
    type: doc.type,
    title: doc.title,
    body: doc.body,
    severity: doc.severity,
    data: doc.data || {},
    readAt: doc.readAt || null,
    createdAt: doc.createdAt
  };
}

/**
 * List notifications for the authenticated user.
 * GET /api/notifications?unread=true&limit=20
 */
router.get('/', auth, async (req, res) => {
  try {
    const unreadOnly = req.query.unread === 'true' || req.query.unread === '1';
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;

    const [items, unreadCount] = await Promise.all([
      listForUser(req.userId, { unreadOnly, limit }),
      countUnread(req.userId)
    ]);

    res.json({
      success: true,
      notifications: items.map(serializeNotification),
      unreadCount
    });
  } catch (error) {
    console.error('Notifications list error:', error);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

/**
 * Mark a single notification read.
 * POST /api/notifications/:id/read
 */
router.post('/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid notification id' });
    }

    const updated = await markRead(req.userId, id);

    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, notification: serializeNotification(updated) });
  } catch (error) {
    console.error('Notifications mark-read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * Mark all notifications read.
 * POST /api/notifications/read-all
 */
router.post('/read-all', auth, async (req, res) => {
  try {
    const result = await markAllRead(req.userId);
    res.json({ success: true, modified: result?.modifiedCount || 0 });
  } catch (error) {
    console.error('Notifications mark-all error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

module.exports = router;
