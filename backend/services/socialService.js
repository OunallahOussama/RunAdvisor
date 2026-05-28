const mongoose = require('mongoose');
const User = require('../models/User');
const Activity = require('../models/Activity');
const UserFollow = require('../models/UserFollow');
const FriendRequest = require('../models/FriendRequest');
const DirectMessage = require('../models/DirectMessage');
const { createNotification } = require('./notificationService');
const { round, formatPaceMinPerKm } = require('../utils/numbers');

function toObjectId(id) {
  if (!id) {
    return null;
  }

  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

function serializePublicUser(user, extras = {}) {
  if (!user) {
    return null;
  }

  return {
    id: String(user._id),
    name: user.name || 'Runner',
    picture: user.picture || null,
    socialBio: user.socialBio || '',
    runningGoal: user.runningGoal || null,
    isRunAdvisorMember: true,
    ...extras
  };
}

async function searchDiscoverableUsers(viewerId, query, limit = 20) {
  const q = String(query || '').trim();

  if (q.length < 3) {
    const err = new Error('Enter at least 3 characters to search.');
    err.status = 400;
    throw err;
  }

  const viewerOid = toObjectId(viewerId);
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  const users = await User.find({
    _id: { $ne: viewerOid },
    discoverable: { $ne: false },
    $and: [
      { $or: [{ auth0UserId: { $exists: true, $ne: null } }, { email: { $ne: null, $exists: true } }] },
      { $or: [{ name: regex }, { email: regex }] }
    ]
  })
    .select('name picture socialBio runningGoal')
    .limit(Math.min(limit, 30))
    .lean();

  return enrichUsersForViewer(viewerId, users);
}

async function enrichUsersForViewer(viewerId, users) {
  if (!users.length) {
    return [];
  }

  const ids = users.map((u) => u._id);
  const viewerOid = toObjectId(viewerId);
  const [followingSet, friendMap] = await Promise.all([
    getFollowingIdSet(viewerOid, ids),
    getFriendRelationMap(viewerOid, ids)
  ]);

  return users.map((user) =>
    serializePublicUser(user, {
      isFollowing: followingSet.has(String(user._id)),
      isFriend: friendMap.get(String(user._id))?.isFriend || false,
      friendRequestStatus: friendMap.get(String(user._id))?.requestStatus || null,
      incomingRequestId: friendMap.get(String(user._id))?.incomingRequestId || null,
      outgoingRequestId: friendMap.get(String(user._id))?.outgoingRequestId || null
    })
  );
}

async function listIncomingFriendRequests(userId) {
  const requests = await FriendRequest.find({ toUserId: userId, status: 'pending' })
    .sort({ createdAt: -1 })
    .lean();

  if (!requests.length) {
    return [];
  }

  const fromIds = requests.map((row) => row.fromUserId);
  const users = await User.find({ _id: { $in: fromIds } }).select('name picture socialBio').lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return requests
    .map((row) => ({
      requestId: String(row._id),
      createdAt: row.createdAt,
      from: serializePublicUser(userMap.get(String(row.fromUserId)))
    }))
    .filter((row) => row.from);
}

async function getFollowingIdSet(viewerId, targetIds) {
  const rows = await UserFollow.find({
    followerId: viewerId,
    followingId: { $in: targetIds }
  }).select('followingId');

  return new Set(rows.map((row) => String(row.followingId)));
}

async function getFriendRelationMap(viewerId, targetIds) {
  const requests = await FriendRequest.find({
    status: { $in: ['pending', 'accepted'] },
    $or: [
      { fromUserId: viewerId, toUserId: { $in: targetIds } },
      { toUserId: viewerId, fromUserId: { $in: targetIds } }
    ]
  }).lean();

  const map = new Map();

  targetIds.forEach((id) => {
    map.set(String(id), {
      isFriend: false,
      requestStatus: null,
      incomingRequestId: null,
      outgoingRequestId: null
    });
  });

  requests.forEach((req) => {
    const otherId = String(req.fromUserId) === String(viewerId)
      ? String(req.toUserId)
      : String(req.fromUserId);
    const entry = map.get(otherId);

    if (!entry) {
      return;
    }

    if (req.status === 'accepted') {
      entry.isFriend = true;
      entry.requestStatus = 'accepted';
      return;
    }

    if (req.status === 'pending') {
      if (String(req.fromUserId) === String(viewerId)) {
        entry.requestStatus = 'outgoing';
        entry.outgoingRequestId = String(req._id);
      } else {
        entry.requestStatus = 'incoming';
        entry.incomingRequestId = String(req._id);
      }
    }
  });

  return map;
}

async function followUser(followerId, followingId, { silent = false } = {}) {
  if (String(followerId) === String(followingId)) {
    const err = new Error('You cannot follow yourself.');
    err.status = 400;
    throw err;
  }

  const target = await User.findOne({ _id: followingId, discoverable: { $ne: false } });

  if (!target) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  await UserFollow.findOneAndUpdate(
    { followerId, followingId },
    { followerId, followingId },
    { upsert: true, new: true }
  );

  if (!silent) {
    const follower = await User.findById(followerId).select('name');
    await createNotification(followingId, {
      type: 'social_follow',
      title: 'New follower',
      body: `${follower?.name || 'A runner'} started following you on RunAdvisor.`,
      severity: 'info',
      data: { followerId: String(followerId), route: '/community' }
    });
  }

  return { following: true };
}

async function unfollowUser(followerId, followingId) {
  await UserFollow.deleteOne({ followerId, followingId });
  return { following: false };
}

async function sendFriendRequest(fromUserId, toUserId) {
  if (String(fromUserId) === String(toUserId)) {
    const err = new Error('Invalid friend request.');
    err.status = 400;
    throw err;
  }

  const target = await User.findOne({ _id: toUserId, discoverable: { $ne: false } });

  if (!target) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  const existing = await FriendRequest.findOne({
    $or: [
      { fromUserId, toUserId },
      { fromUserId: toUserId, toUserId: fromUserId }
    ]
  }).sort({ createdAt: -1 });

  if (existing?.status === 'accepted') {
    const err = new Error('You are already friends.');
    err.status = 409;
    throw err;
  }

  if (existing?.status === 'pending') {
    const err = new Error('Friend request already pending.');
    err.status = 409;
    throw err;
  }

  const request = await FriendRequest.create({
    fromUserId,
    toUserId,
    status: 'pending'
  });

  const fromUser = await User.findById(fromUserId).select('name');

  await createNotification(toUserId, {
    type: 'friend_request',
    title: 'Friend request',
    body: `${fromUser?.name || 'A runner'} wants to connect on RunAdvisor.`,
    severity: 'info',
    data: { requestId: String(request._id), fromUserId: String(fromUserId), route: '/community' }
  });

  return request;
}

async function respondFriendRequest(userId, requestId, accept) {
  const request = await FriendRequest.findById(requestId);

  if (!request || String(request.toUserId) !== String(userId)) {
    const err = new Error('Friend request not found.');
    err.status = 404;
    throw err;
  }

  if (request.status !== 'pending') {
    const err = new Error('Friend request already handled.');
    err.status = 409;
    throw err;
  }

  request.status = accept ? 'accepted' : 'rejected';
  request.respondedAt = new Date();
  await request.save();

  if (accept) {
    await Promise.all([
      followUser(request.fromUserId, request.toUserId, { silent: true }),
      followUser(request.toUserId, request.fromUserId, { silent: true })
    ]);

    const accepter = await User.findById(userId).select('name');
    await createNotification(request.fromUserId, {
      type: 'friend_accepted',
      title: 'Friend request accepted',
      body: `${accepter?.name || 'Your friend'} accepted your request.`,
      severity: 'info',
      data: { friendId: String(userId), route: '/community' }
    });
  }

  return request;
}

async function listFriends(userId) {
  const accepted = await FriendRequest.find({
    status: 'accepted',
    $or: [{ fromUserId: userId }, { toUserId: userId }]
  }).lean();

  const friendIds = accepted.map((row) =>
    (String(row.fromUserId) === String(userId) ? row.toUserId : row.fromUserId)
  );

  if (!friendIds.length) {
    return [];
  }

  const users = await User.find({ _id: { $in: friendIds } })
    .select('name picture socialBio runningGoal')
    .lean();

  return users.map((user) => serializePublicUser(user, { isFriend: true }));
}

async function listFollowing(userId) {
  const rows = await UserFollow.find({ followerId: userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const ids = rows.map((row) => row.followingId);
  const users = await User.find({ _id: { $in: ids } }).select('name picture socialBio').lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return rows
    .map((row) => serializePublicUser(userMap.get(String(row.followingId)), { isFollowing: true }))
    .filter(Boolean);
}

async function listFollowers(userId) {
  const rows = await UserFollow.find({ followingId: userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const ids = rows.map((row) => row.followerId);
  const users = await User.find({ _id: { $in: ids } }).select('name picture socialBio').lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return rows
    .map((row) => serializePublicUser(userMap.get(String(row.followerId))))
    .filter(Boolean);
}

async function getCommunityFeed(userId, limit = 25) {
  const [friendRows, followRows] = await Promise.all([
    FriendRequest.find({
      status: 'accepted',
      $or: [{ fromUserId: userId }, { toUserId: userId }]
    }).lean(),
    UserFollow.find({ followerId: userId }).select('followingId').lean()
  ]);

  const peerIds = new Set();

  friendRows.forEach((row) => {
    peerIds.add(String(row.fromUserId) === String(userId) ? String(row.toUserId) : String(row.fromUserId));
  });

  followRows.forEach((row) => peerIds.add(String(row.followingId)));

  if (!peerIds.size) {
    return [];
  }

  const activities = await Activity.find({
    userId: { $in: [...peerIds] },
    visibility: { $in: ['everyone', 'followers_only'] }
  })
    .sort({ date: -1 })
    .limit(Math.min(limit, 50))
    .lean();

  const authorIds = [...new Set(activities.map((a) => String(a.userId)))];
  const authors = await User.find({ _id: { $in: authorIds } }).select('name picture').lean();
  const authorMap = new Map(authors.map((a) => [String(a._id), a]));

  return activities.map((activity) => ({
    ...activity,
    id: String(activity._id),
    author: serializePublicUser(authorMap.get(String(activity.userId)))
  }));
}

async function listConversations(userId) {
  const messages = await DirectMessage.aggregate([
    {
      $match: {
        $or: [{ fromUserId: toObjectId(userId) }, { toUserId: toObjectId(userId) }]
      }
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$fromUserId', toObjectId(userId)] },
            '$toUserId',
            '$fromUserId'
          ]
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$toUserId', toObjectId(userId)] },
                  { $eq: ['$readAt', null] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
    { $limit: 50 }
  ]);

  const peerIds = messages.map((row) => row._id);
  const users = await User.find({ _id: { $in: peerIds } }).select('name picture').lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return messages.map((row) => ({
    peer: serializePublicUser(userMap.get(String(row._id))),
    lastMessage: {
      id: String(row.lastMessage._id),
      body: row.lastMessage.body,
      fromUserId: String(row.lastMessage.fromUserId),
      createdAt: row.lastMessage.createdAt,
      readAt: row.lastMessage.readAt
    },
    unreadCount: row.unreadCount
  }));
}

async function getThread(userId, peerId, limit = 50) {
  const viewerOid = toObjectId(userId);
  const peerOid = toObjectId(peerId);

  await DirectMessage.updateMany(
    { fromUserId: peerOid, toUserId: viewerOid, readAt: null },
    { readAt: new Date() }
  );

  const messages = await DirectMessage.find({
    $or: [
      { fromUserId: viewerOid, toUserId: peerOid },
      { fromUserId: peerOid, toUserId: viewerOid }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 100))
    .lean();

  return messages.reverse().map((msg) => ({
    id: String(msg._id),
    fromUserId: String(msg.fromUserId),
    toUserId: String(msg.toUserId),
    body: msg.body,
    readAt: msg.readAt,
    createdAt: msg.createdAt,
    isMine: String(msg.fromUserId) === String(userId)
  }));
}

async function sendMessage(fromUserId, toUserId, body) {
  const text = String(body || '').trim();

  if (!text) {
    const err = new Error('Message cannot be empty.');
    err.status = 400;
    throw err;
  }

  const canMessage = await FriendRequest.findOne({
    status: 'accepted',
    $or: [
      { fromUserId, toUserId },
      { fromUserId: toUserId, toUserId: fromUserId }
    ]
  });

  if (!canMessage) {
    const err = new Error('You can only message friends. Send a friend request first.');
    err.status = 403;
    throw err;
  }

  const message = await DirectMessage.create({
    fromUserId,
    toUserId,
    body: text.slice(0, 2000)
  });

  const sender = await User.findById(fromUserId).select('name');

  await createNotification(toUserId, {
    type: 'social_message',
    title: 'New message',
    body: `${sender?.name || 'A friend'}: ${text.slice(0, 80)}`,
    severity: 'info',
    data: { fromUserId: String(fromUserId), route: '/community' }
  });

  return message;
}

function buildActivitySharePayload(activity, baseUrl) {
  const origin = String(baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const distanceKm = round(Number(activity.distance || 0) / 1000);
  const pace = formatPaceMinPerKm(activity.pace);
  const title = activity.name || 'Run';
  const url = `${origin}/activities/${activity._id}`;
  const text = [
    `${title} — ${distanceKm} km`,
    pace ? `Pace ${pace}` : null,
    'Tracked with RunAdvisor'
  ].filter(Boolean).join(' · ');

  return {
    title,
    text,
    url,
    hashtags: ['RunAdvisor', 'running']
  };
}

module.exports = {
  searchDiscoverableUsers,
  listIncomingFriendRequests,
  followUser,
  unfollowUser,
  sendFriendRequest,
  respondFriendRequest,
  listFriends,
  listFollowing,
  listFollowers,
  getCommunityFeed,
  listConversations,
  getThread,
  sendMessage,
  buildActivitySharePayload,
  serializePublicUser
};
