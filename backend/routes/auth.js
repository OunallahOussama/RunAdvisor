const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

/**
 * User registration
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user
    user = new User({ email, password, name });
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );
    
    res.json({ 
      success: true, 
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * User login
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );
    
    res.json({ 
      success: true, 
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * Update user preferences
 * PUT /api/auth/preferences
 */
router.put('/preferences', require('../middleware/auth'), async (req, res) => {
  try {
    const { age, experience, preferredDistance, trainingGoals } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { 
        age, 
        experience, 
        preferredDistance, 
        trainingGoals,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
