// Test-only low-level driver backed by the real sqlite3 module (used to run the backend checks in Node).
const sqlite3 = require('sqlite3');

function createNodeDriver(file = ':memory:') {
  const db = new sqlite3.Database(file);
  return {
    db,
    run: (sql, values) => new Promise((resolve, reject) => db.run(sql, values, function (err) {
      if (err) reject(err); else resolve({ changes: this.changes, lastId: this.lastID });
    })),
    all: (sql, values) => new Promise((resolve, reject) => db.all(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)))),
    begin: () => new Promise((resolve, reject) => db.run('BEGIN', (e) => (e ? reject(e) : resolve()))),
    commit: () => new Promise((resolve, reject) => db.run('COMMIT', (e) => (e ? reject(e) : resolve()))),
    rollback: () => new Promise((resolve, reject) => db.run('ROLLBACK', (e) => (e ? reject(e) : resolve()))),
    close: () => new Promise((resolve) => db.close(() => resolve())),
  };
}
module.exports = { createNodeDriver };
