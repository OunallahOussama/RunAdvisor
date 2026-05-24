const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  windowDays: { type: Number, default: 84 },
  source: { type: String, default: 'openai' },
  model: String,

  // Structured AI report (free-form by design — schema enforced at write time)
  report: { type: mongoose.Schema.Types.Mixed },

  // Snapshot of the analytics that powered the report (numbers only)
  analytics: { type: mongoose.Schema.Types.Mixed },

  generatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { minimize: false });

reportSchema.index({ userId: 1, generatedAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
