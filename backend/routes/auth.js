const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Location } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again later.',
});

const pinLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many PIN attempts. Please try again later.',
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many registration attempts. Please try again later.',
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ 
      where: { email },
      include: [{ model: Location, as: 'location' }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await user.checkPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token with shorter expiry (2 hours)
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        locationId: user.locationId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        location: user.location
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PUBLIC_REGISTRATION !== 'true') {
      return res.status(403).json({ message: 'Registration is disabled' });
    }

    const firstName = typeof req.body?.firstName === 'string' ? req.body.firstName.trim() : '';
    const lastName = typeof req.body?.lastName === 'string' ? req.body.lastName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = req.body?.role;
    const locationId = req.body?.locationId;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        message: 'First name, last name, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Validate location if provided
    if (locationId) {
      const location = await Location.findByPk(locationId);
      if (!location) {
        return res.status(400).json({ message: 'Invalid location ID' });
      }
    }

    // Create new user
    const publicRegistration = process.env.ALLOW_PUBLIC_REGISTRATION === 'true';
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: publicRegistration ? 'staff' : (role || 'staff'),
      locationId
    });

    // Get user with location for response
    const userWithLocation = await User.findByPk(newUser.id, {
      include: [{ model: Location, as: 'location' }]
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userWithLocation.id,
        firstName: userWithLocation.firstName,
        lastName: userWithLocation.lastName,
        email: userWithLocation.email,
        role: userWithLocation.role,
        location: userWithLocation.location
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/verify-pin - Verify admin PIN and grant markup privileges
router.post('/verify-pin', authenticateToken, pinLimiter, async (req, res) => {
  try {
    const pin = typeof req.body?.pin === 'string' || typeof req.body?.pin === 'number' ? String(req.body.pin).trim() : '';

    if (!pin) {
      return res.status(400).json({ message: 'PIN is required' });
    }
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: 'PIN must be 4 digits' });
    }

    // Get the first admin user (owner or manager) with a PIN set
    const admin = await User.findOne({
      where: {
        role: {
          [Op.in]: ['owner', 'manager']
        },
        pin: { [Op.not]: null, [Op.ne]: '' }
      }
    });

    if (!admin) {
      return res.status(400).json({ message: 'No admin PIN configured. Please contact an administrator to set up PIN verification.' });
    }

    // Verify PIN
    const pinMatch = admin.pin === pin.toString();

    if (!pinMatch) {
      return res.status(401).json({ message: 'Invalid PIN' });
    }

    // Return success with markup privilege granted
    res.json({
      message: 'PIN verified successfully',
      markupPrivilegeGranted: true,
      grantedUntil: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
    });

  } catch (error) {
    console.error('PIN verification error:', error);
    res.status(500).json({ message: 'PIN verification failed', error: error.message });
  }
});

// POST /api/auth/set-pin - Admin sets their PIN (owner/manager only)
router.post('/set-pin', authenticateToken, pinLimiter, async (req, res) => {
  try {
    const pin = typeof req.body?.pin === 'string' || typeof req.body?.pin === 'number' ? String(req.body.pin).trim() : '';
    const userId = req.user?.id;

    if (!['owner', 'manager'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Only admins can set PIN' });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: 'PIN must be 4 digits' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.pin = pin;
    await user.save();

    res.json({ message: 'PIN set successfully' });

  } catch (error) {
    console.error('Set PIN error:', error);
    res.status(500).json({ message: 'Failed to set PIN', error: error.message });
  }
});

module.exports = router;
