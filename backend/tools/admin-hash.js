// Usage: node tools/admin-hash.js "<password>"
// Prints a bcrypt hash to paste into config/defaultAdmin.json as "passwordHash".
const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: node tools/admin-hash.js "<password of at least 12 characters>"');
  process.exit(1);
}
bcrypt.hash(password, 12).then((hash) => console.log(hash));
