const { User, sequelize } = require('./models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
      order: [['id', 'ASC']]
    });
    
    console.log('\n📋 Available User Accounts:');
    console.log('============================');
    users.forEach(user => {
      const status = user.isActive ? '✅ Active' : '❌ Inactive';
      console.log(`ID: ${user.id} | ${user.firstName} ${user.lastName} | ${user.email} | Role: ${user.role} | ${status}`);
    });
    
    console.log(`\n📊 Total users: ${users.length}`);
    
    if (users.length === 0) {
      console.log('\n⚠️  No users found. You may need to seed the database first.');
      console.log('Run: npm run seed or check your seeding scripts.');
    } else {
      console.log('\n💡 You can test user deletion with any of the accounts above.');
      console.log('Use the user ID in your API calls: DELETE /api/users/{ID}');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Make sure your database is running and properly configured.');
    process.exit(1);
  }
})();