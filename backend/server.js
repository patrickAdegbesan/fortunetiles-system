const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const compression = require('compression');

const { sequelize, testConnection, dataDir } = require('./config/database');

// The JWT secret is generated once per installation and stored beside the
// database, so sessions stay valid across restarts with no configuration.
function loadJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const secretPath = path.join(dataDir, 'jwt.secret');
  if (fs.existsSync(secretPath)) return fs.readFileSync(secretPath, 'utf8').trim();
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}
process.env.JWT_SECRET = loadJwtSecret();

const { Location, Category } = require('./models');
const { ensureDefaultAdmin } = require('./bootstrap');
const { securityHeaders } = require('./middleware/securityHeaders');
const WebSocketService = require('./services/WebSocketService');

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message, error.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const app = express();

app.use(securityHeaders());
app.use(compression());
// Large limit: product images are uploaded as base64 data URLs.
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// API routes
app.use('/api', require('./routes/health'));
app.use('/api', require('./routes/performance'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/product-types', require('./routes/productTypes'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/global-attributes', require('./routes/globalAttributes'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }));

// The React app is built with homepage "/inventory"
const publicDir = path.join(__dirname, 'public');
const indexPath = path.join(publicDir, 'index.html');
app.use('/inventory', express.static(publicDir, { index: false }));
app.get('/', (req, res) => res.redirect('/inventory/'));
app.get('/inventory*', (req, res) => {
  if (!fs.existsSync(indexPath)) {
    return res.status(503).send('Application files are missing. Run "npm run build:app" first.');
  }
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexPath);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

async function initializeDatabase() {
  await testConnection();
  await sequelize.sync();

  if ((await Location.count()) === 0) {
    await Location.create({ name: 'Main Warehouse', address: 'Default warehouse location' });
  }

  await ensureDefaultAdmin();

  const defaultCategories = ['General', 'Luxury', 'Premium', 'Marble', 'Granite', 'Ceramic', 'Porcelain', 'Travertine'];
  for (const name of defaultCategories) {
    await Category.findOrCreate({ where: { name }, defaults: { name } });
  }
}

async function start() {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }

  const port = process.env.PORT || 5175;
  // Bind to loopback only: nothing on the network can reach the app.
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`Fortune Tiles server listening on http://127.0.0.1:${port}`);
    global.wsService = new WebSocketService(server);
  });

  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use.` : error);
    process.exit(1);
  });

  const shutdown = () => {
    global.wsService?.wss?.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start();
