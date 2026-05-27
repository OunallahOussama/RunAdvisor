const express = require('express');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const {
  prepareUserForStravaApi,
  stravaAxios
} = require('../utils/stravaCredentials');
const {
  searchDiscoverableUsers,
  listDiscoverableMembers,
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
  buildActivitySharePayload
} = require('../services/socialService');

const router = express.Router();

router.get('/users/search', auth, async (req, res) => {
  try {
    const users = await searchDiscoverableUsers(req.userId, req.query.q, 20);
    res.json({ success: true, users });
  } catch (error) {
    res.status(error.status || 500).json({
      error: 'Search failed',
      message: error.message || 'Could not search users.'
    });
  }
});

router.get('/members', auth, async (req, res) => {
  try {
    const members = await listDiscoverableMembers(req.userId, 15);
    res.json({ success: true, members });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load members' });
  }
});

router.get('/friends/requests/incoming', auth, async (req, res) => {
  try {
    const requests = await listIncomingFriendRequests(req.userId);
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load friend requests' });
  }
});

router.get('/friends', auth, async (req, res) => {
  try {
    const friends = await listFriends(req.userId);
    res.json({ success: true, friends });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load friends' });
  }
});

router.get('/following', auth, async (req, res) => {
  try {
    const following = await listFollowing(req.userId);
    res.json({ success: true, following });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load following' });
  }
});

router.get('/followers', auth, async (req, res) => {
  try {
    const followers = await listFollowers(req.userId);
    res.json({ success: true, followers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load followers' });
  }
});

router.post('/follow/:userId', auth, async (req, res) => {
  try {
    const result = await followUser(req.userId, req.params.userId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.delete('/follow/:userId', auth, async (req, res) => {
  try {
    const result = await unfollowUser(req.userId, req.params.userId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.post('/friends/request/:userId', auth, async (req, res) => {
  try {
    const request = await sendFriendRequest(req.userId, req.params.userId);
    res.status(201).json({
      success: true,
      requestId: String(request._id),
      status: request.status
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.post('/friends/requests/:requestId/accept', auth, async (req, res) => {
  try {
    const request = await respondFriendRequest(req.userId, req.params.requestId, true);
    res.json({ success: true, status: request.status });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.post('/friends/requests/:requestId/reject', auth, async (req, res) => {
  try {
    const request = await respondFriendRequest(req.userId, req.params.requestId, false);
    res.json({ success: true, status: request.status });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.get('/feed', auth, async (req, res) => {
  try {
    const feed = await getCommunityFeed(req.userId, 30);
    res.json({ success: true, feed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load community feed' });
  }
});

router.get('/messages', auth, async (req, res) => {
  try {
    const conversations = await listConversations(req.userId);
    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const messages = await getThread(req.userId, req.params.userId);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load thread' });
  }
});

router.post('/messages/:userId', auth, async (req, res) => {
  try {
    const message = await sendMessage(req.userId, req.params.userId, req.body?.body);
    res.status(201).json({
      success: true,
      message: {
        id: String(message._id),
        body: message.body,
        createdAt: message.createdAt
      }
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.get('/activities/:id/share', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    if (activity.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const share = buildActivitySharePayload(
      activity,
      req.query.origin || process.env.FRONTEND_URL
    );

    res.json({ success: true, share });
  } catch (error) {
    res.status(500).json({ error: 'Failed to build share payload' });
  }
});

/**
 * Strava clubs for the authenticated athlete (Strava has no friends API).
 * GET /api/social/strava/clubs
 */
router.get('/strava/clubs', auth, async (req, res) => {
  try {
    const { accessToken } = await prepareUserForStravaApi(req.userId);
    const response = await stravaAxios.get('https://www.strava.com/api/v3/athlete/clubs', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const clubs = (Array.isArray(response.data) ? response.data : []).map((club) => ({
      id: club.id,
      name: club.name,
      sportType: club.sport_type,
      city: club.city,
      country: club.country,
      memberCount: club.member_count,
      url: club.url
    }));

    res.json({ success: true, clubs });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || 'Could not load Strava clubs. Connect Strava first.'
    });
  }
});

module.exports = router;
