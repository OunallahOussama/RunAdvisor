const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'weekly_report_ready',
  'recommendation_ready',
  'strava_sync_completed',
  'coach_session_ready',
  'coach_nudge',
  'consent_reminder',
  'session_today',
  'system'
];

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    default: 'system'
  },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  severity: {
    type: String,
    enum: ['info', 'success', 'warning'],
    default: 'info'
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true }
}, { minimize: false });

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

const NotificationModel = mongoose.model('Notification', notificationSchema);
NotificationModel.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

module.exports = NotificationModel;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
