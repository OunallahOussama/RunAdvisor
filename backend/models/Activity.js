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
  semanticVector: [Number],
  streamSummary: {
    pointCount: Number,
    time: [Number],
    distance: [Number],
    altitude: [Number],
    heartrate: [Number],
    cadence: [Number],
    paceMinPerKm: [Number],
    fetchedAt: Date
  },
  segmentEfforts: [{
    id: Number,
    name: String,
    distance: Number,
    elapsedTime: Number,
    prRank: Number,
    komRank: Number
  }],
  
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

  // Strava-aligned: everyone (public), followers_only, only_me (private)
  visibility: {
    type: String,
    enum: ['everyone', 'followers_only', 'only_me'],
    default: 'everyone'
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for vector search on performanceVector
activitySchema.index({ performanceVector: '2dsphere' });
activitySchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Activity', activitySchema);
