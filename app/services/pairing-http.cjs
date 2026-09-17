'use strict';

const fs = require('node:fs');
const path = require('node:path');

function requestToken(request) {
  const bearer = String(request.headers.authorization || '');
  if (/^Bearer /i.test(bearer)) return bearer.slice(7).trim();
  const cookie = String(request.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('rb_device='));
  try { return cookie ? decodeURIComponent(cookie.slice(10)) : ''; } catch (_) { return ''; }
}

function sameOrigin(request, allowedOrigin) {
  // CORS is not sufficient for mutations. Browser pairing requires an explicit origin.
  const origin = String(request.headers.origin || '');
  const fetchSite = String(request.headers['sec-fetch-site'] || '');
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  return Boolean(allowedOrigin && origin === allowedOrigin);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 4096) reject(Object.assign(new Error('Solicitação muito grande.'), { status: 413 }));
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch (_) { reject(Object.assign(new Error('JSON inválido.'), { status: 400 })); }
    });
    request.on('error', reject);
  });
}

/** Call before the authenticated sync routes; returns true only when handled. */
function createPairingHttpHandler({ pairing, webRoot, getPublicUrl, allowInsecureLoopback = false }) {
  function json(response, status, payload, headers = {}) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
    response.end(JSON.stringify(payload));
  }
  function originFor(request) {
    const publicUrl = getPublicUrl();
    if (publicUrl) { try { return new URL(publicUrl).origin; } catch (_) {} }
    const host = String(request.headers.host || '');
    return allowInsecureLoopback && /^(127\.0\.0\.1|localhost):\d+$/.test(host) ? 'http://' + host : '';
  }
  return async function pairingHttp(request, response, url) {
    const files = { '/pair': 'pairing.html', '/pair/': 'pairing.html', '/pairing.js': 'pairing.js', '/pairing.css': 'pairing.css' };
    if (request.method === 'GET' && files[url.pathname]) {
      const file = files[url.pathname];
      const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'text/css';
      response.writeHead(200, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
      response.end(fs.readFileSync(path.join(webRoot, file)));
      return true;
    }
    if (!url.pathname.startsWith('/v1/pairing/')) return false;
    if (request.method !== 'POST') { json(response, 405, { ok: false, message: 'Método não permitido.' }); return true; }
    if (!sameOrigin(request, originFor(request))) { json(response, 403, { ok: false, message: 'Origem da solicitação não autorizada.' }); return true; }
    if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) { json(response, 415, { ok: false, message: 'Use JSON.' }); return true; }
    try {
      const body = await readBody(request);
      if (url.pathname === '/v1/pairing/request') {
        // Do not trust arbitrary forwarded IP headers. Global budget also bounds shared proxy clients.
        const result = pairing.requestPairing({ code: body.code, name: body.name, clientId: request.socket.remoteAddress });
        json(response, 202, { ok: true, ...result });
      } else if (url.pathname === '/v1/pairing/complete') {
        const result = pairing.complete(body.requestId, body.requestSecret);
        if (result.status !== 'paired') json(response, 202, { ok: true, status: result.status });
        else {
          const secure = allowInsecureLoopback && originFor(request).startsWith('http://') ? '' : '; Secure';
          // Lax keeps the HttpOnly device credential available in Android WebView
          // navigation after the pairing fetch while remaining protected against
          // cross-site POSTs. Strict caused some Android WebView versions to drop
          // the cookie before the redirect to /mobile.
          json(response, 200, { ok: true, status: 'paired', next: '/mobile' }, { 'Set-Cookie': `rb_device=${result.token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${result.expiresIn}` });
        }
      } else if (url.pathname === '/v1/pairing/unlink') {
        pairing.revokeToken(requestToken(request));
        json(response, 200, { ok: true }, { 'Set-Cookie': 'rb_device=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' });
      } else json(response, 404, { ok: false, message: 'Rota não encontrada.' });
    } catch (error) {
      json(response, error.status || 500, { ok: false, message: error.status ? error.message : 'Não foi possível concluir o pareamento.', retryAfter: error.retryAfter || 0 }, error.retryAfter ? { 'Retry-After': error.retryAfter } : {});
    }
    return true;
  };
}

module.exports = { createPairingHttpHandler, requestToken, sameOrigin };
