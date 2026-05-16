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

const app = express();

if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use('/api', generalApiLimiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/runadvisor', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/vector-search', require('./routes/vectorSearch'));
app.use('/api/strava', stravaLimiter, require('./routes/strava'));

// Health checks
app.use('/health', require('./routes/health'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
