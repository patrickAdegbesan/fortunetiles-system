// Vercel entrypoint: export the Express app.
// This lets one Vercel project serve:
// - Company website at /
// - Inventory app at /inventory
// - API at /api

module.exports = require('../backend/app');
