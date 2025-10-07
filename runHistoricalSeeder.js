#!/usr/bin/env node

/**
 * Fortune Tiles Historical Data Seeder - Execution Script
 * 
 * This script safely executes the comprehensive historical data seeding
 * with proper error handling and database connection management.
 */

const path = require('path');
const { exec } = require('child_process');

// Add the backend directory to the module path
process.chdir(path.join(__dirname, 'backend'));

// Set NODE_ENV if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

console.log('🎬 Fortune Tiles Historical Data Seeder');
console.log('=====================================\n');

console.log('📁 Current directory:', process.cwd());
console.log('🌍 Environment:', process.env.NODE_ENV);
console.log('🗄️ Database URL:', process.env.DATABASE_URL ? 'Set' : 'Using discrete vars\n');

// Confirmation prompt
console.log('⚠️  WARNING: This will clean all existing data and generate 3+ years of historical data.');
console.log('   This process may take 2-5 minutes depending on your system.\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Do you want to proceed? (yes/no): ', (answer) => {
  rl.close();
  
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    console.log('\n🚀 Starting data seeding process...\n');
    
    // Execute the seeding script
    const seedProcess = exec('node seedHistoricalData.js', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Seeding process failed:', error);
        process.exit(1);
      }
      
      if (stderr) {
        console.warn('⚠️ Warnings:', stderr);
      }
      
      console.log('\n🎉 Historical data seeding completed successfully!');
      console.log('\n📊 You can now:');
      console.log('• Start your backend: npm start');
      console.log('• Start your frontend: cd ../frontend && npm start');
      console.log('• View the dashboard with realistic business data');
      console.log('• Test all system features with 3+ years of data\n');
    });
    
    // Show real-time output
    seedProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    seedProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
  } else {
    console.log('\n❌ Seeding cancelled by user.');
    process.exit(0);
  }
});