const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const dotenv = require('dotenv');

// Load env from backend/.env explicitly first, then fallback to project root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

let sequelize;

if (process.env.DATABASE_URL) {
  // Production (e.g., Heroku) using single DATABASE_URL
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
      max: 25,        // Increase max connections for higher concurrency
      min: 8,         // Keep more connections ready (reduces cold connection time)
      acquire: 60000, // Increase acquire timeout (60s)
      idle: 20000,    // Increase idle time (20s)
      evict: 30000,   // Connection eviction time
    },
    retry: {
      max: 3,         // Retry failed connections
      match: [        // Retry on specific errors
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /TIMEOUT/,
      ]
    },
  });
} else {
  // Local development using discrete env vars
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
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, DataTypes, testConnection };
