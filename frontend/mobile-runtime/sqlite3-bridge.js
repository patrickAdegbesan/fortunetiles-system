// A drop-in replacement for the `sqlite3` module that Sequelize's SQLite dialect expects, backed by any
// low-level async driver:  { run(sql, values) -> {changes,lastId},  all(sql, values) -> rows,
//                            begin(), commit(), rollback() }
// Used on the Android app (driver = Capacitor SQLite plugin) and in Node tests (driver = sqlite3).
//
// Sequelize opens one "connection" per transaction. All of them share one real database connection here,
// so a lock makes transactions run one at a time. Plain statements (e.g. reads made without a transaction
// option while a transaction is open) are NOT blocked - the desktop's separate connections allow that too,
// and blocking them would deadlock routes that read mid-transaction.

const driverRef = { current: null };

// Android's SQLite cursor looks columns up by name but drops everything before the last "." - so a joined
// column such as `items.productId` cannot be found ("Couldn't read row 0 column -1"). Such aliases are
// renamed on the way in and restored on the way out.
const DOT = '__DOT__';

function protectDottedAliases(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) { if (sql[j + 1] === ch) { j += 2; continue; } break; }
        j++;
      }
      out += sql.slice(i, j + 1);
      i = j + 1;
    } else if (ch === '`') {
      const j = sql.indexOf('`', i + 1);
      if (j === -1) { out += sql.slice(i); break; }
      out += '`' + sql.slice(i + 1, j).split('.').join(DOT) + '`';
      i = j + 1;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

function restoreDottedKeys(rows) {
  if (!rows || !rows.length) return rows;
  const sample = Object.keys(rows[0]).filter((k) => k.includes(DOT));
  if (!sample.length) return rows;
  return rows.map((row) => {
    const o = {};
    for (const k of Object.keys(row)) o[k.includes(DOT) ? k.split(DOT).join('.') : k] = row[k];
    return o;
  });
}

/** Converts Sequelize's named binds ($1, $name) into positional ? placeholders, skipping quoted text. */
function toPositional(sql, params) {
  if (Array.isArray(params)) return { sql, values: params };
  if (!params || typeof params !== 'object') return { sql, values: [] };
  const values = [];
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) { if (sql[j + 1] === ch) { j += 2; continue; } break; }
        j++;
      }
      out += sql.slice(i, j + 1);
      i = j + 1;
    } else if (ch === '$' || ch === ':' || ch === '@') {
      const m = /^[$:@]([A-Za-z0-9_]+)/.exec(sql.slice(i));
      if (m && (Object.prototype.hasOwnProperty.call(params, ch + m[1]) || Object.prototype.hasOwnProperty.call(params, m[1]))) {
        const v = Object.prototype.hasOwnProperty.call(params, ch + m[1]) ? params[ch + m[1]] : params[m[1]];
        values.push(normalize(v));
        out += '?';
        i += m[0].length;
      } else {
        out += ch;
        i++;
      }
    } else {
      out += ch;
      i++;
    }
  }
  return { sql: out, values };
}

function normalize(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString();
  return v;
}

function fixError(err) {
  const msg = String((err && err.message) || err);
  const e = new Error(/constraint/i.test(msg) && !/^SQLITE_/.test(msg) ? `SQLITE_CONSTRAINT: ${msg}` : msg);
  e.code = (err && err.code) || (/constraint/i.test(msg) ? 'SQLITE_CONSTRAINT' : 'SQLITE_ERROR');
  e.errno = err && err.errno;
  return e;
}

const lock = { owner: null, waiters: [] };

// Wake queued work in order: statements that were only waiting for a transaction to finish run
// immediately; the next waiting transaction becomes the new owner and stops the queue.
function pump() {
  while (lock.waiters.length && lock.owner === null) {
    const w = lock.waiters.shift();
    if (w.passive) { w.resolve(); } else { lock.owner = w.conn; w.resolve(); return; }
  }
}
function acquire(conn) {
  if (lock.owner === null || lock.owner === conn) { lock.owner = conn; return Promise.resolve(); }
  return new Promise((resolve) => lock.waiters.push({ conn, resolve, passive: false }));
}
function release(conn) {
  if (lock.owner !== conn) return;
  lock.owner = null;
  pump();
}
function createSqlite3Module() {
  const OPEN_READWRITE = 2;
  const OPEN_CREATE = 4;

  class Database {
    constructor(filename, mode, cb) {
      if (typeof mode === 'function') { cb = mode; mode = undefined; }
      this.filename = filename;
      if (cb) setTimeout(() => cb.call(this, null), 0);
    }

    serialize(fn) { if (fn) fn(); return this; }
    parallelize(fn) { if (fn) fn(); return this; }
    configure() { return this; }
    close(cb) { if (cb) setTimeout(() => cb(null), 0); }

    _args(sql, params, cb) {
      if (typeof params === 'function') { cb = params; params = []; }
      return { sql, params, cb };
    }

    run(sql, params, cb) {
      const a = this._args(sql, params, cb);
      this._exec(a.sql, a.params, (err, result) => {
        if (err) return a.cb && a.cb.call({}, err);
        return a.cb && a.cb.call({ lastID: result.lastId, changes: result.changes }, null);
      }, 'run');
      return this;
    }

    all(sql, params, cb) {
      const a = this._args(sql, params, cb);
      this._exec(a.sql, a.params, (err, rows) => {
        if (err) return a.cb && a.cb.call({}, err);
        return a.cb && a.cb.call({}, null, rows);
      }, 'all');
      return this;
    }

    get(sql, params, cb) {
      const a = this._args(sql, params, cb);
      return this.all(a.sql, a.params, (err, rows) => a.cb && a.cb(err, rows && rows[0]));
    }

    exec(sql, cb) { return this.run(sql, [], function (err) { if (cb) cb(err); }); }

    async _exec(sql, params, done, kind) {
      const driver = driverRef.current;
      try {
        if (!driver) throw new Error('Database driver is not ready');
        const text = String(sql).trim();
        let result;
        if (/^BEGIN/i.test(text)) {
          await acquire(this);
          try { await driver.begin(); } catch (e) { release(this); throw e; }
          result = { changes: 0, lastId: 0 };
        } else if (/^(COMMIT|END)/i.test(text)) {
          try { await driver.commit(); } finally { release(this); }
          result = { changes: 0, lastId: 0 };
        } else if (/^ROLLBACK/i.test(text)) {
          try { await driver.rollback(); } finally { release(this); }
          result = { changes: 0, lastId: 0 };
        } else {
          const { sql: positional, values } = toPositional(protectDottedAliases(text), params);
          result = kind === 'all' ? restoreDottedKeys(await driver.all(positional, values)) : await driver.run(positional, values);
        }
        done(null, result);
      } catch (err) {
        done(fixError(err));
      }
    }
  }

  return { Database, OPEN_READWRITE, OPEN_CREATE, OPEN_FULLMUTEX: 0x00010000, verbose() { return this; } };
}

module.exports = { createSqlite3Module, driverRef, toPositional, protectDottedAliases, restoreDottedKeys };
