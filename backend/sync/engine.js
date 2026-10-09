// Two-way sync between this device's local SQLite database and the shared Supabase project.
//
// The app stays fully offline-first: every write goes to the local database as always. SQLite triggers note which
// rows changed (sync_queue); the engine pushes those rows to the cloud and pulls rows other devices changed.
//
//  - Record ids: each device gets a number (1, 2, ...) and creates new ids in its own range (number x 10,000,000),
//    so two devices can never create the same id while offline.
//  - Stock: a device never copies another device's stock totals. Every stock change is an inventory log row with
//    a +/- amount; incoming logs are added to the local stock, so two devices selling at once both count.
//  - Everything else: the most recent edit (updated_at) wins. Sales and their items never change after they are made.
//  - The built-in admin account is never synced: it exists separately on every device.
//  - No login: every request carries the shop's app key (config/sync.secret.json), which the cloud checks. A device links
//    itself the first time it has internet, then keeps syncing on its own. Only when a device already holds data and the
//    cloud does too is the owner asked which of the two to keep.
const config = require('../config/sync.json');
let fileSecret = '';
try { fileSecret = require('../config/sync.secret.json').appSecret || ''; } catch (_) { /* not present: a test cloud supplies its own */ }
const defaults = require('../config/defaultAdmin.json');

const ID_RANGE = 10000000;
const PAGE = 100;
const PUSH_BYTES = 1500000;
const INTERVAL_MS = 15000;

// rank = the order rows must arrive in (parents before children); mode: lww = last edit wins, append = never changes
// once created, log = stock history (also adjusts stock).
const TABLES = [
  { name: 'locations', rank: 0, mode: 'lww' },
  { name: 'product_types', rank: 0, mode: 'lww' },
  { name: 'categories', rank: 0, mode: 'lww', naturalKey: 'name' },
  { name: 'global_attributes', rank: 0, mode: 'lww', naturalKey: 'name' },
  { name: 'users', rank: 1, mode: 'lww' },
  { name: 'products', rank: 1, mode: 'lww' },
  { name: 'sales', rank: 2, mode: 'append' },
  { name: 'returns', rank: 3, mode: 'lww' },
  { name: 'sale_items', rank: 3, mode: 'append' },
  { name: 'return_items', rank: 4, mode: 'append' },
  { name: 'inventory_logs', rank: 4, mode: 'log' },
];
const BY_NAME = Object.fromEntries(TABLES.map((t) => [t.name, t]));

// Order used when emptying a device before it adopts the cloud's data (children first).
const WIPE_ORDER = ['return_items', 'returns', 'sale_items', 'sales', 'inventory_logs', 'inventory', 'products', 'product_types'];

/** Parses the several timestamp formats found in the database into milliseconds. */
function parseTs(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  let s = String(value).trim();
  s = s.replace(/^(\d{4}-\d\d-\d\d) /, '$1T').replace(/ ([+-]\d\d:\d\d)$/, '$1');
  if (!/(Z|[+-]\d\d:\d\d)$/.test(s)) s += 'Z';
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? 0 : ms;
}

