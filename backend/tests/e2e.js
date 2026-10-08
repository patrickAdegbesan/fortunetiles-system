// End-to-end API test (login, products, price edit, stock, checkout, history, returns, reports, users).
// Run via `npm test`, which starts a throwaway server and database.
const base = process.argv[2];
const adminPw = process.argv[3];
let token = '';
let fails = 0;

async function call(method, path, body) {
  const res = await fetch(base + '/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
}
function check(name, cond, extra) {
  if (cond) console.log('PASS', name);
  else { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

(async () => {
  let r = await call('POST', '/auth/login', { email: 'admin@fortunetiles.local', password: adminPw });
  check('login', r.status === 200 && r.data.token, r);
  token = r.data.token;

  r = await call('GET', '/locations');
  const loc = r.data.locations[0];
  check('default location', !!loc, r);
  r = await call('POST', '/locations', { name: 'Shop 2', address: 'Second shop' });
  check('create location', r.status === 201 || r.status === 200, r);
  const loc2 = r.data.location;

  // ---- add item
  r = await call('POST', '/products', {
    name: 'Carrara 60x60', price: 25.5, categories: ['Marble', 'Premium'], unitOfMeasure: 'sqm',
    supplierCode: 'SUP-1', description: 'White marble', attributes: { size: '60x60' },
    initialLocation: loc.id, initialQuantity: 100,
  });
  check('add product', r.status === 201, r);
  const p1 = r.data.product;
  r = await call('POST', '/products', {
    name: 'Granite Black', price: 40, categories: ['Granite'], unitOfMeasure: 'pcs',
    initialLocation: loc.id, initialQuantity: 20,
    imageUrl: 'data:image/png;base64,' + 'A'.repeat(2000),
  });
  check('add product with base64 image', r.status === 201, r);
  const p2 = r.data.product;

  r = await call('GET', `/products/${p1.id}`);
  check('get product', r.status === 200 && r.data.product?.name === 'Carrara 60x60', r);
  r = await call('GET', '/products?search=carrara');
  check('search product (case-insens.)', r.data.products?.length === 1, r);
  r = await call('GET', '/products?search=CARRARA&category=Marble');
  check('search + category', r.data.products?.length === 1, r);
  r = await call('GET', '/products');
  check('list products', r.data.products?.length === 2, r);

  // ---- edit price (as the UI does, sending version + updatedAt)
  r = await call('GET', `/products/${p1.id}`);
  const cur = r.data.product;
  r = await call('PUT', `/products/${p1.id}`, { ...cur, price: 30, version: cur.version, lastUpdatedAt: cur.updatedAt || cur.updated_at });
  check('edit price (full payload as UI)', r.status === 200 && Number(r.data.product?.price) === 30, r);
  r = await call('PUT', `/products/${p1.id}`, { price: 31 });
  check('edit price (price only)', r.status === 200 && Number(r.data.product?.price) === 31, r);
  r = await call('PUT', `/products/${p1.id}`, { price: 32, version: 0 });
  check('edit with stale version -> 409', r.status === 409, r);
  r = await call('PUT', `/products/${p1.id}`, { price: 30 , version: (await call('GET', `/products/${p1.id}`)).data.product.version });
  check('edit price with fresh version', r.status === 200, r);

  // ---- inventory
  r = await call('GET', '/inventory');
  check('list inventory', r.status === 200 && r.data.inventory.length === 2, r);
  r = await call('POST', '/inventory/log', { productId: p1.id, locationId: loc.id, changeType: 'received', changeAmount: 10, notes: 'delivery' });
  check('inventory receive', r.status === 200 || r.status === 201, r);
  r = await call('POST', '/inventory/log', { productId: p1.id, locationId: loc.id, changeType: 'broken', changeAmount: -2, notes: 'broken' });
  check('inventory broken', r.status === 200 || r.status === 201, r);
  r = await call('POST', '/inventory/log', { productId: p1.id, locationId: loc2.id, changeType: 'received', changeAmount: 5 });
  check('inventory at 2nd location (creates row)', r.status === 200 || r.status === 201, r);
  r = await call('GET', '/inventory/logs');
  check('inventory logs', r.status === 200 && (r.data.logs || r.data.inventoryLogs || []).length >= 3, r);
  r = await call('GET', '/inventory/low-stock?threshold=30');
  check('low stock', r.status === 200, r);

  // ---- checkout
  r = await call('POST', '/sales', {
    locationId: loc.id, customerName: 'John', customerPhone: '555', paymentMethod: 'cash',
    discountType: 'percentage', discountValue: 10, subtotalAmount: 30 * 3 + 40 * 2,
    items: [{ productId: p1.id, quantity: 3, unitPrice: 30, markupPrice: 0 }, { productId: p2.id, quantity: 2, unitPrice: 40, markupPrice: 0 }],
  });
  check('checkout', r.status === 201 || r.status === 200, r);
  const sale = r.data.sale;
  check('checkout total (10% off 170 = 153)', Number(sale?.totalAmount) === 153, sale);
  check('checkout returns items', (sale?.items || sale?.saleItems || []).length === 2, sale);

  r = await call('POST', '/sales', { locationId: loc.id, customerName: 'X', items: [{ productId: p2.id, quantity: 999, unitPrice: 40 }], subtotalAmount: 1 });
  check('checkout insufficient stock -> 400', r.status === 400, r);
  r = await call('POST', '/sales', { locationId: loc.id, customerName: 'Y', subtotalAmount: 30, items: [{ productId: p1.id, quantity: 1, unitPrice: 30 }], paymentMethod: 'card' });
  check('checkout card, no discount', r.status === 201 || r.status === 200, r);
  // product with no stock row at the selected location
  r = await call('POST', '/sales', { locationId: loc2.id, customerName: 'Z', subtotalAmount: 40, items: [{ productId: p2.id, quantity: 1, unitPrice: 40 }] });
  check('checkout, no inventory row at location -> 400 (not 500)', r.status === 400, r);
  r = await call('POST', '/sales', { locationId: loc.id, customerName: 'M', subtotalAmount: 35, items: [{ productId: p1.id, quantity: 1, unitPrice: 30, markupPrice: 5 }] });
  check('checkout with markup', r.status === 201 || r.status === 200, r);

  r = await call('GET', '/inventory?locationId=' + loc.id);
  const inv1 = r.data.inventory.find((i) => i.productId === p1.id);
  check('stock deducted (100+10-2-3-1-1=103)', Number(inv1?.quantitySqm) === 103, inv1);

  // ---- history
  r = await call('GET', '/sales');
  check('sales history', r.status === 200 && r.data.sales.length === 3, r);
  r = await call('GET', `/sales/${sale.id}`);
  check('sale detail', r.status === 200, r);
  r = await call('GET', '/orders');
  check('orders history', r.status === 200 && Array.isArray(r.data) && r.data.length >= 3, r);
  r = await call('GET', `/orders/${sale.id}`);
  check('order detail', r.status === 200, r);
  r = await call('GET', '/orders/search/John');
  check('order search', r.status === 200, r);
  r = await call('GET', '/sales?startDate=2020-01-01&endDate=2100-01-01');
  check('sales history date filter', r.status === 200, r);

  // ---- returns
  const detail = (await call('GET', `/sales/${sale.id}`)).data.sale;
  const sItems = detail.items || detail.saleItems;
  r = await call('POST', '/returns', { saleId: sale.id, returnType: 'refund', reason: 'damaged', refundMethod: 'cash', items: [{ saleItemId: sItems[0].id, quantity: 1, condition: 'damaged', returnReason: 'cracked' }] });
  check('create return', r.status === 201 || r.status === 200, r);
  const ret = r.data.return || r.data;
  r = await call('GET', '/returns');
  check('list returns', r.status === 200 && (r.data.returns || []).length === 1, r);
  const retId = (r.data.returns[0] || {}).id;
  r = await call('GET', `/returns/${retId}`);
  check('return detail', r.status === 200, r);
  r = await call('PATCH', `/returns/${retId}/status`, { status: 'APPROVED' });
  check('approve return', r.status === 200, r);

  // ---- reports/dashboard
  r = await call('GET', '/dashboard');
  check('dashboard', r.status === 200, r);
  r = await call('GET', '/dashboard?category=Marble');
  check('dashboard category', r.status === 200, r);
  for (const rep of ['sales-daily', 'inventory-valuation', 'profit-margin', 'top-products']) {
    r = await call('GET', `/reports/${rep}`);
    check('report ' + rep, r.status === 200, r);
  }
  r = await call('GET', '/reports/sales-daily?startDate=2020-01-01&endDate=2100-01-01');
  check('report sales-daily w/ dates', r.status === 200, r);

  // ---- admin data
  r = await call('POST', '/categories', { name: 'Slate' });
  check('add category', r.status === 201 || r.status === 200, r);
  r = await call('PUT', '/categories/rename', { from: 'Marble', to: 'Marbles' });
  check('rename category', r.status === 200, r);
  r = await call('GET', `/products/${p1.id}`);
  check('rename applied to product', r.data.product?.categories?.includes('Marbles'), r.data.product?.categories);
  r = await call('POST', '/global-attributes', { name: 'Finish' });
  check('add global attribute', r.status === 201 || r.status === 200, r);
  r = await call('POST', '/product-types', { name: 'Floor Tile', unitOfMeasure: 'sqm' });
  check('add product type', r.status === 201 || r.status === 200, r);
  r = await call('PUT', `/locations/${loc2.id}`, { name: 'Shop Two', address: 'x' });
  check('edit location', r.status === 200, r);

  // ---- PIN + markup
  r = await call('POST', '/auth/set-pin', { pin: '1234' });
  check('set pin', r.status === 200, r);
  r = await call('POST', '/auth/verify-pin', { pin: '1234' });
  check('verify pin', r.status === 200 && r.data.markupPrivilegeGranted, r);
  r = await call('POST', '/auth/verify-pin', { pin: '9999' });
  check('wrong pin -> 401', r.status === 401, r);

  // ---- delete product (archive) + backup + users
  r = await call('DELETE', `/products/${p2.id}`);
  check('delete/archive product', r.status === 200, r);
  r = await call('GET', '/products');
  check('archived product hidden', r.data.products.length === 1, r.data.products?.map((p) => p.name));
  r = await call('GET', '/backup/export');
  check('backup export', r.status === 200 && r.data.tables?.sales?.length >= 3, r.status);
  r = await call('POST', '/users', { firstName: 'Cash', lastName: 'Ier', email: 'cashier@shop.com', password: 'Cashier!Pass123', role: 'staff', locationId: loc.id });
  check('create staff user', r.status === 201, r);
  const staffId = r.data.user?.id;
  const adminToken = token;
  r = await call('POST', '/auth/login', { email: 'cashier@shop.com', password: 'Cashier!Pass123' });
  check('staff login', r.status === 200, r);
  token = r.data.token;
  r = await call('POST', '/sales', { locationId: loc.id, customerName: 'S', subtotalAmount: 30, items: [{ productId: p1.id, quantity: 1, unitPrice: 30 }] });
  check('staff can checkout', r.status === 201 || r.status === 200, r);
  r = await call('GET', '/products');
  check('staff can view products', r.status === 200, r);
  r = await call('PUT', `/products/${p1.id}`, { price: 1 });
  check('staff cannot edit price -> 403', r.status === 403, r);
  r = await call('GET', '/users');
  check('staff cannot list users -> 403', r.status === 403, r);
  token = adminToken;
  r = await call('DELETE', `/users/${staffId}`);
  check('deactivate/delete user', r.status === 200, r);

  // ---- simple passwords + clear errors
  r = await call('POST', '/users', { firstName: 'Simple', lastName: 'Pw', email: 'simple@shop.com', password: 'abc123', role: 'staff' });
  check('create user with simple 6-char password', r.status === 201, r);
  r = await call('POST', '/auth/login', { email: 'simple@shop.com', password: 'abc123' });
  check('login with simple password', r.status === 200, r);
  r = await call('POST', '/users', { firstName: 'Short', lastName: 'Pw', email: 'short@shop.com', password: 'abc', role: 'staff' });
  check('too-short password -> 400 with clear message', r.status === 400 && /at least 6/.test(r.data.message), r);
  r = await call('POST', '/users', { firstName: 'Dup', lastName: 'User', email: 'simple@shop.com', password: 'abc123', role: 'staff' });
  check('duplicate email -> 409', r.status === 409, r);
  r = await call('POST', '/users', { firstName: 'Bad', lastName: 'Email', email: 'not-an-email', password: 'abc123', role: 'staff' });
  check('invalid email -> 400 (not 500)', r.status === 400, r);

  // ---- built-in admin protection
  r = await call('POST', '/users', { firstName: 'Second', lastName: 'Owner', email: 'owner2@shop.com', password: 'Owner2!Passw0rd', role: 'owner' });
  check('create second owner', r.status === 201, r);
  const adminTok = token;
  r = await call('POST', '/auth/login', { email: 'owner2@shop.com', password: 'Owner2!Passw0rd' });
  token = r.data.token;
  r = await call('GET', '/users');
  check('owner2 does not see built-in admin', r.status === 200 && !r.data.users.some((u) => u.email === 'admin@fortunetiles.local'), r.data.users?.map((u) => u.email));
  for (const [m, path, body] of [['DELETE', '/users/1'], ['PUT', '/users/1', { isActive: false }], ['POST', '/users/1/reset-password', { password: 'Hacked!Passw0rd1' }], ['GET', '/users/1']]) {
    r = await call(m, path, body);
    check(`owner2 cannot ${m} built-in admin`, r.status === 404, r);
  }
  token = adminTok;
  r = await call('GET', '/users');
  check('admin sees itself', r.data.users.some((u) => u.email === 'admin@fortunetiles.local'), r.data.users?.map((u) => u.email));

  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
