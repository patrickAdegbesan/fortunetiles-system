const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('exports/heroku-data-export-2025-10-20T23-07-15-026Z.json', 'utf8'));
  const activities = data.data.user_activities;

  if (activities && activities.length > 0) {
    console.log('First user_activity record:');
    console.log(JSON.stringify(activities[0], null, 2));

    // Check if any records have user_id instead of userId
    const hasUserId = activities.some(a => a.userId !== undefined);
    const hasUser_id = activities.some(a => a.user_id !== undefined);

    console.log(`\nField analysis:`);
    console.log(`Records with 'userId': ${activities.filter(a => a.userId !== undefined).length}`);
    console.log(`Records with 'user_id': ${activities.filter(a => a.user_id !== undefined).length}`);
  } else {
    console.log('No user_activities found');
  }
} catch (error) {
  console.error('Error:', error.message);
}