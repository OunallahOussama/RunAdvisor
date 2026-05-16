const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', async (req, res) => {
  const checks = {
    mongodb: 'unknown',
    auth0: 'unknown',
    strava: 'not_configured'
  };

  let statusCode = 200;

  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.db.admin().ping();
      checks.mongodb = 'ok';
    } catch {
      checks.mongodb = 'error';
      statusCode = 503;
    }
  } else {
    checks.mongodb = 'disconnected';
    statusCode = 503;
  }

  if (process.env.AUTH0_DOMAIN && process.env.AUTH0_AUDIENCE) {
    checks.auth0 = 'configured';
  } else {
    checks.auth0 = 'missing';
    statusCode = 503;
  }

  if (process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET) {
    checks.strava = 'configured';
  }

  res.status(statusCode).json({
    status: statusCode === 200 ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    checks
  });
});

module.exports = router;
