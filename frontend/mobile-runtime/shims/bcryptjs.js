// bcryptjs with a work-factor ceiling: the terminal's CPU is slow, and a cost of 12 would take seconds
// per login. Existing hashes with a higher cost still verify (the cost is stored inside the hash).
const bcrypt = require('../../node_modules/bcryptjs/umd/index.js');

const MAX_ROUNDS = 10;
const clamp = (r) => (typeof r === 'number' ? Math.min(r, MAX_ROUNDS) : r);

module.exports = {
  ...bcrypt,
  hash: (s, salt, cb, progress) => bcrypt.hash(s, clamp(salt), cb, progress),
  hashSync: (s, salt) => bcrypt.hashSync(s, clamp(salt)),
  genSalt: (rounds, ...rest) => bcrypt.genSalt(clamp(rounds), ...rest),
  genSaltSync: (rounds, ...rest) => bcrypt.genSaltSync(clamp(rounds), ...rest),
};
module.exports.default = module.exports;
