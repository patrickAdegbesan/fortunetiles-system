#!/usr/bin/env node
// Quick import runner with credentials embedded for this session

const { execSync } = require('child_process');

const HEROKU_DB = "postgres://ubhppt3pap3o0q:p69c1bd2eae1918b258b7bc726455d8ac2f19f8b5506a4db39d2d7eda77d4c875@cee3ebbhveeoab.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d2frkrcsqbjuah";
const RAILWAY_DB = "postgresql://postgres:FcfkEXFYenNmQJFKuTsAFwbTPXuoTmLQ@postgres.railway.internal:5432/railway";

process.env.HEROKU_DATABASE_URL = HEROKU_DB;
process.env.DATABASE_URL = RAILWAY_DB;

console.log("🔄 Starting Heroku → Railway database import...\n");
console.log("📍 Source: Heroku production DB");
console.log("📍 Destination: Railway postgres.railway.internal\n");

// Import by calling the main script
require('./import-heroku-to-railway-quick.js');
