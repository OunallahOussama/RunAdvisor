const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

directMessageSchema.index({ fromUserId: 1, toUserId: 1, createdAt: -1 });
directMessageSchema.index({ toUserId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
