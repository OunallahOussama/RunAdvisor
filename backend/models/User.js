const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const CONSENT_VERSION = '2026-05-24';

const consentSchema = new mongoose.Schema({
  shareAnonymizedTraining: { type: Boolean, default: false },
  marketingEmails: { type: Boolean, default: false },
  notifications: {
    browser: { type: Boolean, default: false },
    recommendations: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: true },
    /** Background Strava sync while app/PWA is open or periodic sync is allowed. */
    stravaBackgroundSync: { type: Boolean, default: true }
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
  /** Monthly distance target (km) — home progress ring / gamification. */
  monthlyDistanceGoalKm: Number,
  /** Yearly distance target (km) — YTD progress. */
  yearlyDistanceGoalKm: Number,
  trainingChallenges: [{
    kind: {
      type: String,
      enum: [
        'monthly_km',
        'yearly_km',
        'weekly_km',
        'pace_cap',
        'pr_longest_km',
        'pr_fastest_pace',
        'pr_elevation',
        'race_prediction',
        'custom_km'
      ],
      required: true
    },
    title: { type: String, trim: true, maxlength: 80, default: '' },
    targetKm: Number,
    targetPaceMinPerKm: Number,
    raceDistanceKm: Number,
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  }],

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
  lastLoginAt: Date,
  lastActiveAt: Date,

  /** Active coach weekly plan: follow / decline + adherence snapshot. */
  weeklyPlanCommitment: {
    reportKey: { type: String, default: null },
    reportGeneratedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'following', 'declined'],
      default: 'pending'
    },
    decidedAt: { type: Date, default: null },
    appliedCheckAt: { type: Date, default: null },
    appliedScore: { type: Number, default: null },
    appliedNote: { type: String, default: '' }
  },

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
