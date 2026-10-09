// A tiny stand-in for Express so the real route files can run inside the app (no network, no Node).
// Supports exactly what the routes use: Router(), use/get/post/put/patch/delete, params, query,
// req.body/headers/user/get(), res.status().json()/send()/set()/redirect().
/* eslint-disable no-use-before-define */

function compile(pattern, end) {
  const keys = [];
  let src = '';
  const segments = String(pattern).split('/').filter((s) => s !== '');
  for (const seg of segments) {
    const m = /^:(\w+)(\((.+)\))?(\?)?$/.exec(seg);
    if (m) {
      keys.push(m[1]);
      src += `/(${m[3] || '[^/]+'})${m[4] ? '?' : ''}`;
    } else if (seg.includes(':')) {
      // e.g. ":id(\\d+)/image" is split by "/" already; this handles "name:param" mixes
      src += '/' + seg.replace(/:(\w+)(\((.+?)\))?/g, (_, k, __, rx) => { keys.push(k); return `(${rx || '[^/]+'})`; });
    } else if (seg === '*') {
      src += '/.*';
    } else {
      src += '/' + seg.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  const re = new RegExp('^' + (src || '') + (end ? '/?$' : '(?=/|$)'), 'i');
  return { re, keys };
}

function flatten(list) {
  return list.reduce((acc, x) => acc.concat(Array.isArray(x) ? flatten(x) : [x]), []);
}

function Router() {
  const stack = [];
  const router = function (req, res, next) { router.handle(req, res, next); };
  router.stack = stack;

  ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].forEach((method) => {
    router[method] = (path, ...handlers) => {
      stack.push({ method: method.toUpperCase(), ...compile(path, true), handlers: flatten(handlers) });
      return router;
    };
  });
  router.all = (path, ...handlers) => {
    stack.push({ method: '*', ...compile(path, true), handlers: flatten(handlers) });
    return router;
  };
  router.use = (first, ...rest) => {
    let path = '/';
    let fns = [first, ...rest];
    if (typeof first === 'string') { path = first; fns = rest; }
    stack.push({ use: true, ...compile(path, false), handlers: flatten(fns) });
    return router;
  };

  router.handle = (req, res, done) => {
    const baseUrl = req.baseUrl || '';
    const fullUrl = req.url;
    const parentParams = req.params || {};
    let i = 0;

    const nextLayer = (err) => {
      if (err) { req.url = fullUrl; req.baseUrl = baseUrl; return done(err); }
      if (i >= stack.length) { req.url = fullUrl; req.baseUrl = baseUrl; return done(); }
      const layer = stack[i++];
      const path = (req.url.split('?')[0]) || '/';
      if (!layer.use && layer.method !== '*' && layer.method !== req.method) return nextLayer();
      const m = layer.re.exec(path);
      if (!m) return nextLayer();

      const params = {};
      layer.keys.forEach((k, idx) => { if (m[idx + 1] !== undefined) params[k] = decodeURIComponent(m[idx + 1]); });
      req.params = layer.use ? parentParams : { ...parentParams, ...params };

      if (layer.use) {
        const matched = m[0] === '' || m[0] === '/' ? '' : m[0];
        req.baseUrl = baseUrl + matched;
        req.url = req.url.slice(matched.length) || '/';
        if (!req.url.startsWith('/') && !req.url.startsWith('?')) req.url = '/' + req.url;
      }

      let h = 0;
      const nextHandler = (e) => {
        if (e) { req.url = fullUrl; req.baseUrl = baseUrl; return done(e); }
        if (h >= layer.handlers.length) {
          if (layer.use) { req.url = fullUrl; req.baseUrl = baseUrl; req.params = parentParams; }
          return nextLayer();
        }
        const fn = layer.handlers[h++];
        try {
          if (typeof fn.handle === 'function' && fn.stack) { // a sub-router
            fn.handle(req, res, nextHandler);
          } else {
            const out = fn(req, res, nextHandler);
            if (out && typeof out.then === 'function') out.catch(nextHandler);
          }
        } catch (ex) { nextHandler(ex); }
      };
      nextHandler();
    };
    nextLayer();
  };
  return router;
}

function express() {
  const app = Router();
  app.set = () => app;
  app.disable = () => app;
  app.listen = () => { throw new Error('listen() is not available in the app'); };
  return app;
}
express.Router = Router;
express.json = () => (req, res, next) => next();
express.urlencoded = () => (req, res, next) => next();
express.static = () => (req, res, next) => next();

function parseQuery(search) {
  const out = {};
  const sp = new URLSearchParams(search || '');
  sp.forEach((value, key) => {
    const k = key.endsWith('[]') ? key.slice(0, -2) : key;
    if (Object.prototype.hasOwnProperty.call(out, k)) out[k] = [].concat(out[k], value);
    else out[k] = key.endsWith('[]') ? [value] : value;
  });
  return out;
}

/**
 * Runs one request through a router and resolves with {status, headers, data}.
 * `data` is plain JSON (round-tripped, so model instances serialize exactly as over HTTP).
 */
function dispatch(router, { method, url, body, headers = {} }) {
  return new Promise((resolve) => {
    const qIndex = url.indexOf('?');
    const lower = {};
    Object.keys(headers).forEach((k) => { lower[k.toLowerCase()] = headers[k]; });
    const req = {
      method: method.toUpperCase(),
      url,
      originalUrl: url,
      baseUrl: '',
      path: qIndex === -1 ? url : url.slice(0, qIndex),
      params: {},
      query: parseQuery(qIndex === -1 ? '' : url.slice(qIndex + 1)),
      body: body === undefined || body === null ? {} : body,
      headers: lower,
      ip: '127.0.0.1',
      secure: false,
      protocol: 'https',
      connection: { remoteAddress: '127.0.0.1' },
      get(name) { return lower[String(name).toLowerCase()]; },
      header(name) { return lower[String(name).toLowerCase()]; },
    };
    const resHeaders = {};
    let finished = false;
    const finish = (payload) => {
      if (finished) return;
      finished = true;
      resolve({ status: res.statusCode, headers: resHeaders, ...payload });
    };
    const res = {
      statusCode: 200,
      headersSent: false,
      status(code) { res.statusCode = code; return res; },
      set(name, value) { if (typeof name === 'object') Object.assign(resHeaders, name); else resHeaders[String(name).toLowerCase()] = value; return res; },
      setHeader(name, value) { return res.set(name, value); },
      header(name, value) { return res.set(name, value); },
      getHeader(name) { return resHeaders[String(name).toLowerCase()]; },
      type(t) { return res.set('content-type', t); },
      json(data) {
        res.headersSent = true;
        let plain;
        try { plain = data === undefined ? undefined : JSON.parse(JSON.stringify(data)); } catch (e) { plain = data; }
        finish({ data: plain });
        return res;
      },
      send(data) {
        res.headersSent = true;
        if (data !== null && typeof data === 'object' && !(data instanceof Uint8Array)) return res.json(data);
        finish({ data, raw: true });
        return res;
      },
      end(data) { res.headersSent = true; finish({ data, raw: true }); return res; },
      redirect(code, url2) { res.statusCode = typeof code === 'number' ? code : 302; finish({ data: undefined, redirect: url2 || code }); return res; },
      sendFile() { res.statusCode = 404; finish({ data: { message: 'Not found' } }); return res; },
      attachment() { return res; },
    };
    router.handle(req, res, (err) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error('Request failed:', method, url, err && err.stack ? err.stack : err);
        res.status(500).json({ message: 'Internal server error' });
      } else if (!finished) {
        res.status(404).json({ message: 'Route not found' });
      }
    });
  });
}

module.exports = express;
module.exports.default = express;
module.exports.Router = Router;
module.exports.dispatch = dispatch;
