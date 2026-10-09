// Sync test: two real servers, each with its own database, syncing through a local stand-in for Supabase.
// Run with `npm run test:sync`.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { createMockSupabase } = require('./support/mock-supabase');

const APP_SECRET = 'test-app-secret';
const API_KEY = 'test-publishable-key';
let fails = 0;
const check = (name, cond, extra) => {
  if (cond) console.log('PASS', name);
  else { fails += 1; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); }
};
const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startDevice(name, cloudPort, secret = APP_SECRET) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `ft-sync-${name}-`));
  const port = await freePort();
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, DATA_DIR: dir, PORT: String(port), NODE_ENV: 'production', SYNC_URL: `http://127.0.0.1:${cloudPort}`, SYNC_KEY: API_KEY, SYNC_SECRET: secret, SYNC_AUTOSTART: '0' },
    stdio: 'ignore',
  });
  const note = path.join(dir, 'FIRST-RUN-ADMIN.txt');
  for (let i = 0; i < 80 && !fs.existsSync(note); i++) await sleep(250);
  await sleep(600);
  const password = fs.readFileSync(note, 'utf8').match(/Password: (.+)/)[1].trim();
  const base = `http://127.0.0.1:${port}`;
  let token = '';
  const call = async (method, p, body, tk) => {
    const res = await fetch(`${base}/api${p}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk || token}` }, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await res.json(); } catch (_) { /* none */ }
    return { status: res.status, data };
  };
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password }) });
  token = (await login.json()).token;
  return { name, dir, proc, call, base, stop: () => { proc.kill(); fs.rmSync(dir, { recursive: true, force: true }); } };
}

const run = (d) => d.call('POST', '/sync/run');
const connect = run; // a device links itself the first time it syncs
const choose = (d, choice) => d.call('POST', '/sync/choose', { choice });
const stockOf = async (d, productId) => {
  const r = await d.call('GET', `/inventory?productId=${productId}&limit=500`);
  return (r.data.inventory || []).filter((i) => i.productId === productId).reduce((n, i) => n + Number(i.quantitySqm), 0);
};

