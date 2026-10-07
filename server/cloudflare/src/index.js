const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', ...headers },
});
const id = () => crypto.randomUUID();
const b64 = (value) => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hash(value) { return b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }
async function password(value, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, material, 256);
  return b64(bits);
}
const bearer = (request) => String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
async function body(request) { try { return await request.json(); } catch { return {}; } }
async function rateLimit(request, env) {
  if (!env.KV) return true;
  const ip = request.headers.get('cf-connecting-ip') || 'unknown'; const key = `rate:${ip}`;
  const count = Number(await env.KV.get(key) || 0); if (count >= 120) return false;
  await env.KV.put(key, String(count + 1), { expirationTtl: 60 }); return true;
}
async function userFrom(request, env) {
  const token = bearer(request); if (!token) return null;
  return env.DB.prepare('SELECT u.* FROM users u JOIN access_tokens t ON t.user_id=u.id WHERE t.hash=? AND t.revoked_at IS NULL AND t.expires_at>?').bind(await hash(token), new Date().toISOString()).first();
}
async function issueSession(user, env) {
  const accessToken = `${crypto.randomUUID()}${crypto.randomUUID()}`; const refreshToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const accessExpires = new Date(Date.now() + 86400000).toISOString(); const refreshExpires = new Date(Date.now() + 90 * 86400000).toISOString();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO access_tokens(hash,user_id,expires_at) VALUES(?,?,?)').bind(await hash(accessToken), user.id, accessExpires),
    env.DB.prepare('INSERT INTO refresh_tokens(hash,user_id,expires_at) VALUES(?,?,?)').bind(await hash(refreshToken), user.id, refreshExpires),
  ]);
  return { accessToken, refreshToken, expiresAt: accessExpires };
}
async function userFromRefresh(refreshToken, env) {
  if (!refreshToken) return null;
  return env.DB.prepare('SELECT u.*, t.hash AS refresh_hash FROM users u JOIN refresh_tokens t ON t.user_id=u.id WHERE t.hash=? AND t.revoked_at IS NULL AND t.expires_at>?').bind(await hash(refreshToken), new Date().toISOString()).first();
}
async function signLicense(payload, env) {
  if (!env.LICENSE_PRIVATE_KEY) throw new Error('LICENSE_PRIVATE_KEY não configurada');
  const pem = env.LICENSE_PRIVATE_KEY.replace(/\\n/g, '\n'); const binary = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', binary, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const encoded = b64(new TextEncoder().encode(JSON.stringify(payload))); const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(encoded));
  return { payload: encoded, signature: b64(signature) };
}
async function issueLicense(user, input, env) {
  const installationId = String(input.installationId || '').trim(); if (!installationId) throw new Error('installationId obrigatório');
  const now = new Date(); const valid = new Date(now.getTime() + 30 * 86400000); const grace = new Date(valid.getTime() + 7 * 86400000);
  const existing = await env.DB.prepare('SELECT id,user_id FROM installations WHERE id=?').bind(installationId).first();
  if (existing && existing.user_id && existing.user_id !== user.id) throw new Error('Instalação vinculada a outra conta');
  await env.DB.prepare('INSERT INTO installations(id,user_id,name,platform,app_version,last_seen,revoked_at) VALUES(?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,name=excluded.name,platform=excluded.platform,app_version=excluded.app_version,last_seen=excluded.last_seen,revoked_at=NULL').bind(installationId, user.id, String(input.name || 'RB Gestão'), String(input.platform || 'windows'), String(input.appVersion || ''), now.toISOString()).run();
  const payload = { version: 1, issuer: env.ISSUER || 'rb-commercial', audience: env.APP_AUDIENCE || 'rb-gestao', installationId, plan: 'PRO', status: 'active', issuedAt: now.toISOString(), validUntil: valid.toISOString(), offlineGraceUntil: grace.toISOString(), entitlements: { features: { mobileAccess: true, automaticBackup: true }, limits: { profiles: 20, devices: 10 } } };
  const license = await signLicense(payload, env);
  await env.DB.prepare('INSERT INTO licenses(id,installation_id,plan,status,issued_at,valid_until,offline_grace_until,payload,signature) VALUES(?,?,?,?,?,?,?,?,?)').bind(id(), installationId, 'PRO', 'active', payload.issuedAt, payload.validUntil, payload.offlineGraceUntil, license.payload, license.signature).run();
  return license;
}
const planList = () => [{ id: 'FREE', name: 'Grátis', price: 0, interval: 'month', features: ['Uso local'] }, { id: 'PRO', name: 'PRO', price: 29.90, interval: 'month', features: ['Acesso mobile', 'Backup automático', 'Múltiplos dispositivos'] }];
export default { async fetch(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS' } });
  if (!(await rateLimit(request, env))) return json({ error: 'Muitas requisições. Tente novamente em um minuto.' }, 429);
  try {
    if (url.pathname === '/health') return json({ ok: true, service: 'rb-gestao-subscriptions', version: 1 });
    if (url.pathname === '/v1/auth/register' && request.method === 'POST') {
      const input = await body(request); const email = String(input.email || '').trim().toLowerCase(); const name = String(input.name || '').trim(); const rawPassword = String(input.password || '');
      if (!email || !name || rawPassword.length < 8) return json({ error: 'Nome, e-mail e senha de pelo menos 8 caracteres são obrigatórios.' }, 400);
      const userId = id();
      try { await env.DB.batch([env.DB.prepare('INSERT INTO users(id,name,email,password_hash,created_at,verified) VALUES(?,?,?,?,?,0)').bind(userId, name, email, await password(rawPassword, userId), new Date().toISOString()), env.DB.prepare('INSERT INTO subscriptions(id,user_id,plan,status,current_period_end,trial_ends_at) VALUES(?,?,?,?,?,?)').bind(id(), userId, 'FREE', 'active', null, null)]); } catch (error) { if (String(error.message).toLowerCase().includes('unique')) return json({ error: 'E-mail já cadastrado.' }, 409); throw error; }
      return json({ ok: true, user: { id: userId, name, email } }, 201);
    }
    if (url.pathname === '/v1/auth/login' && request.method === 'POST') {
      const input = await body(request); const user = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(String(input.email || '').trim().toLowerCase()).first();
      if (!user || user.password_hash !== await password(String(input.password || ''), user.id)) return json({ error: 'Credenciais inválidas' }, 401);
      return json({ ...(await issueSession(user, env)), user: { id: user.id, name: user.name, email: user.email } });
    }
    if (url.pathname === '/v1/auth/refresh' && request.method === 'POST') {
      const input = await body(request); const user = await userFromRefresh(String(input.refreshToken || ''), env); if (!user) return json({ error: 'Refresh token inválido ou expirado' }, 401);
      await env.DB.prepare('UPDATE refresh_tokens SET revoked_at=? WHERE hash=?').bind(new Date().toISOString(), user.refresh_hash).run(); return json(await issueSession(user, env));
    }
    if (url.pathname === '/v1/auth/logout' && request.method === 'POST') { const token = bearer(request); if (token) await env.DB.prepare('UPDATE access_tokens SET revoked_at=? WHERE hash=?').bind(new Date().toISOString(), await hash(token)).run(); return json({ ok: true }); }
    if (url.pathname === '/v1/account' && request.method === 'GET') {
      const user = await userFrom(request, env); if (!user) return json({ error: 'Não autorizado' }, 401); const subscription = await env.DB.prepare('SELECT * FROM subscriptions WHERE user_id=? ORDER BY current_period_end DESC LIMIT 1').bind(user.id).first();
      return json({ user: { id: user.id, name: user.name, email: user.email, verified: Boolean(user.verified) }, subscription: subscription || { plan: 'FREE', status: 'active' } });
    }
    if (url.pathname === '/v1/plans' && request.method === 'GET') return json({ plans: planList() });
    if (url.pathname === '/v1/licenses/activate' && request.method === 'POST') { const user = await userFrom(request, env); if (!user) return json({ error: 'Não autorizado' }, 401); return json(await issueLicense(user, await body(request), env)); }
    if (url.pathname === '/v1/devices' && request.method === 'GET') { const user = await userFrom(request, env); if (!user) return json({ error: 'Não autorizado' }, 401); const rows = await env.DB.prepare('SELECT * FROM installations WHERE user_id=? ORDER BY last_seen DESC').bind(user.id).all(); return json(rows.results || []); }
    if (url.pathname.startsWith('/v1/devices/') && request.method === 'DELETE') { const user = await userFrom(request, env); if (!user) return json({ error: 'Não autorizado' }, 401); await env.DB.prepare('UPDATE installations SET revoked_at=? WHERE id=? AND user_id=?').bind(new Date().toISOString(), decodeURIComponent(url.pathname.split('/').pop()), user.id).run(); return json({ ok: true }); }
    if (url.pathname === '/v1/auth/forgot-password' && request.method === 'POST') return json({ ok: true, message: 'Se o e-mail existir, as instruções serão enviadas.' });
    if (url.pathname === '/v1/auth/verification' && request.method === 'POST') return json({ ok: true });
    if (url.pathname === '/v1/payments/checkout' && request.method === 'POST') return json({ error: 'Checkout ainda não configurado. Ative a licença pelo painel administrativo.' }, 501);
    return json({ error: 'Not found' }, 404);
  } catch (error) { console.error(error); return json({ error: error.message || 'Erro interno' }, 500); }
} };
