const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const { sequelize, testConnection } = require('./config/database');
const { User, Location } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const dashboardRoutes = require('./routes/dashboard');
const locationRoutes = require('./routes/locations');
const userRoutes = require('./routes/users');

const app = express();

// Middleware
// Increase limits to accommodate base64 images from camera/file uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    try {
      const bodyForLog = { ...req.body };
      if (typeof bodyForLog.imageUrl === 'string' && bodyForLog.imageUrl.startsWith('data:image')) {
        bodyForLog.imageUrl = '[base64 image omitted]';
      }
      console.log('Request body:', bodyForLog);
    } catch (e) {
      console.log('Request body present (omitted for size)');
    }
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/reports', require('./routes/reports'));
app.use('/api/backup', require('./routes/backup'));

// Serve static frontend build
app.use(express.static(path.join(__dirname, 'public')));

// Health check (for platform probes)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// SPA fallback: let React Router handle non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and create default data
const initializeDatabase = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database in development, or if explicitly requested in production via INIT_DB=true
    const shouldSync = process.env.NODE_ENV !== 'production' || process.env.INIT_DB === 'true';
    if (shouldSync) {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized successfully with schema updates.');
    } else {
      console.log('ℹ️ Skipping sequelize.sync in production; relying on migrations.');
    }
    
    // Create default location if none exists
    const locationCount = await Location.count();
    if (locationCount === 0) {
      await Location.create({
        name: 'Main Warehouse',
        address: 'Default warehouse location'
      });
      console.log('✅ Default location created.');
    }
    
    // Create default admin user if it doesn't exist
    const adminExists = await User.findOne({ where: { email: 'admin@fortunetiles.com' } });
    if (!adminExists) {
      await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@fortunetiles.com',
        password: 'admin123',
        role: 'owner'
      });
      console.log('✅ Default admin user created.');
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler (handled by SPA fallback above for non-API routes)

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();
