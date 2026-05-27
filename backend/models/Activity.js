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
  maxCadence: Number,

  // Extra Strava fields used by the analytics / training report engine
  averageSpeed: Number, // m/s
  maxSpeed: Number, // m/s
  averageWatts: Number,
  maxWatts: Number,
  weightedAverageWatts: Number,
  kilojoules: Number,
  sufferScore: Number, // Strava "relative effort"
  calories: Number,
  workoutType: Number, // 0=default, 1=race, 2=long run, 3=workout
  achievementCount: Number,
  prCount: Number,
  startDateLocal: Date,
  timezone: String,

  // Per-kilometer splits (Strava splits_metric payload)
  splitsMetric: [{
    split: Number,
    distance: Number,
    elapsed_time: Number,
    moving_time: Number,
    elevation_difference: Number,
    average_speed: Number,
    average_heartrate: Number,
    pace_zone: Number
  }],

  // Per-lap data (Strava laps payload)
  laps: [{
    id: Number,
    name: String,
    lap_index: Number,
    distance: Number,
    elapsed_time: Number,
    moving_time: Number,
    average_speed: Number,
    max_speed: Number,
    average_heartrate: Number,
    max_heartrate: Number,
    average_cadence: Number,
    total_elevation_gain: Number,
    start_index: Number,
    end_index: Number
  }],

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

  stravaInsightPushedAt: Date,

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
