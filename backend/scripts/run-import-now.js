#!/usr/bin/env node
// Quick import runner (no embedded credentials).
//
// Required environment variables:
// - HEROKU_DATABASE_URL (source)
// - DATABASE_URL or RAILWAY_DATABASE_URL (destination)

const source = process.env.HEROKU_DATABASE_URL;
const destination = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;

if (!source || !destination) {
  console.error('❌ Missing required environment variables.');
  console.error('Set HEROKU_DATABASE_URL (source) and DATABASE_URL (destination).');
  process.exit(1);
}

console.log("🔄 Starting Heroku → Railway database import...\n");
console.log("📍 Source: Heroku production DB");
console.log("📍 Destination: Railway postgres.railway.internal\n");

// Import by calling the main script
require('./import-heroku-to-railway-quick.js');
