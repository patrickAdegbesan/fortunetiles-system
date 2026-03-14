const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const crypto = require('crypto');
const { exec } = require('child_process');

const { sequelize, testConnection } = require('./config/database');
const { User, Location, Category, GlobalAttribute } = require('./models');
const { createWriteOriginGuard } = require('./middleware/originGuard');

// Import routes
const authRoutes = require('./routes/auth');
const passwordResetRoutes = require('./routes/passwordReset');
const productRoutes = require('./routes/products');
const contactRoutes = require('./routes/contact');
const productTypesRoutes = require('./routes/productTypes');
const categoriesRoutes = require('./routes/categories');
const globalAttributesRoutes = require('./routes/globalAttributes');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const dashboardRoutes = require('./routes/dashboard');
const locationRoutes = require('./routes/locations');
const userRoutes = require('./routes/users');
const returnsRoutes = require('./routes/returns');
const ordersRoutes = require('./routes/orders');
const healthRoutes = require('./routes/health');
const performanceRoutes = require('./routes/performance');
const HerokuKeepAlive = require('./services/keepAlive');
const WebSocketService = require('./services/WebSocketService');

// Add global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message, error.stack);
  // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

const app = express();
app.set('trust proxy', 1);

// Middleware
// Add security headers
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent referrer leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'");
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  
  next();
});

