const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const coachChatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  messages: {
    type: [messageSchema],
    default: []
  },
  contextSnapshot: {
    lastActivityId: { type: String, default: null },
    lastActivitySummary: { type: mongoose.Schema.Types.Mixed, default: null },
    reportId: { type: mongoose.Schema.Types.ObjectId, default: null },
    generatedAt: { type: Date, default: null }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { minimize: false });

coachChatSchema.pre('save', function preSave() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('CoachChat', coachChatSchema);
