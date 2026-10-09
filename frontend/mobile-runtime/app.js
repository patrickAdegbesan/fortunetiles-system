// Assembles the SAME route files the desktop server uses into one in-app router.
const express = require('express');
const { dispatch } = express;

const router = express();

// Order mirrors backend/server.js. Performance/website/e-mail routes are intentionally left out.
router.use('/api', require('../../backend/routes/health'));
router.use('/api/auth', require('../../backend/routes/auth'));
router.use('/api/users', require('../../backend/routes/users'));
router.use('/api/products', require('../../backend/routes/productImages'));
router.use('/api/products', require('../../backend/routes/products'));
router.use('/api/product-types', require('../../backend/routes/productTypes'));
router.use('/api/categories', require('../../backend/routes/categories'));
router.use('/api/global-attributes', require('../../backend/routes/globalAttributes'));
router.use('/api/inventory', require('../../backend/routes/inventory'));
router.use('/api/sales', require('../../backend/routes/sales'));
router.use('/api/dashboard', require('../../backend/routes/dashboard'));
router.use('/api/locations', require('../../backend/routes/locations'));
router.use('/api/returns', require('../../backend/routes/returns'));
router.use('/api/orders', require('../../backend/routes/orders'));
router.use('/api/reports', require('../../backend/routes/reports'));
router.use('/api/backup', require('../../backend/routes/backup'));
router.use('/api/sync', require('../../backend/routes/sync'));

/** Sends one request through the routes. Resolves {status, headers, data}. */
function handle(request) {
  return dispatch(router, request);
}

/** Starts the cloud-sync timer (does nothing until an owner connects the terminal). */
function startSync() {
  require('../../backend/sync').start();
}

module.exports = { handle, router, startSync };
