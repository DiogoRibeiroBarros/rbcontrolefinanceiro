'use strict';

const fs = require('node:fs');
const path = require('node:path');

function bearer(request) {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(String(request.headers.authorization || ''));
  return match ? match[1] : '';
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', chunk => {
      raw += chunk;
      if (raw.length > 4096) reject(Object.assign(new Error('Solicitação muito grande.'), { status:413 }));
    });
    request.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch (_) { reject(Object.assign(new Error('JSON inválido.'), { status:400 })); }
    });
    request.on('error', reject);
  });
}

function createMobileV2HttpHandler({ pairing, webRoot, getPublicUrl, isReady = () => true, allowInsecureLoopback = false }) {
  function json(response, status, body, extra = {}) {
    response.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...extra });
    response.end(JSON.stringify(body));
    return true;
  }
  function originFor(request) {
    try { return new URL(getPublicUrl()).origin; } catch (_) {}
    const host = String(request.headers.host || '');
    return allowInsecureLoopback && /^(127\.0\.0\.1|localhost):\d+$/.test(host) ? `http://${host}` : '';
  }
  function sameOrigin(request) {
    const origin = String(request.headers.origin || '');
    const site = String(request.headers['sec-fetch-site'] || '');
    return Boolean(origin && origin === originFor(request) && (!site || ['same-origin','none'].includes(site)));
  }
  return async function mobileV2Http(request, response, url) {
    if (!url.pathname.startsWith('/v2/mobile/')) return false;
    if (request.method === 'GET' && url.pathname === '/v2/mobile/bootstrap') {
      response.writeHead(200, {
        'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer',
        'X-Content-Type-Options':'nosniff',
        'Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'"
      });
      response.end(fs.readFileSync(path.join(webRoot, 'mobile-v2-bootstrap.html')));
      return true;
    }
    if (request.method === 'GET' && url.pathname === '/v2/mobile/bootstrap.js') {
      response.writeHead(200, { 'Content-Type':'text/javascript; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
      response.end(fs.readFileSync(path.join(webRoot, 'mobile-v2-bootstrap.js')));
      return true;
    }
    if (!pairing) return json(response, 503, { ok:false, reason:'service_unavailable' });
    if (request.method === 'GET' && url.pathname === '/v2/mobile/identity') {
      return json(response, 200, { ok:true, protocol:2, installationId:pairing.data.installationId });
    }
    if (request.method === 'GET' && url.pathname === '/v2/mobile/heartbeat') {
      const device = pairing.authenticate(bearer(request));
      return device ? json(response, 200, { ok:true, installationId:pairing.data.installationId, deviceId:device.id, ready:Boolean(isReady()) }) :
        json(response, 401, { ok:false, reason:'unauthorized' });
    }
    if (request.method !== 'POST') return json(response, 405, { ok:false, reason:'method_not_allowed' });
    if (!/^application\/json(?:;|$)/i.test(String(request.headers['content-type'] || ''))) return json(response, 415, { ok:false, reason:'json_required' });
    try {
      if (url.pathname === '/v2/mobile/session') {
        if (!sameOrigin(request)) return json(response, 403, { ok:false, reason:'origin_denied' });
        const device = pairing.authenticate(bearer(request));
        if (!device) return json(response, 401, { ok:false, reason:'unauthorized' });
        const secure = originFor(request).startsWith('http://') ? '' : '; Secure';
        return json(response, 200, { ok:true, next:'/mobile' }, {
          'Set-Cookie':`rb_device=${bearer(request)}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=15552000`
        });
      }
      if (!['/v2/mobile/pair/request','/v2/mobile/pair/complete'].includes(url.pathname)) return json(response, 404, { ok:false, reason:'not_found' });
      // Native requests have no browser Origin. The persistent global and per-client
      // budgets in PairingService protect the short code against guessing.
      const body = await readJson(request);
      if (url.pathname === '/v2/mobile/pair/request') {
        const result = pairing.requestPairing({ code:body.code, name:body.name, clientId:request.socket.remoteAddress });
        return json(response, 202, { ok:true, ...result, installationId:pairing.data.installationId });
      }
      const result = pairing.complete(body.requestId, body.requestSecret);
      return json(response, result.status === 'paired' ? 200 : 202, { ok:true, ...result, installationId:pairing.data.installationId });
    } catch (error) {
      return json(response, error.status || 500, { ok:false, reason:error.status === 401 ? 'invalid_code' : 'request_failed', message:error.status ? error.message : 'Falha ao conectar.', retryAfter:error.retryAfter || 0 });
    }
  };
}

module.exports = { createMobileV2HttpHandler };
