const express = require('express');
const router = express.Router();
const { User, Location } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { activityLogger } = require('../middleware/activityLogger');
const cache = require('../middleware/enhancedCache');

// GET /api/users/roles - Get available roles (MUST be before /:id route) (cached)
router.get('/roles', authenticateToken, async (req, res) => {
  try {
    const roles = await cache.getOrSetSmart('users:roles', async () => {
      return [
        { value: 'owner', label: 'Owner', description: 'Full system access' },
        { value: 'manager', label: 'Manager', description: 'Manage inventory and sales' },
        { value: 'staff', label: 'Staff', description: 'Process sales and view inventory' }
      ];
    }, 600000); // Cache for 10 minutes (roles don't change often)

    res.json({
      message: 'Roles retrieved successfully',
      roles
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/users - List all users (admin only)
router.get('/', authenticateToken, requireRole(['owner']), activityLogger('view_users', 'users'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, isActive, search } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      include: [{ model: Location, as: 'location' }],
      attributes: { exclude: ['password'] },
      offset,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      message: 'Users retrieved successfully',
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/users/:id - Get single user (admin only)
router.get('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [{ 
        model: Location, 
        as: 'location',
        attributes: ['id', 'name', 'address']
      }],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User retrieved successfully',
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/users - Create new user (admin only)
router.post('/', authenticateToken, requireRole(['owner']), activityLogger('create_user', 'users'), async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, locationId, isActive } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        message: 'First name, last name, email, and password are required' 
      });
    }

    // Validate role
    const validRoles = ['owner', 'manager', 'staff'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Must be one of: owner, manager, staff' 
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
      locationId,
      isActive: isActive !== undefined ? isActive : true
    });

    // Get user with location for response
    const userWithLocation = await User.findByPk(newUser.id, {
      include: [{ 
        model: Location, 
        as: 'location',
        attributes: ['id', 'name', 'address']
      }],
      attributes: { exclude: ['password'] }
    });

    // Invalidate user-related cache entries
    cache.delete('users:all');
    const cacheKeys = cache.getStats().keys;
    cacheKeys.forEach(key => {
      if (key.startsWith('users:')) {
        cache.delete(key);
      }
    });

    // Notify WebSocket clients if available
    if (global.wsService) {
      global.wsService.broadcast({
        type: 'user_created',
        user: userWithLocation
      });
    }

    res.status(201).json({
      message: 'User created successfully',
      user: userWithLocation
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/users/:id - Update user roles/permissions (admin only)
router.put('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, locationId, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (req.user.userId === parseInt(id) && isActive === false) {
      return res.status(400).json({ 
        message: 'You cannot deactivate your own account' 
      });
    }

    // Validate role if provided
    const validRoles = ['owner', 'manager', 'staff'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Must be one of: owner, manager, staff' 
      });
    }

    // Validate location if provided
    if (locationId) {
      const location = await Location.findByPk(locationId);
      if (!location) {
        return res.status(400).json({ message: 'Invalid location ID' });
      }
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ 
        where: { email },
        attributes: ['id']
      });
      if (existingUser && existingUser.id !== parseInt(id)) {
        return res.status(409).json({ message: 'Email already in use by another user' });
      }
    }

    // Update user
    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      email: email || user.email,
      role: role || user.role,
      locationId: locationId !== undefined ? locationId : user.locationId,
      isActive: isActive !== undefined ? isActive : user.isActive
    });

    // Get updated user with location
    const updatedUser = await User.findByPk(id, {
      include: [{ 
        model: Location, 
        as: 'location',
        attributes: ['id', 'name', 'address']
      }],
      attributes: { exclude: ['password'] }
    });

    // Invalidate user-related cache entries
    cache.delete('users:all');
    cache.delete(`users:${id}`);
    const cacheKeys = cache.getStats().keys;
    cacheKeys.forEach(key => {
      if (key.startsWith('users:')) {
        cache.delete(key);
      }
    });

    // Notify WebSocket clients if available
    if (global.wsService) {
      global.wsService.broadcast({
        type: 'user_updated',
        user: updatedUser
      });
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/users/:id - Delete or deactivate user (admin only)
router.delete('/:id', authenticateToken, requireRole(['owner']), activityLogger('delete_user', 'users'), async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query; // ?hardDelete=true for permanent deletion

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (req.user.userId === parseInt(id)) {
      return res.status(400).json({ 
        message: 'You cannot delete your own account' 
      });
    }

    if (hardDelete === 'true') {
      // Hard delete - permanently remove user
      await user.destroy();
      
      // Invalidate user-related cache entries
      cache.delete(`user:${id}`);
      cache.delete('users:roles');
      // Clear all user list cache entries
      const cacheKeys = cache.getStats().keys;
      cacheKeys.forEach(key => {
        if (key.startsWith('users:') || key.includes('user-list')) {
          cache.delete(key);
        }
      });
      
      // Notify WebSocket clients if available
      if (global.wsService) {
        global.wsService.broadcast({
          type: 'user_deleted',
          userId: id,
          permanent: true
        }, 'role_owner');
      }
      
      res.json({ 
        message: 'User deleted permanently',
        user: {
          id: user.id,
          email: user.email,
          deleted: true
        }
      });
    } else {
      // Soft delete - deactivate user
      await user.update({ isActive: false });

      // Invalidate user-related cache entries
      cache.delete(`user:${id}`);
      const cacheKeys = cache.getStats().keys;
      cacheKeys.forEach(key => {
        if (key.startsWith('users:') || key.includes('user-list')) {
          cache.delete(key);
        }
      });
      
      // Notify WebSocket clients if available
      if (global.wsService) {
        global.wsService.broadcast({
          type: 'user_updated',
          userId: id,
          isActive: false
        }, 'role_owner');
      }

      res.json({ 
        message: 'User deactivated successfully',
        user: {
          id: user.id,
          email: user.email,
          isActive: false
        }
      });
    }

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/users/:id/activate - Reactivate user (admin only)
router.put('/:id/activate', authenticateToken, requireRole(['owner']), activityLogger('activate_user', 'users'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.update({ isActive: true });

    const updatedUser = await User.findByPk(id, {
      include: [{ 
        model: Location, 
        as: 'location',
        attributes: ['id', 'name', 'address']
      }],
      attributes: { exclude: ['password'] }
    });

    res.json({ 
      message: 'User activated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
