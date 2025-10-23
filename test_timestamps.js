const { User } = require('./models');
User.findOne()
.then(user => console.log('✅ SUCCESS: Users table has timestamps and works!'))
.catch(err => console.error('❌ FAILED:', err.message));