const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const {
  generalApiLimiter,
  authLimiter,
  stravaLimiter
} = require('./middleware/rateLimit');
const { buildCorsOptions } = require('./utils/corsOrigins');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors(buildCorsOptions()));
app.use(express.json({
  limit: '3mb',
  verify: (req, _res, buf) => {
    if (req.originalUrl === '/api/strava/webhook') {
      req.rawBody = buf.toString('utf8');
    }
  }
}));

const usageTracker = require('./middleware/usageTracker');
app.use('/api', usageTracker);
app.use('/api', generalApiLimiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/runadvisor', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Strava webhooks (no JWT — verified via hub token)
app.use('/api/strava', require('./routes/stravaWebhooks'));

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/vector-search', require('./routes/vectorSearch'));
app.use('/api/coach/chat', require('./routes/coachChat'));
app.use('/api/coach', require('./routes/coach'));
app.use('/api/training', require('./routes/training'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/strava', stravaLimiter, require('./routes/strava'));
app.use('/api/social', require('./routes/social'));

// Health checks
app.use('/health', require('./routes/health'));

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