function createSyncEngine({ sequelize, fetchImpl, now = () => Date.now(), setTimer = setInterval, clearTimer = clearInterval }) {
  const doFetch = fetchImpl || ((...a) => fetch(...a));
  // SYNC_URL / SYNC_KEY (or window.__FT_SYNC_URL__ / __FT_SYNC_KEY__ in the app) point the engine at a test cloud.
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  let url = '';
  let apiKey = '';
  let appSecret = '';
  const readConfig = () => {
    url = (g.__FT_SYNC_URL__ || process.env.SYNC_URL || config.url || '').replace(/\/$/, '');
    apiKey = g.__FT_SYNC_KEY__ || process.env.SYNC_KEY || config.publishableKey;
    appSecret = g.__FT_SYNC_SECRET__ || process.env.SYNC_SECRET || fileSecret;
  };
  readConfig();

  let schemaReady = false;
  let running = null;
  let timer = null;
  const memo = { online: null, lastError: null, syncing: false, needsChoice: false, connecting: false };

  const q = (sql, replacements) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
  const exec = (sql, replacements) => sequelize.query(sql, { replacements });

  /* ------------------------------------------------------------------ local bookkeeping */
  async function ensureSchema() {
    readConfig();
    if (schemaReady) return;
    await exec('CREATE TABLE IF NOT EXISTS sync_state (k TEXT PRIMARY KEY, v TEXT)');
    await exec('CREATE TABLE IF NOT EXISTS sync_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, tbl TEXT NOT NULL, row_id INTEGER NOT NULL, op TEXT NOT NULL)');
    await exec('CREATE TABLE IF NOT EXISTS sync_applied (tbl TEXT NOT NULL, row_id INTEGER NOT NULL, ts TEXT, PRIMARY KEY (tbl, row_id))');
    schemaReady = true;
    const [connected] = await q("SELECT v FROM sync_state WHERE k = 'connected'");
    if (connected && connected.v === '1') await installTriggers(); // picks up trigger changes after an update
  }
  async function getState(key) {
    await ensureSchema();
    const rows = await q('SELECT v FROM sync_state WHERE k = ?', [key]);
    return rows.length ? rows[0].v : null;
  }
  async function setState(key, value) {
    await ensureSchema();
    if (value == null) await exec('DELETE FROM sync_state WHERE k = ?', [key]);
    else await exec('INSERT INTO sync_state (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', [key, String(value)]);
  }

  async function installTriggers() {
    const adminEmail = String(defaults.email).replace(/'/g, "''");
    for (const t of TABLES) {
      // The built-in admin exists separately on every device and is never synced, so its changes are not tracked.
      const skipAdmin = (row) => (t.name === 'users' ? ` WHEN ${row}.email <> '${adminEmail}'` : '');
      for (const [suffix, event, row, op] of [['ai', 'INSERT', 'NEW', 'U'], ['au', 'UPDATE', 'NEW', 'U'], ['ad', 'DELETE', 'OLD', 'D']]) {
        await exec(`DROP TRIGGER IF EXISTS sync_${t.name}_${suffix}`);
        await exec(`CREATE TRIGGER sync_${t.name}_${suffix} AFTER ${event} ON ${t.name}${skipAdmin(row)} BEGIN INSERT INTO sync_queue (tbl, row_id, op) VALUES ('${t.name}', ${row}.id, '${op}'); END`);
      }
    }
  }

  async function enqueueEverything() {
    for (const t of TABLES) await exec(`INSERT INTO sync_queue (tbl, row_id, op) SELECT '${t.name}', id, 'U' FROM ${t.name}`);
  }

  async function reserveIdRange(deviceNo) {
    const base = deviceNo * ID_RANGE;
    for (const t of TABLES) {
      await exec('UPDATE sqlite_sequence SET seq = ? WHERE name = ? AND seq < ?', [base, t.name, base]);
      await exec('INSERT INTO sqlite_sequence (name, seq) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = ?)', [t.name, base, t.name]);
    }
  }

  /** Stock that no log row explains becomes a log row, so the cloud's history adds up to what is on the shelf. */
  async function writeStockBaseline() {
    const rows = await q(`SELECT i.id, i.productId AS productId, i.locationId AS locationId, i.quantitySqm AS qty,
        COALESCE((SELECT SUM(changeAmount) FROM inventory_logs l WHERE l.productId = i.productId AND l.locationId = i.locationId), 0) AS logged
        FROM inventory i`);
    for (const r of rows) {
      const diff = Number(r.qty) - Number(r.logged);
      if (Math.abs(diff) < 1e-9) continue;
      const stamp = new Date(now()).toISOString();
      await exec(`INSERT INTO inventory_logs (uuid, version, productId, locationId, changeType, changeAmount, previousQuantity, newQuantity, notes, userId, created_at, updated_at)
        VALUES (?, 0, ?, ?, 'adjusted', ?, ?, ?, 'Sync baseline', NULL, ?, ?)`,
      [`baseline-${r.id}-${now()}`, r.productId, r.locationId, diff, Number(r.logged), Number(r.qty), stamp, stamp]);
    }
  }

  async function wipeLocalBusinessData() {
    for (const name of WIPE_ORDER) await exec(`DELETE FROM ${name}`);
    await exec('DELETE FROM users WHERE email <> ?', [defaults.email]);
    await exec('UPDATE users SET locationId = NULL');
    for (const name of ['locations', 'categories', 'global_attributes']) await exec(`DELETE FROM ${name}`);
    await exec('DELETE FROM sync_queue');
    await exec('DELETE FROM sync_applied');
  }

  /* ---------------------------------------------------------------------------- cloud access */
  function headers() {
    return { apikey: apiKey, 'x-fortune-key': appSecret, 'Content-Type': 'application/json' };
  }
  async function cloud(path, options = {}) {
    readConfig();
    const res = await doFetch(`${url}${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!res.ok) {
      const err = new Error((data && (data.message || data.error)) || `Cloud error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ----------------------------------------------------------------------------------- push */
  async function push() {
    const deviceNo = Number(await getState('device_no'));
    const queued = await q('SELECT id, tbl, row_id, op FROM sync_queue ORDER BY id');
    if (!queued.length) return 0;
    const latest = new Map();
    let maxId = 0;
    for (const item of queued) { latest.set(`${item.tbl}:${item.row_id}`, item); maxId = Math.max(maxId, item.id); }

    const records = [];
    for (const item of latest.values()) {
      const table = BY_NAME[item.tbl];
      if (!table) continue;
      if (item.op === 'D') {
        const applied = await q('SELECT ts FROM sync_applied WHERE tbl = ? AND row_id = ?', [item.tbl, item.row_id]);
        if (applied.length && applied[0].ts === 'DELETED') continue; // we deleted it because the cloud said so
        records.push({ t: item.tbl, id: item.row_id, del: true, ts: new Date(now()).toISOString(), rank: table.rank });
        continue;
      }
      const rows = await q(`SELECT * FROM ${item.tbl} WHERE id = ?`, [item.row_id]);
      if (!rows.length) continue;
      const row = rows[0];
      if (item.tbl === 'users' && row.email === defaults.email) continue;
      const applied = await q('SELECT ts FROM sync_applied WHERE tbl = ? AND row_id = ?', [item.tbl, item.row_id]);
      if (applied.length && applied[0].ts === String(row.updated_at)) continue; // came from the cloud, not an edit
      records.push({ t: item.tbl, id: item.row_id, d: row, ts: new Date(parseTs(row.updated_at) || now()).toISOString(), rank: table.rank });
    }
    records.sort((a, b) => a.rank - b.rank);

    let sent = 0;
    let chunk = [];
    let bytes = 0;
    const flush = async () => {
      if (!chunk.length) return;
      await cloud('/rest/v1/rpc/sync_push', { method: 'POST', body: JSON.stringify({ records: chunk.map(({ rank, ...r }) => r), device: deviceNo }) });
      sent += chunk.length;
      chunk = [];
      bytes = 0;
    };
    for (const r of records) {
      const size = JSON.stringify(r).length;
      if (chunk.length && (bytes + size > PUSH_BYTES || chunk.length >= 50)) await flush();
      chunk.push(r);
      bytes += size;
    }
    await flush();
    await exec('DELETE FROM sync_queue WHERE id <= ?', [maxId]);
    return sent;
  }

  /* ----------------------------------------------------------------------------------- pull */
  let columnCache = {};
  async function columnsOf(table) {
    if (!columnCache[table]) columnCache[table] = (await q(`PRAGMA table_info(${table})`)).map((c) => c.name);
    return columnCache[table];
  }

  async function applyLog(row) {
    const exists = await q('SELECT id FROM inventory_logs WHERE id = ?', [row.id]);
    if (exists.length) return;
    const cols = await columnsOf('inventory_logs');
    const keys = Object.keys(row).filter((k) => cols.includes(k));
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(`INSERT INTO inventory_logs (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, { replacements: keys.map((k) => row[k]), transaction });
      const delta = Number(row.changeAmount) || 0;
      const stock = await sequelize.query('SELECT id FROM inventory WHERE productId = ? AND locationId = ?', { replacements: [row.productId, row.locationId], type: sequelize.QueryTypes.SELECT, transaction });
      const stamp = new Date(now()).toISOString();
      if (stock.length) {
        await sequelize.query('UPDATE inventory SET quantitySqm = quantitySqm + ?, updated_at = ? WHERE id = ?', { replacements: [delta, stamp, stock[0].id], transaction });
      } else {
        await sequelize.query('INSERT INTO inventory (uuid, version, productId, locationId, quantitySqm, created_at, updated_at) VALUES (?, 0, ?, ?, ?, ?, ?)',
          { replacements: [`sync-${row.productId}-${row.locationId}-${now()}`, row.productId, row.locationId, delta, stamp, stamp], transaction });
      }
    });
  }

  /** Applies one cloud record to the local database. Throws on foreign-key trouble so the caller can retry later. */
  async function applyRecord(rec) {
    const table = BY_NAME[rec.table_name];
    if (!table) return 'skipped';
    const id = Number(rec.row_id);
    if (rec.deleted) {
      await exec(`DELETE FROM ${table.name} WHERE id = ?`, [id]);
      await exec('INSERT INTO sync_applied (tbl, row_id, ts) VALUES (?, ?, ?) ON CONFLICT(tbl, row_id) DO UPDATE SET ts = excluded.ts', [table.name, id, 'DELETED']);
      return 'deleted';
    }
    const row = rec.data || {};
    if (table.name === 'users' && row.email === defaults.email) return 'skipped';
    if (table.mode === 'log') {
      await applyLog({ ...row, id });
      await exec('INSERT INTO sync_applied (tbl, row_id, ts) VALUES (?, ?, ?) ON CONFLICT(tbl, row_id) DO UPDATE SET ts = excluded.ts', [table.name, id, String(row.updated_at)]);
      return 'applied';
    }

    const cols = await columnsOf(table.name);
    const keys = Object.keys(row).filter((k) => cols.includes(k) && k !== 'id');
    const local = await q(`SELECT updated_at FROM ${table.name} WHERE id = ?`, [id]);
    let applied = false;
    if (!local.length) {
      try {
        await exec(`INSERT INTO ${table.name} (id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`, [id, ...keys.map((k) => row[k])]);
        applied = true;
      } catch (err) {
        if (/UNIQUE/i.test(String(err.message)) || (err.parent && /UNIQUE/i.test(String(err.parent.message)))) return 'conflict'; // same name made on two devices
        throw err;
      }
    } else if (table.mode === 'lww' && parseTs(row.updated_at) > parseTs(local[0].updated_at)) {
      try {
        await exec(`UPDATE ${table.name} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => row[k]), id]);
        applied = true;
      } catch (err) {
        if (/UNIQUE/i.test(String(err.message)) || (err.parent && /UNIQUE/i.test(String(err.parent.message)))) return 'conflict';
        throw err;
      }
    }
    if (applied) {
      const fresh = await q(`SELECT updated_at FROM ${table.name} WHERE id = ?`, [id]);
      await exec('INSERT INTO sync_applied (tbl, row_id, ts) VALUES (?, ?, ?) ON CONFLICT(tbl, row_id) DO UPDATE SET ts = excluded.ts', [table.name, id, String(fresh[0].updated_at)]);
      return 'applied';
    }
    return 'unchanged';
  }

  /** Rows that arrived from the cloud also trip the change-tracking triggers; they are not local edits, so drop them. */
  async function pruneEchoes() {
    for (const t of TABLES) {
      await exec(`DELETE FROM sync_queue WHERE tbl = '${t.name}' AND op = 'U' AND EXISTS (
        SELECT 1 FROM sync_applied a JOIN ${t.name} r ON r.id = a.row_id
        WHERE a.tbl = '${t.name}' AND a.row_id = sync_queue.row_id AND a.ts = CAST(r.updated_at AS TEXT))`);
    }
    await exec("DELETE FROM sync_queue WHERE op = 'D' AND EXISTS (SELECT 1 FROM sync_applied a WHERE a.tbl = sync_queue.tbl AND a.row_id = sync_queue.row_id AND a.ts = 'DELETED')");
  }

  async function pull() {
    const deviceNo = Number(await getState('device_no'));
    let cursor = Number((await getState('last_seq')) || 0);
    let received = 0;
    for (;;) {
      const page = await cloud(`/rest/v1/sync_records?select=table_name,row_id,data,deleted,updated_at,device_no,seq&seq=gt.${cursor}&order=seq.asc&limit=${PAGE}`);
      if (!page || !page.length) break;
      const todo = page.filter((r) => r.device_no !== deviceNo).sort((a, b) => (BY_NAME[a.table_name]?.rank ?? 9) - (BY_NAME[b.table_name]?.rank ?? 9) || a.seq - b.seq);
      let pending = todo;
      for (let pass = 0; pass < 3 && pending.length; pass += 1) {
        const failed = [];
        for (const rec of pending) {
          try { await applyRecord(rec); received += 1; } catch (err) { failed.push(rec); memo.lastError = err.message; }
        }
        pending = failed;
      }
      cursor = Math.max(cursor, ...page.map((r) => Number(r.seq)));
      await setState('last_seq', cursor);
      if (page.length < PAGE) break;
    }
    await pruneEchoes();
    return received;
  }

  /* ---------------------------------------------------------------------------- public API */
  async function pendingCount() {
    await ensureSchema();
    const [r] = await q('SELECT COUNT(*) AS n FROM (SELECT DISTINCT tbl, row_id FROM sync_queue)');
    return Number(r.n);
  }

  async function status() {
    const connected = (await getState('connected')) === '1';
    const pending = connected ? await pendingCount() : 0;
    let state;
    if (!connected) {
      if (memo.needsChoice) state = 'needs_choice';
      else if (memo.online === false) state = 'offline';
      else state = 'connecting';
    } else if (memo.syncing) state = 'syncing';
    else if (memo.online === false) state = 'offline';
    else if (memo.lastError && pending > 0) state = 'error';
    else state = pending > 0 ? 'pending' : 'synced';
    return {
      configured: !!(url && apiKey && appSecret),
      connected,
      state,
      pending,
      deviceNo: Number((await getState('device_no')) || 0) || null,
      lastSyncAt: await getState('last_sync_at'),
      error: memo.lastError,
    };
  }

  async function runOnce() {
    memo.syncing = true;
    memo.lastError = null;
    try {
      const pushed = await push();
      const pulled = await pull();
      memo.online = true;
      await setState('last_sync_at', new Date(now()).toISOString());
      return { pushed, pulled };
    } catch (err) {
      const network = !err.status;
      memo.online = network ? false : true;
      memo.lastError = network ? 'No internet connection' : err.message;
      throw err;
    } finally {
      memo.syncing = false;
    }
  }

  /** Pushes this device's changes and pulls everyone else's. Links the device first if that has not happened yet. */
  function run() {
    if (running) return running;
    running = (async () => {
      await ensureSchema();
      if ((await getState('connected')) !== '1') {
        if (memo.needsChoice) return { skipped: true, needsChoice: true };
        const result = await connect({ mode: 'auto' });
        return result;
      }
      return runOnce();
    })().finally(() => { running = null; });
    return running;
  }

  async function hasBusinessData() {
    const [p] = await q('SELECT COUNT(*) AS n FROM products');
    const [sa] = await q('SELECT COUNT(*) AS n FROM sales');
    const [u] = await q('SELECT COUNT(*) AS n FROM users WHERE email <> ?', [defaults.email]);
    const [l] = await q('SELECT COUNT(*) AS n FROM locations');
    return Number(p.n) + Number(sa.n) + Number(u.n) > 0 || Number(l.n) > 1;
  }

  /**
   * Links this device to the cloud. mode: 'auto' decides by itself and stops to ask only when this device and the cloud
   * both hold data; 'use-cloud' empties this device and takes the cloud's data; 'use-device' empties the cloud and
   * uploads this device's data.
   */
  async function connect({ mode = 'auto', deviceName = 'Device' } = {}) {
    await ensureSchema();
    memo.connecting = true;
    try {
      const cloudRows = await cloud('/rest/v1/sync_records?select=row_id&limit=1');
      memo.online = true;
      const cloudHasData = Array.isArray(cloudRows) && cloudRows.length > 0;
      const localHasData = await hasBusinessData();

      if (cloudHasData && localHasData && mode === 'auto') {
        memo.needsChoice = true;
        return { needsChoice: true };
      }
      memo.needsChoice = false;

      let deviceNo = Number((await getState('device_no')) || 0);
      if (!deviceNo || mode === 'use-device') {
        if (mode === 'use-device') await cloud('/rest/v1/rpc/sync_clear', { method: 'POST', body: '{}' });
        if (!deviceNo) {
          deviceNo = Number(await cloud('/rest/v1/rpc/sync_register_device', { method: 'POST', body: JSON.stringify({ device_name: deviceName }) }));
          await setState('device_no', deviceNo);
        }
      }
      await installTriggers();
      await reserveIdRange(deviceNo);
      await setState('last_seq', 0);

      const uploads = mode === 'use-device' || !cloudHasData;
      if (!uploads) {
        await wipeLocalBusinessData();
      } else {
        await writeStockBaseline();
        await exec('DELETE FROM sync_queue');
        await exec('DELETE FROM sync_applied');
        await enqueueEverything();
      }
      await setState('connected', '1');
      memo.lastError = null;
      const result = await runOnce();
      return { connected: true, role: uploads ? 'first' : 'joined', ...result };
    } catch (err) {
      const network = !err.status;
      memo.online = network ? false : memo.online;
      memo.lastError = network ? 'No internet connection' : err.message;
      throw err;
    } finally {
      memo.connecting = false;
    }
  }

  /** The owner's answer when both this device and the cloud already hold data. */
  async function choose(choice) {
    return connect({ mode: choice === 'use-device' ? 'use-device' : 'use-cloud' });
  }

  async function resync() {
    await setState('last_seq', 0);
    return run();
  }

  function start() {
    if (timer) return;
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('online', () => { run().catch(() => {}); });
    timer = setTimer(() => { run().catch(() => {}); }, INTERVAL_MS);
    if (timer && timer.unref) timer.unref();
    run().catch(() => {});
  }
  function stop() { if (timer) { clearTimer(timer); timer = null; } }

  return { status, choose, run, resync, start, stop, TABLES, parseTs };
}

module.exports = { createSyncEngine, TABLES, parseTs };
