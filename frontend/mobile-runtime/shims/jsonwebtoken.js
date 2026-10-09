// Minimal HS256 JSON Web Token implementation (sign/verify) that works synchronously in the browser.
// Self-contained synchronous SHA-256 / HMAC-SHA-256 (no dependency; constants are derived, not typed).
const K = new Uint32Array(64);
const H0 = new Uint32Array(8);
(function init() {
  const primes = [];
  for (let n = 2; primes.length < 64; n++) { if (primes.every((p) => n % p)) primes.push(n); }
  const frac = (x) => x - Math.floor(x);
  primes.forEach((p, i) => { K[i] = Math.floor(frac(Math.cbrt(p)) * 4294967296); });
  primes.slice(0, 8).forEach((p, i) => { H0[i] = Math.floor(frac(Math.sqrt(p)) * 4294967296); });
}());

function sha256Bytes(msg) {
  const len = msg.length;
  const padded = new Uint8Array((((len + 9 + 63) >> 6) << 6));
  padded.set(msg);
  padded[len] = 0x80;
  const bits = len * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bits / 4294967296));
  view.setUint32(padded.length - 4, bits >>> 0);
  const h = Uint32Array.from(H0);
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, h[i] >>> 0);
  return out;
}

function hmacSha256Bytes(key, msg) {
  let k = key.length > 64 ? sha256Bytes(key) : key;
  const ipad = new Uint8Array(64).fill(0x36);
  const opad = new Uint8Array(64).fill(0x5c);
  for (let i = 0; i < k.length; i++) { ipad[i] ^= k[i]; opad[i] ^= k[i]; }
  const inner = new Uint8Array(64 + msg.length);
  inner.set(ipad); inner.set(msg, 64);
  const innerHash = sha256Bytes(inner);
  const outer = new Uint8Array(96);
  outer.set(opad); outer.set(innerHash, 64);
  return sha256Bytes(outer);
}

const b64url = (str) => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

const enc = new TextEncoder();
function hmac(secret, data) {
  const bytes = hmacSha256Bytes(enc.encode(String(secret)), enc.encode(data));
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function parseExpiry(v) {
  if (typeof v === 'number') return v;
  const m = /^(\d+)\s*(s|m|h|d)?$/.exec(String(v));
  if (!m) return 3600;
  const n = Number(m[1]);
  return n * ({ s: 1, m: 60, h: 3600, d: 86400 }[m[2] || 's']);
}

function sign(payload, secret, options = {}) {
  if (!secret) throw new Error('secretOrPrivateKey must have a value');
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now };
  if (options.expiresIn) body.exp = now + parseExpiry(options.expiresIn);
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const data = `${head}.${b64url(JSON.stringify(body))}`;
  return `${data}.${hmac(secret, data)}`;
}

function verify(token, secret) {
  if (!secret) throw new Error('secret or public key must be provided');
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('jwt malformed');
  if (hmac(secret, `${parts[0]}.${parts[1]}`) !== parts[2]) throw new Error('invalid signature');
  const payload = JSON.parse(fromB64url(parts[1]));
  if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) throw new Error('jwt expired');
  return payload;
}

module.exports = { sign, verify, decode: (t) => JSON.parse(fromB64url(String(t).split('.')[1])) };
