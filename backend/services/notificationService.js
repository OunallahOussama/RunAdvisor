const mongoose = require('mongoose');
const Notification = require('../models/Notification');

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

/**
 * Create a notification row. Best-effort: logs and swallows errors so
 * the calling business logic (Strava sync, weekly summary generation)
 * never fails because of notification persistence. Returns null when
 * Mongo is not connected so unit tests that don't boot a real DB don't
 * hang on buffered commands.
 */
async function createNotification(userId, payload = {}) {
  if (!userId || !isMongoConnected()) {
    return null;
  }

  try {
    const doc = await Notification.create({
      userId,
      type: payload.type || 'system',
      title: payload.title || 'Notification',
      body: payload.body || '',
      severity: payload.severity || 'info',
      data: payload.data || {}
    });

    return doc;
  } catch (error) {
    console.error('Failed to create notification:', error.message || error);
    return null;
  }
}

async function listForUser(userId, { unreadOnly = false, limit = 20 } = {}) {
  const filter = { userId };
  if (unreadOnly) {
    filter.readAt = null;
  }

  return Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100))
    .lean();
}

async function countUnread(userId) {
  return Notification.countDocuments({ userId, readAt: null });
}

async function markRead(userId, id) {
  return Notification.findOneAndUpdate(
    { _id: id, userId },
    { readAt: new Date() },
    { new: true }
  );
}

async function markAllRead(userId) {
  return Notification.updateMany(
    { userId, readAt: null },
    { readAt: new Date() }
  );
}

module.exports = {
  createNotification,
  listForUser,
  countUnread,
  markRead,
  markAllRead
};
