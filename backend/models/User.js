const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  
  // Vector embeddings for preferences
  preferenceVector: [Number],
  
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

module.exports = mongoose.model('User', userSchema);
