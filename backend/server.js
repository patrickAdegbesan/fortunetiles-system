const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const compression = require('compression');

const { sequelize, testConnection } = require('./config/database');
const { User, Location } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const passwordResetRoutes = require('./routes/passwordReset');
const productRoutes = require('./routes/products');
const contactRoutes = require('./routes/contact');
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
// Enable compression for all responses
app.use(compression({ level: 6, threshold: 0 }));

// Set cache headers for static assets
const setCache = function (req, res, next) {
  // Skip caching for API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Cache static assets for 1 week
  const period = 60 * 60 * 24 * 7; // 1 week in seconds
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${period}`);
  } else {
    // for other requests, no cache
    res.set('Cache-Control', 'no-store');
  }
  next();
};
app.use(setCache);

// Increase limits to accommodate base64 images from camera/file uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cors());

// Logging middleware - only log in development mode
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
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
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', passwordResetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);
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

// Configure static file serving with improved caching and performance
const staticOptions = {
  maxAge: '7d',       // Cache for 7 days
  etag: true,         // Use ETags for caching
  lastModified: true, // Use Last-Modified for caching
  index: false        // Don't automatically serve index.html
};

// Special route for the exact /inventory path
app.get('/inventory', (req, res) => {
  const inventoryHtmlPath = path.join(__dirname, 'public', 'inventory.html');
  
  // Set headers to prevent caching issues
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Send the special inventory.html file that loads the app without redirects
  return res.sendFile(inventoryHtmlPath);
});

// Serve inventory system at /inventory/... with clear branding
app.use('/inventory', express.static(path.join(__dirname, 'public'), staticOptions));

// Serve website assets at root URL with optimized performance
app.use('/', express.static(path.join(__dirname, 'website-build'), staticOptions));

// Health check (for platform probes)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Handle service worker file for local development
app.get('/sw.js', (req, res) => {
  res.status(204).send(); // No content - service worker not needed in local dev
});

// Root URL handler to prevent redirect loops
app.get('/', (req, res) => {
  const websiteIndexPath = path.join(__dirname, 'website-build', 'index.html');
  
  if (fs.existsSync(websiteIndexPath)) {
    // Set headers to prevent caching issues
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Application-Name', 'Fortune et Feveur');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.sendFile(websiteIndexPath);
  } else {
    return res.status(503).send('Website maintenance in progress. Please try again shortly.');
  }
});

// Redirect old /system URLs to /inventory for backward compatibility
app.get('/system*', (req, res) => {
  const newPath = req.path.replace('/system', '/inventory');
  console.log(`Redirecting from ${req.path} to ${newPath}`);
  res.redirect(301, newPath);
});

// Add clear systems access page
app.get('/systems', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'systems.html'));
});

// API routes are already configured at /api

// This route is now handled by the earlier '/inventory' route handler
// which serves inventory.html instead of index.html to prevent redirect loops

// Clear SPA fallback routing with streamlined downloads
app.get('*', (req, res, next) => {
  // Don't handle API routes or webhooks
  if (req.path.startsWith('/api/') || req.path.startsWith('/webhook/')) {
    return res.status(404).json({ message: 'Route not found' });
  }
  
  // Don't handle /inventory exact path (already handled by specific route)
  if (req.path === '/inventory') {
    return res.status(404).json({ message: 'Route already handled by specific handler' });
  }
  
  // Handle SPA routing for inventory system with clear branding
  if (req.path.startsWith('/inventory/') || (req.path.startsWith('/inventory') && req.path.length > '/inventory'.length)) {
    // Don't handle static files in SPA fallback
    if (req.path.includes('/static/')) {
      return res.status(404).send('File not found');
    }
    
    const inventoryIndexPath = path.join(__dirname, 'public', 'index.html');
    
    // Set appropriate headers to improve download experience and prevent caching issues
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Application-Name', 'Fortune Tiles Inventory System');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Log the routing for debugging
    console.log(`Serving SPA route for: ${req.path}`);
    
    if (fs.existsSync(inventoryIndexPath)) {
      return res.sendFile(inventoryIndexPath);
    } else {
      return res.status(404).json({ 
        message: 'Inventory system not available. Please contact support.',
        system: 'Fortune Tiles Inventory'
      });
    }
  }
  // Handle website SPA routing with improved error handling
  else {
    const websiteIndexPath = path.join(__dirname, 'website-build', 'index.html');
    
    // Set appropriate headers to improve download experience
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Application-Name', 'Fortune et Feveur');
    
    if (fs.existsSync(websiteIndexPath)) {
      res.sendFile(websiteIndexPath);
    } else {
      res.status(503).send('Website maintenance in progress. Please try again shortly.');
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
