const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const { createWriteOriginGuard } = require('./middleware/originGuard');
const { securityHeaders } = require('./middleware/securityHeaders');

// Lazy load database to avoid initialization issues in serverless
let sequelize;
try {
  const db = require('./config/database');
  sequelize = db.sequelize;
} catch (error) {
  console.warn('⚠️ Database initialization deferred:', error.message);
}

const app = express();
app.set('trust proxy', 1);

// Middleware
app.use(securityHeaders());

app.use(compression({ 
  level: 9,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5000')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Vercel sets VERCEL_URL like "fortunetiles-system.vercel.app" (no protocol)
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

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

// Apply CORS ONLY to API routes (never to static assets)
app.use('/api', cors({
  origin: function (origin, callback) {
    // Same-origin requests may send no Origin header
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Do not throw (prevents crashing). Just deny CORS.
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// API Routes (mounted only when DB layer loads)
if (sequelize) {
  try {
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

    app.use('/api/auth', authRoutes);
    app.use('/api/auth', passwordResetRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/contact', contactRoutes);
    app.use('/api/product-types', productTypesRoutes);
    app.use('/api/categories', categoriesRoutes);
    app.use('/api/global-attributes', globalAttributesRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/sales', salesRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/locations', locationRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/returns', returnsRoutes);
    app.use('/api/orders', ordersRoutes);
    app.use('/api', healthRoutes);
    app.use('/api', performanceRoutes);
  } catch (error) {
    console.warn('⚠️ API routes not mounted:', error.message);
    app.all('/api/*', (req, res) => {
      res.status(503).json({
        error: 'API_NOT_AVAILABLE',
        message: 'API is not available. Check database configuration on the server.',
      });
    });
  }
} else {
  app.all('/api/*', (req, res) => {
    res.status(503).json({
      error: 'API_NOT_CONFIGURED',
      message: 'API is not configured. Set DATABASE_URL (or OFFLINE_MODE=1) on the server.',
    });
  });
}

// Inventory (served from backend/public)
app.use('/inventory', express.static(path.join(__dirname, 'public')));

// Serve inventory app
app.get('/inventory*', (req, res) => {
  const inventoryIndexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(inventoryIndexPath);
});

// Company website (served from backend/website-build)
app.use('/', express.static(path.join(__dirname, 'website-build')));

app.get('/favicon.ico', (req, res) => {
  const ico = path.join(__dirname, 'website-build', 'favicon.ico');
  if (fs.existsSync(ico)) return res.sendFile(ico);
  return res.status(204).end();
});

// Website SPA fallback (avoid intercepting /api and /inventory)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/api') return next();
  if (req.path.startsWith('/inventory')) return next();

  const websiteIndexPath = path.join(__dirname, 'website-build', 'index.html');
  if (fs.existsSync(websiteIndexPath)) return res.sendFile(websiteIndexPath);
  return res.status(404).json({ error: 'Not Found' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const message =
    process.env.NODE_ENV === 'development'
      ? (err.message || 'Internal Server Error')
      : 'Internal server error';
  res.status(err.status || 500).json({
    error: message
  });
});

// Initialize database connection (only if sequelize is available)
if (sequelize) {
  sequelize.authenticate()
    .then(() => console.log('✅ Database connected'))
    .catch(err => console.error('❌ Database connection error:', err));
}

module.exports = app;
