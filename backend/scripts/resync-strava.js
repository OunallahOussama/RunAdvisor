#!/usr/bin/env node
/**
 * Resync recent Strava activities for a user (local / Docker testing).
 *
 * Usage:
 *   node scripts/resync-strava.js <email> [limit]
 *   docker compose exec backend node scripts/resync-strava.js you@example.com 24
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { syncRecentActivitiesForUser } = require('../routes/strava');
const { prepareUserForStravaApi } = require('../utils/stravaCredentials');

const DEFAULT_LIMIT = 24;

async function main() {
  const email = process.argv[2];
  const limit = Math.min(Math.max(Number.parseInt(process.argv[3], 10) || DEFAULT_LIMIT, 1), 50);

  if (!email) {
    console.error('Usage: node scripts/resync-strava.js <email> [limit=24]');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/runadvisor?authSource=admin';
  await mongoose.connect(uri);

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  if (!user.stravaAccessToken && !user.stravaRefreshToken) {
    console.error('User has not connected Strava.');
    process.exit(1);
  }

  const { user: refreshed, accessToken } = await prepareUserForStravaApi(user._id);
  console.log(`Syncing last ${limit} activities for ${refreshed.email || email}…`);

  const result = await syncRecentActivitiesForUser(user._id, refreshed, accessToken, limit);

  console.log(JSON.stringify({
    syncedCount: result.syncedCount,
    skippedCount: result.skippedCount,
    latest: result.activities?.[0]?.name || null
  }, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
