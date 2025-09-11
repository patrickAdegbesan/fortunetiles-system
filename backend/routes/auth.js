const express = require('express');
const jwt = require('jsonwebtoken');
const { User, Location } = require('../models');

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

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        locationId: user.locationId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
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

module.exports = router;
