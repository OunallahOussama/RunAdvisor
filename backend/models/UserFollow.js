const mongoose = require('mongoose');

const userFollowSchema = new mongoose.Schema({
  followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

userFollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
userFollowSchema.index({ followingId: 1, createdAt: -1 });

module.exports = mongoose.model('UserFollow', userFollowSchema);
