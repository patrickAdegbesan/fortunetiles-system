// Entry point for the Android build: starts the in-app server (database + routes) and exposes a request
// function the rest of the app uses instead of HTTP. Desktop builds never load this file.
import { driverRef } from '../../mobile-runtime/sqlite3-bridge';
import { createCapacitorDriver } from './capacitor-driver';
import { initLocalBackend } from '../../mobile-runtime/init';
import { handle, startSync } from '../../mobile-runtime/app';

const isAndroidApp = true; // this file is only ever loaded by the Android build

// Android's log shows only the message of an Error; include the stack so problems on the terminal can be diagnosed.
if (isAndroidApp && !console.__withStacks) {
  const original = console.error.bind(console);
  console.error = (...args) => original(...args.map((a) => (a instanceof Error ? `${a.stack || a}` : a)));
  console.__withStacks = true;
}

// The server code was written for Node and calls a few process helpers the browser lacks.
if (isAndroidApp) {
  const started = Date.now();
  if (!process.memoryUsage) {
    process.memoryUsage = () => {
      const m = (typeof performance !== 'undefined' && performance.memory) || {};
      return { rss: 0, heapTotal: m.totalJSHeapSize || 0, heapUsed: m.usedJSHeapSize || 0, external: 0, arrayBuffers: 0 };
    };
  }
  if (!process.uptime) process.uptime = () => (Date.now() - started) / 1000;
  if (!process.hrtime) {
    process.hrtime = (prev) => {
      const t = performance.now();
      const sec = Math.floor(t / 1000);
      const nano = Math.floor((t % 1000) * 1e6);
      if (!prev) return [sec, nano];
      let ds = sec - prev[0];
      let dn = nano - prev[1];
      if (dn < 0) { ds -= 1; dn += 1e9; }
      return [ds, dn];
    };
  }
}

let readyPromise = null;

function loginSecret() {
  let secret = null;
  try { secret = localStorage.getItem('ft_login_secret'); } catch (_) { /* ignore */ }
  if (!secret) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    secret = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem('ft_login_secret', secret); } catch (_) { /* ignore */ }
  }
  return secret;
}

/** Opens the database and prepares default data. Safe to call many times. */
export function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const t0 = performance.now();
      const lap = (label) => console.log(`[startup] ${label}: ${Math.round(performance.now() - t0)} ms`);
      process.env.JWT_SECRET = loginSecret();
      driverRef.current = await createCapacitorDriver();
      lap('database opened');
      const result = await initLocalBackend();
      lap('schema + defaults ready');
      if (result.firstRunPassword) {
        try { localStorage.setItem('ft_first_run_password', result.firstRunPassword); } catch (_) { /* ignore */ }
      }
      startSync();
    })();
  }
  return readyPromise;
}

// Product photos are stored inside the database; lists carry a link such as /api/products/3/image?v=1.
// The web view cannot fetch that from a server, so each link is turned into a local blob URL once.
const blobUrls = new Map();
const IMAGE_LINK = /^\/api\/products\/\d+\/image/;

async function blobUrlFor(link) {
  if (blobUrls.has(link)) return blobUrls.get(link);
  const out = await handle({ method: 'GET', url: link });
  if (out.status !== 200 || !out.data) return null;
  const type = (out.headers && out.headers['content-type']) || 'image/jpeg';
  const url = URL.createObjectURL(new Blob([out.data], { type }));
  blobUrls.set(link, url);
  return url;
}

async function resolveImageLinks(data) {
  const rows = [];
  const visit = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 4) return;
    if (Array.isArray(node)) { node.forEach((n) => visit(n, depth + 1)); return; }
    if (typeof node.imageUrl === 'string' && IMAGE_LINK.test(node.imageUrl)) rows.push(node);
    ['products', 'product', 'items', 'sales', 'inventory'].forEach((k) => { if (node[k]) visit(node[k], depth + 1); });
  };
  visit(data, 0);
  for (const row of rows) {
    const url = await blobUrlFor(row.imageUrl);
    row.imageUrl = url || null;
  }
  return data;
}

/** Runs one API request in the app. Resolves { status, headers, data } like an HTTP response. */
export async function localRequest(request) {
  await ensureReady();
  const out = await handle(request);
  if (out.status === 200 && out.data && typeof out.data === 'object' && !out.raw) {
    await resolveImageLinks(out.data);
  }
  return out;
}

/** Makes fetch('/api/...') calls (used by a few screens) go to the in-app server. */
export function installFetchShim() {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const path = url.replace(window.location.origin, '');
    if (!path.startsWith('/api/')) return realFetch(input, init);
    const headers = {};
    new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined) || {}).forEach((v, k) => { headers[k] = v; });
    const body = init.body ? JSON.parse(init.body) : undefined;
    const out = await localRequest({ method: init.method || 'GET', url: path, body, headers });
    return new Response(out.raw ? out.data : JSON.stringify(out.data === undefined ? null : out.data), {
      status: out.status,
      headers: { 'Content-Type': (out.headers && out.headers['content-type']) || 'application/json' },
    });
  };
}
