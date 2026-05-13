const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  title: String,
  description: String,
  type: { type: String, enum: ['training_plan', 'pacing_advice', 'recovery', 'rest_day', 'challenge'] },
  
  // Recommendation basis
  basedOnActivities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  
  // AI-generated insights
  reasoning: String,
  priority: { type: String, enum: ['low', 'medium', 'high'] },
  confidence: { type: String, enum: ['low', 'medium', 'high'] },
  focusArea: String,
  timeHorizon: String,
  whyNow: String,
  watchOut: String,
  actionItems: [String],
  
  // Metrics
  recommendedDistance: Number, // km
  recommendedPace: Number, // min/km
  recommendedDuration: Number, // minutes
  recommendedType: String,
  
  // User interaction
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  feedback: String,
  
  createdAt: { type: Date, default: Date.now },
  validUntil: Date,
  updatedAt: { type: Date, default: Date.now }
});

recommendationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);