// Enable aggressive compression for all responses
app.use(compression({ 
  level: 9,        // Maximum compression
  threshold: 1024, // Compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) return false;
    // Compress everything else
    return compression.filter(req, res);
  }
}));

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
app.use(express.json({
  limit: '25mb',
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.startsWith('/webhook/website-update')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Configure CORS with origin whitelist
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5000')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(cors({
  origin: function(origin, callback) {
    const normalizedOrigin = origin ? origin.replace(/\/$/, '') : origin;
    if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Optional HTTPS enforcement (recommended behind a reverse proxy)
if (process.env.ENFORCE_HTTPS === 'true') {
  app.use((req, res, next) => {
    const forwardedProto = req.get('x-forwarded-proto');
    const isSecure = req.secure || forwardedProto === 'https';
    if (isSecure) return next();

    if (req.method === 'GET' || req.method === 'HEAD') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }

    return res.status(400).json({ message: 'HTTPS required' });
  });
}

// Basic origin guard for browser-initiated write requests (CSRF mitigation)
app.use('/api', createWriteOriginGuard(allowedOrigins));

// Logging middleware - only log in development mode
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
      try {
        const bodyForLog = { ...req.body };
        const sensitiveFields = ['password', 'newPassword', 'token', 'resetToken', 'pin'];
        for (const field of sensitiveFields) {
          if (field in bodyForLog) bodyForLog[field] = '[redacted]';
        }
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
app.use('/api', healthRoutes); // Health check routes
app.use('/api', performanceRoutes); // Performance monitoring routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', passwordResetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-types', productTypesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/global-attributes', globalAttributesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reports', require('./routes/reports'));
app.use('/api/backup', require('./routes/backup'));

// Webhook endpoint for automatic website updates with HMAC signature verification
app.post('/webhook/website-update', (req, res) => {
  console.log('📡 Website update webhook received');
  
  // Verify GitHub webhook signature
  const signature = req.get('x-hub-signature-256');
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('❌ GITHUB_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }
  
  if (!signature) {
    console.error('❌ Missing webhook signature');
    return res.status(401).json({ error: 'Unauthorized: missing signature' });
  }
  
  // Verify HMAC signature
  const rawBody = req.rawBody;
  if (!rawBody) {
    console.error('❌ Missing raw request body for signature verification');
    return res.status(400).json({ error: 'Bad Request' });
  }

  const hash = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const expectedSignature = `sha256=${hash}`;
  
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    console.error('❌ Invalid webhook signature');
    return res.status(401).json({ error: 'Unauthorized: invalid signature' });
  }
  
  // Verify event type
  const event = req.get('x-github-event');
  if (event !== 'push') {
    return res.status(400).json({ error: 'Only push events are supported' });
  }
  
  exec('git submodule update --remote website', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Submodule update failed:', error);
      return res.status(500).json({ error: 'Update failed' });
    }
    
    console.log('✅ Website updated successfully');
    res.json({ success: true, message: 'Website updated successfully' });
  });
});

// Configure static file serving with improved caching and performance
const staticOptions = {
  maxAge: '7d',       // Cache for 7 days
  etag: true,         // Use ETags for caching
  lastModified: true, // Use Last-Modified for caching
  index: false        // Don't automatically serve index.html
};

// Special route for the exact /inventory path - serve React app directly
app.get('/inventory', (req, res) => {
  const inventoryIndexPath = path.join(__dirname, 'public', 'index.html');

  // Check if file exists before trying to serve it
  if (!fs.existsSync(inventoryIndexPath)) {
    console.warn('⚠️ Inventory app not found at:', inventoryIndexPath);
    return res.status(503).json({ 
      error: 'Inventory system not available', 
      message: 'The inventory frontend has not been built. This is a backend-only deployment.'
    });
  }

  // Set headers to prevent caching issues
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Type', 'text/html');

  // Log for debugging
  console.log('Serving React app directly for /inventory path');

  // Send the React app directly
  return res.sendFile(inventoryIndexPath);
});

// Serve inventory system static files at /inventory/... with clear branding
app.use('/inventory', express.static(path.join(__dirname, 'public'), {
  ...staticOptions,
  setHeaders: (res, path) => {
    // Log static file requests for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Serving static file: ${path}`);
    }
    
    // Set appropriate headers for different file types
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache JS for 1 year
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache CSS for 1 year
    } else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache images for 1 year
    }
    
    // Ensure proper content sniffing prevention
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Serve website assets at root URL with optimized performance
app.use('/', express.static(path.join(__dirname, 'website-build'), staticOptions));

// Health check (for platform probes)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Handle service worker file with correct MIME type
app.get('/sw.js', (req, res) => {
  const swPath = path.join(__dirname, 'public', 'sw.js');
  if (fs.existsSync(swPath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(swPath);
  } else {
    console.error('Service worker file not found at:', swPath);
    res.status(404).send('// Service worker not available');
  }
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

// Redirect password reset URLs to inventory app
app.get('/reset-password*', (req, res) => {
  const newPath = '/inventory' + req.path;
  console.log(`Redirecting password reset from ${req.path} to ${newPath}`);
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
  // Log the requested path for debugging
  console.log(`Catch-all handler for path: ${req.path}`);
  
  // Don't handle API routes or webhooks
  if (req.path.startsWith('/api/') || req.path.startsWith('/webhook/')) {
    return res.status(404).json({ message: 'Route not found' });
  }
  
  // Don't handle /inventory exact path (already handled by specific route)
  if (req.path === '/inventory') {
    return next(); // Let the specific handler take care of this
  }
  
  // Don't handle static files - let Express's static middleware handle them
  if (req.path.includes('/static/') || req.path.includes('/assets/')) {
    return next();
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
    
    // Use migrations for Postgres; for SQLite offline mode, bootstrap schema with sync
    if (sequelize.getDialect() === 'sqlite') {
      console.log('ℹ️ SQLite detected: running sequelize.sync() to bootstrap local schema');
      await sequelize.sync();
    } else {
      console.log('ℹ️ Skipping sequelize.sync; relying on existing database schema and migrations.');
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
    
    // Create default admin user only in development if SEED_ADMIN_USER is set
    if (process.env.NODE_ENV !== 'production' && process.env.SEED_ADMIN_USER === 'true') {
      const adminExists = await User.findOne({ where: { email: 'admin@fortunetiles.com' } });
      if (!adminExists) {
        const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
        await User.create({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@fortunetiles.com',
          password: adminPassword,
          role: 'owner'
        });
        console.log('✅ Default admin user created. Email: admin@fortunetiles.com');
        console.log('⚠️  IMPORTANT: Change the default password immediately!');
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.log('ℹ️  Admin user auto-creation disabled in production. Create users manually via admin panel.');
    }

    // Ensure default categories exist
    if (Category) {
      const defaultCategories = ['General', 'Luxury', 'Premium', 'Marble', 'Granite', 'Ceramic', 'Porcelain', 'Travertine'];
      await Promise.all(defaultCategories.map(async (name) => {
        await Category.findOrCreate({ where: { name }, defaults: { name } });
      }));
      console.log('✅ Default categories ensured.');
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
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('❌ Missing JWT_SECRET in production environment');
    process.exit(1);
  }

  await initializeDatabase();

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Initialize WebSocket service
    const wsService = new WebSocketService(server);
    
    // Make WebSocket service available globally for notifications
    global.wsService = wsService;
    
    // TEMPORARILY DISABLE keep-alive service for debugging
    console.log('ℹ️ Keep-alive service temporarily disabled for debugging');
    
    /*
    // Start keep-alive service for production
    let keepAlive = null;
    if (process.env.NODE_ENV === 'production') {
      // Prefer explicit public URL, otherwise derive from Railway-provided domains; if none, disable keep-alive
      const derivedRailwayUrl =
        (process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`) ||
        (process.env.RAILWAY_STATIC_URL && `https://${process.env.RAILWAY_STATIC_URL}`) ||
        (process.env.RAILWAY_SERVICE_F_F_URL && `https://${process.env.RAILWAY_SERVICE_F_F_URL}`);

      const publicUrl = process.env.APP_PUBLIC_URL || process.env.HEROKU_APP_URL || derivedRailwayUrl;

      if (publicUrl) {
        keepAlive = new HerokuKeepAlive(publicUrl);
        keepAlive.start();
      } else {
        console.log('ℹ️ Keep-alive disabled: no public URL detected. Set APP_PUBLIC_URL or ensure Railway public domain is available.');
      }
      
      // Graceful shutdown
      process.on('SIGTERM', () => {
        if (keepAlive) keepAlive.stop();
        wsService?.wss?.close();
      });
      process.on('SIGINT', () => {
        if (keepAlive) keepAlive.stop();
        wsService?.wss?.close();
      });
    }
    */
    
    // Graceful shutdown (without keep-alive)
    process.on('SIGTERM', () => {
      console.log('📴 Received SIGTERM signal, shutting down gracefully...');
      wsService?.wss?.close();
      process.exit(0);
    });
    process.on('SIGINT', () => {
      console.log('📴 Received SIGINT signal, shutting down gracefully...');
      wsService?.wss?.close();
      process.exit(0);
    });
    
    // Log that server is staying alive
    console.log('✅ Server setup complete, now listening for requests...');
    setInterval(() => {
      console.log(`💓 Heartbeat: Server still running (uptime: ${Math.floor(process.uptime())}s)`);
    }, 30000); // Log every 30 seconds
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. The backend could not start.`);
      console.error('➡️  Free the port or set the PORT environment variable to a different value before retrying.');
      if (process.platform === 'win32') {
        console.error('   Suggested commands (PowerShell):');
        console.error(`     netstat -ano | findstr :${PORT}`);
        console.error('     taskkill /PID <PID_FROM_ABOVE> /F');
      } else {
        console.error('   Suggested commands:');
        console.error(`     lsof -i :${PORT}`);
        console.error('     kill -9 <PID_FROM_ABOVE>');
      }
    } else {
      console.error('❌ Failed to start the server due to an unexpected error:', error);
    }
    process.exit(1);
  });
};

startServer();
