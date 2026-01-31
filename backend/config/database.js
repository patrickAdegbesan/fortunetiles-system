// Ensure dialect drivers are discoverable by Vercel's dependency tracer.
// Sequelize loads 'pg' dynamically; without an explicit require, serverless bundles can miss it.
require('pg');

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env from backend/.env explicitly first, then fallback to project root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

let sequelize;

const isOffline = process.env.OFFLINE_MODE === '1' || process.env.DB_DIALECT === 'sqlite';

if (isOffline) {
  // Offline mode using SQLite file DB
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const storage = process.env.SQLITE_PATH || path.join(dataDir, 'offline.sqlite');

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  });
} else if (process.env.DATABASE_URL) {
  // Production (e.g., Heroku/Railway) using single DATABASE_URL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: process.env.NODE_ENV === 'production' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    } : {},
    pool: {
      max: 25,
      min: 8,
      acquire: 60000,
      idle: 20000,
      evict: 30000,
    },
    retry: {
      max: 3,
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /TIMEOUT/,
      ]
    },
  });
} else {
  // Local development using discrete env vars (Postgres)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
}

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ Database connection established successfully (${isOffline ? 'sqlite' : 'postgres'}).`);
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, DataTypes, testConnection };
