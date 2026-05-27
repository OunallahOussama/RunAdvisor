const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const CONSENT_VERSION = '2026-05-24';

const consentSchema = new mongoose.Schema({
  shareAnonymizedTraining: { type: Boolean, default: false },
  marketingEmails: { type: Boolean, default: false },
  notifications: {
    browser: { type: Boolean, default: false },
    recommendations: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: true }
  },
  /** When false, skip async Strava description insight write-back (activity:write). */
  stravaActivityInsights: { type: Boolean, default: true },
  consentVersion: { type: String, default: null },
  consentAcceptedAt: { type: Date, default: null }
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function requiredPassword() {
      return !this.auth0UserId;
    }
  },
  name: String,
  picture: String,
  auth0UserId: {
    type: String,
    unique: true,
    sparse: true
  },
  authProvider: {
    type: String,
    default: 'auth0'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  stravaId: String,
  stravaAccessToken: String,
  stravaRefreshToken: String,
  stravaExpiresAt: Date,
  stravaLastSyncAt: Date,

  trainingPlans: [{
    fileName: {
      type: String,
      required: true,
      trim: true
    },
    contentType: {
      type: String,
      default: 'application/octet-stream'
    },
    sizeBytes: {
      type: Number,
      default: 0
    },
    dataUrl: {
      type: String,
      required: true
    },
    notes: {
      type: String,
      trim: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // User preferences
  age: Number,
  experience: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
  preferredDistance: Number, // km
  trainingGoals: [String], // 'endurance', 'speed', 'recovery', etc.
  goalPaceMinPerKm: Number,
  weeklyTrainingLoadKm: Number,
  goalRaceName: String,
  goalRaceDate: Date,
  goalRaceDistanceKm: Number,

  // Vector embeddings for preferences
  preferenceVector: [Number],

  // Onboarding + consent
  onboardingCompletedAt: { type: Date, default: null },
  runningGoal: {
    type: String,
    enum: ['5k', '10k', 'half', 'marathon', 'general_fitness', null],
    default: null
  },
  consent: { type: consentSchema, default: () => ({}) },

  /** Community: show in user search when true (default on). */
  discoverable: { type: Boolean, default: true },
  socialBio: { type: String, trim: true, maxlength: 280, default: '' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.password || !this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  if (!this.password) {
    return false;
  }

  return await bcrypt.compare(enteredPassword, this.password);
};

const UserModel = mongoose.model('User', userSchema);
UserModel.CONSENT_VERSION = CONSENT_VERSION;

module.exports = UserModel;
module.exports.CONSENT_VERSION = CONSENT_VERSION;
