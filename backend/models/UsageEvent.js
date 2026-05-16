const mongoose = require('mongoose');

const usageEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  event: {
    type: String,
    required: true,
    index: true
  },
  path: String,
  method: String,
  statusCode: Number,
  durationMs: Number,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, index: true }
});

usageEventSchema.index({ event: 1, createdAt: -1 });

const ttlDays = Number.parseInt(process.env.USAGE_EVENT_TTL_DAYS, 10) || 90;
usageEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: ttlDays * 24 * 60 * 60 }
);

module.exports = mongoose.model('UsageEvent', usageEventSchema);
