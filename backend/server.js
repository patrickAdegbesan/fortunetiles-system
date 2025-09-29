const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const { sequelize, testConnection } = require('./config/database');
const { User, Location } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const passwordResetRoutes = require('./routes/passwordReset');
const productRoutes = require('./routes/products');
const productTypesRoutes = require('./routes/productTypes');
const categoriesRoutes = require('./routes/categories');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const dashboardRoutes = require('./routes/dashboard');
const locationRoutes = require('./routes/locations');
const userRoutes = require('./routes/users');
const returnsRoutes = require('./routes/returns');
const ordersRoutes = require('./routes/orders');

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
app.use('/api/auth', passwordResetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-types', productTypesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reports', require('./routes/reports'));
app.use('/api/backup', require('./routes/backup'));

// Webhook endpoint for automatic website updates
const { exec } = require('child_process');
app.post('/webhook/website-update', express.raw({type: 'application/json'}), (req, res) => {
  console.log('📡 Website update webhook received');
  
  // Add basic security - you can enhance this with proper webhook verification
  const userAgent = req.get('User-Agent') || '';
  if (!userAgent.includes('GitHub-Hookshot')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  exec('git submodule update --remote website', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Submodule update failed:', error);
      return res.status(500).json({ error: 'Update failed', details: error.message });
    }
    
    console.log('✅ Website updated:', stdout);
    res.json({ success: true, message: 'Website updated successfully', output: stdout });
  });
});

// Serve company website at root (/) - check if directory exists first
// Website is now served from website-build directory

// Serve inventory system at /system (protected route)
app.use('/system', (req, res, next) => {
  // Basic auth check - you can enhance this with your authentication logic
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.set('WWW-Authenticate', 'Basic realm="Fortune Tiles System"');
    return res.status(401).send('Authentication required');
  }
  next();
}, express.static(path.join(__dirname, 'public')));

// Serve website at root URL
app.use('/', express.static(path.join(__dirname, 'website-build')));

// Health check (for platform probes)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Handle service worker file for local development
app.get('/sw.js', (req, res) => {
  res.status(204).send(); // No content - service worker not needed in local dev
});

// API routes are already configured at /api

// SPA fallback routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/webhook/')) {
    return res.status(404).json({ message: 'Route not found' });
  }
  
  // Handle SPA routing for inventory system
  if (req.path.startsWith('/system')) {
    const inventoryIndexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(inventoryIndexPath)) {
      res.sendFile(inventoryIndexPath);
    } else {
      res.status(404).json({ message: 'Inventory system not built. Please run: npm run build in the frontend directory.' });
    }
  } 
  // Handle website SPA routing
  else {
    const websiteIndexPath = path.join(__dirname, 'website-build', 'index.html');
    if (fs.existsSync(websiteIndexPath)) {
      res.sendFile(websiteIndexPath);
    } else {
      res.status(404).send('Website is being built. Please try again later.');
    }
  }
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
