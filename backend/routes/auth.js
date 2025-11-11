const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Location } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

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
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, locationId } = req.body;

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
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'staff',
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
router.post('/verify-pin', authenticateToken, async (req, res) => {
  try {
    const { pin } = req.body;
    console.log('[PIN VERIFY] Request received:', { pin, userId: req.user?.id });

    if (!pin) {
      console.log('[PIN VERIFY] PIN is missing');
      return res.status(400).json({ message: 'PIN is required' });
    }

    // Get the first admin user (owner or manager)
    const admin = await User.findOne({
      where: {
        role: {
          [Op.in]: ['owner', 'manager']
        }
      }
    });

    console.log('[PIN VERIFY] Admin found:', { id: admin?.id, hasPin: !!admin?.pin, adminPin: admin?.pin });

    if (!admin) {
      console.log('[PIN VERIFY] No admin user found');
      return res.status(400).json({ message: 'No admin user found' });
    }

    if (!admin.pin) {
      console.log('[PIN VERIFY] Admin has no PIN configured');
      return res.status(400).json({ message: 'No admin PIN configured' });
    }

    // Verify PIN
    const pinMatch = admin.pin === pin.toString();
    console.log('[PIN VERIFY] PIN comparison:', { provided: pin.toString(), stored: admin.pin, match: pinMatch });

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
router.post('/set-pin', authenticateToken, async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user?.id;

    console.log('[SET PIN] Request received:', { pin, userId, role: req.user?.role });

    if (!['owner', 'manager'].includes(req.user?.role)) {
      console.log('[SET PIN] User is not admin');
      return res.status(403).json({ message: 'Only admins can set PIN' });
    }

    if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
      console.log('[SET PIN] PIN validation failed:', { pin, length: pin?.length });
      return res.status(400).json({ message: 'PIN must be 4 digits' });
    }

    const user = await User.findByPk(userId);
    console.log('[SET PIN] User found:', { id: user?.id, email: user?.email });

    user.pin = pin;
    await user.save();

    console.log('[SET PIN] PIN saved successfully');
    res.json({ message: 'PIN set successfully' });

  } catch (error) {
    console.error('Set PIN error:', error);
    res.status(500).json({ message: 'Failed to set PIN', error: error.message });
  }
});

module.exports = router;
