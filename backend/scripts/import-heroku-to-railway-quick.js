#!/usr/bin/env node

/**
 * Safe Database Dump and Restore from Heroku to Railway
 *
 * - Auto-discovers a Heroku database-url.env in heroku-data-collection/* if present
 * - Requires PostgreSQL client tools (pg_dump, psql) in PATH
 * - Prompts for explicit confirmation (type YES) before proceeding — this will overwrite the Railway DB
 *
 * Usage examples:
 *   // using environment variables
 *   HEROKU_DATABASE_URL="..." DATABASE_URL="..." node import-heroku-to-railway-quick.js
 *
 *   // or rely on collected Heroku export under repo root
 *   node import-heroku-to-railway-quick.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

dotenv.config();
const execAsync = promisify(exec);

async function findHerokuDatabaseUrl() {
  // Look for a database-url.env inside the heroku-data-collection folder
  try {
    const root = path.resolve(__dirname, '..', '..'); // repo root
    const coll = path.join(root, 'heroku-data-collection');
    if (!fs.existsSync(coll)) return null;
    const subdirs = fs.readdirSync(coll).filter(n => fs.statSync(path.join(coll, n)).isDirectory());
    for (const d of subdirs) {
      const candidate = path.join(coll, d, 'database-url.env');
      if (fs.existsSync(candidate)) {
        const content = fs.readFileSync(candidate, 'utf8');
        const parsed = dotenv.parse(content);
        if (parsed.HEROKU_DATABASE_URL) return parsed.HEROKU_DATABASE_URL;
        if (parsed.DATABASE_URL) return parsed.DATABASE_URL;
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

function askConfirmation(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function checkTools() {
  try {
    await execAsync('pg_dump --version');
    await execAsync('psql --version');
    console.log('✅ PostgreSQL tools available\n');
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL tools (pg_dump, psql) not found in PATH. Install the PostgreSQL client tools and retry.');
    return false;
  }
}

async function importData() {
  // Priority: env HEROKU_DATABASE_URL > discovered file > hard-coded fallback (none)
  const discovered = await findHerokuDatabaseUrl();
  const HEROKU_DB_URL = process.env.HEROKU_DATABASE_URL || discovered;
  const RAILWAY_DB_URL = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;

  if (!HEROKU_DB_URL) {
    console.error('❌ HEROKU_DATABASE_URL not provided and no export found under heroku-data-collection/*/database-url.env');
    process.exit(1);
  }

  if (!RAILWAY_DB_URL) {
    console.error('❌ Railway DATABASE_URL not set. Set environment variable DATABASE_URL (or RAILWAY_DATABASE_URL)');
    process.exit(1);
  }

  console.log('🔎 Source (Heroku):', HEROKU_DB_URL.replace(/:[^@]+@/, ':***@'));
  console.log('🔎 Destination (Railway):', RAILWAY_DB_URL.replace(/:[^@]+@/, ':***@'));
  console.log('\n⚠️  This operation will overwrite the destination database schema and data.');

  const answer = await askConfirmation('Type YES to continue: ');
  if (answer !== 'YES') {
    console.log('Aborted by user. No changes were made.');
    process.exit(0);
  }

  const hasTools = await checkTools();
  if (!hasTools) process.exit(1);

  const dumpFile = path.join(__dirname, `heroku-dump-${Date.now()}.sql`);

  try {
    console.log('\n📤 Dumping Heroku database (this may take a while)...');
    // --clean will include DROP statements to replace objects on target. This is destructive.
    const dumpCmd = `pg_dump --no-owner --no-privileges --format=plain --clean "${HEROKU_DB_URL}" > "${dumpFile}"`;
    await execAsync(dumpCmd, { maxBuffer: 1024 * 1024 * 20 });
    console.log(`✅ Database exported to ${dumpFile}\n`);

    console.log('📥 Importing dump into Railway database...');
    const importCmd = `psql "${RAILWAY_DB_URL}" -f "${dumpFile}"`;
    await execAsync(importCmd, { maxBuffer: 1024 * 1024 * 20 });
    console.log('✅ Data imported to Railway successfully!\n');

    // Cleanup
    try { fs.unlinkSync(dumpFile); console.log('✅ Cleanup complete'); } catch (e) { /* noop */ }
  } catch (error) {
    console.error('❌ Error during migration:');
    console.error(error.stdout || error.stderr || error.message || error);
    console.error('\n⚠️  The dump file (if created) has been left for inspection at:', dumpFile);
    process.exit(1);
  }
}

importData();