(async () => {
  const cloud = createMockSupabase({ appSecret: APP_SECRET, apiKey: API_KEY });
  const cloudPort = await cloud.listen();
  const A = await startDevice('desktop', cloudPort);
  const B = await startDevice('pos', cloudPort);
  try {
    // ---- device A has data before sync is ever switched on
    let r = await A.call('GET', '/locations');
    const loc = r.data.locations[0];
    r = await A.call('POST', '/products', { name: 'Marble Tile', price: 100, categories: ['Marble'], unitOfMeasure: 'sqm', initialLocation: loc.id, initialQuantity: 50, imageUrl: 'data:image/png;base64,' + 'A'.repeat(3000) });
    const p1 = r.data.product;
    r = await A.call('POST', '/products', { name: 'Granite Slab', price: 40, categories: ['Granite'], unitOfMeasure: 'pcs', initialLocation: loc.id, initialQuantity: 20 });
    const p2 = r.data.product;
    r = await A.call('POST', '/sales', { locationId: loc.id, customerName: 'Early Customer', paymentMethod: 'cash', subtotalAmount: 200, items: [{ productId: p1.id, quantity: 2, unitPrice: 100 }] });
    check('A: sale before sync', r.status === 201 || r.status === 200, r);
    r = await A.call('POST', '/users', { firstName: 'Cash', lastName: 'Ier', username: 'cashier', password: 'abc123', role: 'staff', locationId: loc.id });
    check('A: staff user', r.status === 201, r);
    const staffId = r.data.user.id;

    // ---- connecting
    r = await A.call('GET', '/sync/status');
    check('before its first sync the device says it is setting up', r.status === 200 && r.data.state === 'connecting' && !r.data.connected, r.data);
    // an empty device must not register itself in an empty cloud
    const F = await startDevice('fresh', cloudPort);
    r = await run(F);
    check('a brand-new empty device waits instead of uploading its starter data', r.status === 200 && r.data.waiting === true && cloud.records.size === 0, [r.data, cloud.records.size]);
    r = await F.call('GET', '/sync/status');
    check('...and says so', r.data.state === 'waiting' && !r.data.connected, r.data);
    F.stop();
    const W = await startDevice('wrongkey', cloudPort, 'not-the-shop-key');
    r = await run(W);
    check('a device without the shop key cannot link or write', r.data.failed === true || r.data.connected !== true, r.data);
    check('...and nothing it tried reached the cloud', cloud.records.size === 0, cloud.records.size);
    W.stop();
    r = await connect(A);
    check('A links itself on its first sync and uploads its data', r.status === 200 && r.data.connected && r.data.role === 'first', r);
    check('A has device number 1', r.data.status.deviceNo === 1, r.data.status);
    check('A is up to date', r.data.status.state === 'synced' && r.data.status.pending === 0, r.data.status);
    check('built-in admin is not uploaded', ![...cloud.records.values()].some((x) => x.table_name === 'users' && x.data && x.data.email === 'admin@fortunetiles.local'));
    check('staff user is uploaded', [...cloud.records.values()].some((x) => x.table_name === 'users' && x.data && x.data.username === 'cashier'));

    r = await connect(B);
    check('B (empty) joins and takes the cloud data', r.status === 200 && r.data.role === 'joined', r);
    check('B has device number 2', r.data.status.deviceNo === 2, r.data.status);
    check('B is up to date right after joining (nothing waiting)', r.data.status.state === 'synced' && r.data.status.pending === 0, r.data.status);
    r = await B.call('GET', '/products?limit=100');
    check('B sees both products', r.data.products.length === 2, r.data.products.map((p) => p.name));
    check('B sees the photo as a link', (r.data.products.find((p) => p.name === 'Marble Tile') || {}).imageUrl, r.data.products[0]);
    check('B stock for product 1 = 48', (await stockOf(B, p1.id)) === 48, await stockOf(B, p1.id));
    check('B stock for product 2 = 20', (await stockOf(B, p2.id)) === 20);
    r = await B.call('GET', '/orders');
    check('B sees the early sale', Array.isArray(r.data) && r.data.length === 1 && r.data[0].customerName === 'Early Customer', r.data);
    const bLogin = await fetch(`${B.base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'cashier', password: 'abc123' }) });
    check('staff created on A can sign in on B', bLogin.status === 200, bLogin.status);

    // ---- both devices work offline at the same time
    const locB = (await B.call('GET', '/locations')).data.locations[0];
    r = await A.call('POST', '/sales', { locationId: loc.id, customerName: 'A customer', paymentMethod: 'cash', subtotalAmount: 300, items: [{ productId: p1.id, quantity: 3, unitPrice: 100 }] });
    check('A sells 3 offline', r.status === 201 || r.status === 200, r);
    r = await B.call('POST', '/sales', { locationId: locB.id, customerName: 'B customer', paymentMethod: 'card', subtotalAmount: 200, items: [{ productId: p1.id, quantity: 2, unitPrice: 100 }] });
    check('B sells 2 offline', r.status === 201 || r.status === 200, r);
    const bSaleId = r.data.sale.id;
    check('B new ids come from its own range', bSaleId >= 20000000, bSaleId);
    r = await A.call('GET', '/sync/status');
    check('A shows changes waiting', r.data.state === 'pending' && r.data.pending > 0, r.data);
    await run(A); await run(B); await run(A);
    check('stock agrees on A: 50-2-3-2 = 43', (await stockOf(A, p1.id)) === 43, await stockOf(A, p1.id));
    check('stock agrees on B: 43', (await stockOf(B, p1.id)) === 43, await stockOf(B, p1.id));
    r = await A.call('GET', '/orders');
    check('A sees all 3 sales', r.data.length === 3, r.data.length);
    r = await B.call('GET', '/orders');
    check('B sees all 3 sales', r.data.length === 3, r.data.length);
    r = await B.call('GET', `/orders/${bSaleId}`);
    check('sale items travelled with the sale', r.status === 200 && (r.data.items || []).length === 1, r.data);

    // ---- the same product edited on both: the later edit wins
    r = await A.call('GET', `/products/${p2.id}`);
    await A.call('PUT', `/products/${p2.id}`, { price: 45, version: r.data.product.version });
    await sleep(1200);
    r = await B.call('GET', `/products/${p2.id}`);
    r = await B.call('PUT', `/products/${p2.id}`, { price: 55, version: r.data.product.version });
    check('B edits the price later', r.status === 200, r);
    await run(A); await run(B); await run(A);
    check('later edit wins on A', Number((await A.call('GET', `/products/${p2.id}`)).data.product.price) === 55);
    check('later edit wins on B', Number((await B.call('GET', `/products/${p2.id}`)).data.product.price) === 55);

    // ---- stock changes made another way (return, manual receive) travel too
    r = await A.call('POST', '/inventory/log', { productId: p2.id, locationId: loc.id, changeType: 'received', changeAmount: 10, notes: 'delivery' });
    check('A receives 10', r.status === 200 || r.status === 201, r);
    const saleA = (await A.call('GET', '/orders')).data.find((o) => o.customerName === 'A customer');
    const detail = (await A.call('GET', `/sales/${saleA.id}`)).data.sale;
    r = await A.call('POST', '/returns', { saleId: saleA.id, returnType: 'refund', reason: 'damaged', refundMethod: 'cash', items: [{ saleItemId: (detail.items || detail.saleItems)[0].id, quantity: 1, condition: 'damaged', returnReason: 'cracked' }] });
    check('A processes a return of 1', r.status === 201 || r.status === 200, r);
    await run(A); await run(B);
    check('return put the stock back (43+1 = 44) on A', (await stockOf(A, p1.id)) === 44, await stockOf(A, p1.id));
    check('return and delivery reached B: 44 and 30', (await stockOf(B, p1.id)) === 44 && (await stockOf(B, p2.id)) === 30, [await stockOf(B, p1.id), await stockOf(B, p2.id)]);
    r = await B.call('GET', '/returns');
    check('B sees the return', (r.data.returns || []).length === 1, r.data);

    // ---- deletions
    r = await A.call('DELETE', `/users/${staffId}`);
    check('A deletes the staff user', r.status === 200, r);
    await run(A); await run(B);
    const gone = await fetch(`${B.base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'cashier', password: 'abc123' }) });
    check('a removed user can no longer sign in on B', gone.status === 401 || gone.status === 403, gone.status);
    r = await A.call('DELETE', `/products/${p2.id}`);
    await run(A); await run(B);
    r = await B.call('GET', '/products?limit=100');
    check('archived product disappears on B', r.data.products.length === 1, r.data.products.map((p) => p.name));

    // ---- a nothing-to-do sync stays quiet
    const pushesBefore = cloud.stats.pushes;
    await run(A); await run(B);
    check('syncing again with no changes pushes nothing', cloud.stats.pushes === pushesBefore, [pushesBefore, cloud.stats.pushes]);

    // ---- connection trouble
    cloud.close();
    r = await A.call('POST', '/products', { name: 'Offline Tile', price: 5, categories: ['General'], unitOfMeasure: 'pcs', initialLocation: loc.id, initialQuantity: 5 });
    r = await run(A);
    r = await A.call('GET', '/sync/status');
    check('with the cloud unreachable the device says offline and keeps the change', r.data.state === 'offline' && r.data.pending > 0, r.data);
    check('selling still works offline', (await A.call('POST', '/sales', { locationId: loc.id, customerName: 'Offline sale', paymentMethod: 'cash', subtotalAmount: 100, items: [{ productId: p1.id, quantity: 1, unitPrice: 100 }] })).status < 300);
  } catch (e) {
    fails += 1;
    console.log('CRASH', e);
  } finally {
    A.stop(); B.stop();
    cloud.close();
  }

  // ---- a device that already has data meets a cloud that already has data
  const cloud2 = createMockSupabase({ appSecret: APP_SECRET, apiKey: API_KEY });
  const port2 = await cloud2.listen();
  const C = await startDevice('c', port2);
  const D = await startDevice('d', port2);
  const E = await startDevice('e', port2);
  try {
    const lc = (await C.call('GET', '/locations')).data.locations[0];
    await C.call('POST', '/products', { name: 'C Tile', price: 1, categories: ['General'], unitOfMeasure: 'pcs', initialLocation: lc.id, initialQuantity: 5 });
    const ld = (await D.call('GET', '/locations')).data.locations[0];
    await D.call('POST', '/products', { name: 'D Tile', price: 2, categories: ['General'], unitOfMeasure: 'pcs', initialLocation: ld.id, initialQuantity: 7 });
    const le = (await E.call('GET', '/locations')).data.locations[0];
    await E.call('POST', '/products', { name: 'E Tile', price: 3, categories: ['General'], unitOfMeasure: 'pcs', initialLocation: le.id, initialQuantity: 9 });
    let r = await connect(C);
    check('C uploads', r.data.role === 'first', r);
    r = await connect(D);
    check('D (has its own data) is asked before anything is replaced', r.status === 200 && r.data.needsChoice === true, r);
    r = await D.call('GET', '/sync/status');
    check('D shows that a choice is needed', r.data.state === 'needs_choice', r.data);
    r = await run(D);
    check('D does not guess on later syncs either', r.data.needsChoice === true, r.data);
    r = await D.call('GET', '/products?limit=100');
    check('D kept its data while undecided', r.data.products.length === 1 && r.data.products[0].name === 'D Tile', r.data);
    r = await choose(D, 'use-cloud');
    check('D takes the cloud data', r.data.connected && r.data.role === 'joined', r);
    r = await D.call('GET', '/products?limit=100');
    check('D now has C\'s product only', r.data.products.length === 1 && r.data.products[0].name === 'C Tile', r.data.products.map((p) => p.name));
    r = await connect(E);
    check('E is asked too', r.data.needsChoice === true, r);
    r = await choose(E, 'use-device');
    check('E chooses to keep its own data over the cloud\'s', r.data.connected && r.data.role === 'first', r);
    check('the cloud now holds E\'s data, not C\'s', [...cloud2.records.values()].some((x) => x.table_name === 'products' && x.data && x.data.name === 'E Tile') && ![...cloud2.records.values()].some((x) => x.table_name === 'products' && x.data && x.data.name === 'C Tile'));
  } catch (e) {
    fails += 1;
    console.log('CRASH', e);
  } finally {
    C.stop(); D.stop(); E.stop(); cloud2.close();
  }

  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
