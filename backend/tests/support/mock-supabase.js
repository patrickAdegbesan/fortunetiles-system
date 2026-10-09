// A small stand-in for the Supabase project, mirroring the SQL in sync/supabase-setup.sql, so the sync can be tested
// without a network. Only an account that signed in (not the public key alone) can read or write.
const http = require('http');

function createMockSupabase({ appSecret, apiKey }) {
  const records = new Map(); // "table:id" -> record
  let seq = 0;
  let devices = 0;
  let tokenCounter = 0;
  const stats = { pushes: 0, pulls: 0 };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://mock');
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      // Like the real service, answer cross-origin requests from the app's web view.
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info, x-fortune-key', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
      const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', ...cors }); res.end(JSON.stringify(data)); };
      const json = body ? JSON.parse(body) : {};
      if (req.headers.apikey !== apiKey) return send(401, { message: 'Invalid API key' });

      // Without the shop's app key nothing is readable or writable.
      if (req.headers['x-fortune-key'] !== appSecret) return send(url.pathname.includes('/rpc/') ? 400 : 200, url.pathname.includes('/rpc/') ? { message: 'not allowed' } : []);

      if (url.pathname === '/rest/v1/rpc/sync_register_device') { devices += 1; return send(200, devices); }

      if (url.pathname === '/rest/v1/rpc/sync_clear') { const n = records.size; records.clear(); return send(200, n); }

      if (url.pathname === '/rest/v1/rpc/sync_push') {
        stats.pushes += 1;
        for (const r of json.records) {
          const key = `${r.t}:${r.id}`;
          const existing = records.get(key);
          if (existing && new Date(existing.updated_at) > new Date(r.ts)) continue; // an older edit never replaces a newer one
          seq += 1;
          records.set(key, { table_name: r.t, row_id: r.id, data: r.d || null, deleted: !!r.del, updated_at: r.ts, device_no: json.device, seq });
        }
        return send(200, json.records.length);
      }

      if (url.pathname === '/rest/v1/sync_records') {
        stats.pulls += 1;
        const after = Number((url.searchParams.get('seq') || 'gt.0').replace('gt.', ''));
        const limit = Number(url.searchParams.get('limit') || 1000);
        const rows = [...records.values()].filter((r) => r.seq > after).sort((a, b) => a.seq - b.seq).slice(0, limit);
        return send(200, rows);
      }
      return send(404, { message: 'not found' });
    });
  });

  return {
    stats,
    records,
    listen: (port = 0) => new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server.address().port))),
    close: () => server.close(),
  };
}

module.exports = { createMockSupabase };
