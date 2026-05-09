const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stravaActivityId: String,
  
  name: String,
  type: { type: String, enum: ['run', 'walk', 'trail run', 'outdoor run'] },
  
  // Activity metrics
  distance: Number, // meters
  duration: Number, // seconds
  movingTime: Number, // seconds
  elevationGain: Number, // meters
  pace: Number, // min/km (calculated)
  avgHeartRate: Number,
  maxHeartRate: Number,
  avgCadence: Number,
  
  // Performance vectors (for ML)
  performanceVector: [Number],
  
  // Metadata
  date: Date,
  weather: {
    temperature: Number,
    condition: String
  },
  
  // Strava polyline
  polyline: String,
  coordinates: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: [[Number]] // [longitude, latitude]
  },
  
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for vector search on performanceVector
activitySchema.index({ performanceVector: '2dsphere' });
activitySchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Activity', activitySchema);
