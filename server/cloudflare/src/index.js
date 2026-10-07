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
function b64decode(value) { const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='); return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0)); }
async function hmac(value, secret) { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)); }
async function adminToken(env) { const payload = b64(new TextEncoder().encode(JSON.stringify({ email: env.ADMIN_EMAIL, exp: Date.now() + 8 * 60 * 60 * 1000 }))); return payload + '.' + b64(await hmac(payload, env.ADMIN_SESSION_SECRET)); }
async function adminFrom(request, env) { if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET) throw new Error('Painel administrativo não configurado'); const raw = bearer(request); const parts = raw.split('.'); if (parts.length !== 2) return null; const valid = await crypto.subtle.verify('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode(env.ADMIN_SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']), b64decode(parts[1]), new TextEncoder().encode(parts[0])); if (!valid) return null; let data; try { data = JSON.parse(new TextDecoder().decode(b64decode(parts[0]))); } catch { return null; } return data.email === env.ADMIN_EMAIL && data.exp > Date.now() ? data : null; }
async function audit(env, request, actor, action, targetUserId = null, metadata = {}) { try { if (env.DB) await env.DB.prepare('INSERT INTO admin_audit(id,actor_email,action,target_user_id,metadata,ip,created_at) VALUES(?,?,?,?,?,?,?)').bind(id(), actor?.email || env.ADMIN_EMAIL || 'admin', action, targetUserId, JSON.stringify(metadata), request.headers.get('cf-connecting-ip') || null, new Date().toISOString()).run(); } catch (_) {} }
async function userFrom(request, env) {
  const token = bearer(request); if (!token) return null;
  return env.DB.prepare('SELECT u.* FROM users u JOIN access_tokens t ON t.user_id=u.id WHERE t.hash=? AND t.revoked_at IS NULL AND t.expires_at>?').bind(await hash(token), new Date().toISOString()).first();
}
function detectDevice(input = {}, request) {
  const ua = String(request?.headers.get('user-agent') || '');
  const suppliedPlatform = String(input.platform || '').trim().toLowerCase();
  const mobile = /android|iphone|ipad|ipod|mobile/i.test(ua);
  const browser = /edg\//i.test(ua) ? 'Edge' : /firefox\//i.test(ua) ? 'Firefox' : /chrome\//i.test(ua) ? 'Chrome' : /safari\//i.test(ua) ? 'Safari' : 'Navegador';
  const platform = suppliedPlatform || (mobile ? (/android/i.test(ua) ? 'android' : 'ios') : 'web');
  const platformName = { android: 'Android', ios: 'iPhone/iPad', web: 'Navegador', windows: 'Windows', macos: 'macOS', linux: 'Linux' }[platform] || platform;
  return { platform, name: String(input.name || input.deviceName || `${platformName} · ${browser}`).trim().slice(0, 100), appVersion: String(input.appVersion || '').trim().slice(0, 30) };
}
async function upsertInstallation(user, input = {}, request, env) {
  const installationId = String(input.installationId || '').trim() || id();
  const device = detectDevice(input, request);
  const existing = await env.DB.prepare('SELECT id,user_id,revoked_at FROM installations WHERE id=?').bind(installationId).first();
  if (existing && existing.user_id && existing.user_id !== user.id) throw new Error('Instalação vinculada a outra conta');
  if (!existing) {
    const limits = await accessLimits(user, env);
    const current = await env.DB.prepare('SELECT COUNT(*) AS count FROM installations WHERE user_id=? AND revoked_at IS NULL').bind(user.id).first();
    if (Number(current?.count || 0) >= limits.maxDevices) { const error = new Error(`Limite de dispositivos atingido (${limits.maxDevices}).`); error.status = 409; throw error; }
    const platforms = await env.DB.prepare('SELECT DISTINCT platform FROM installations WHERE user_id=? AND revoked_at IS NULL').bind(user.id).all();
    if (!(platforms.results || []).some((row) => row.platform === device.platform) && (platforms.results || []).length >= limits.maxApps) { const error = new Error(`Limite de aplicativos atingido (${limits.maxApps}).`); error.status = 409; throw error; }
  }
  await env.DB.prepare('INSERT INTO installations(id,user_id,name,platform,app_version,last_seen,revoked_at) VALUES(?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,name=excluded.name,platform=excluded.platform,app_version=excluded.app_version,last_seen=excluded.last_seen,revoked_at=NULL').bind(installationId, user.id, device.name || 'RB Gestão', device.platform, device.appVersion, new Date().toISOString()).run();
  return { id: installationId, ...device };
}
async function issueSession(user, env, request, deviceInput = {}) {
  const accessToken = `${crypto.randomUUID()}${crypto.randomUUID()}`; const refreshToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const accessExpires = new Date(Date.now() + 86400000).toISOString(); const refreshExpires = new Date(Date.now() + 90 * 86400000).toISOString();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO access_tokens(hash,user_id,expires_at) VALUES(?,?,?)').bind(await hash(accessToken), user.id, accessExpires),
    env.DB.prepare('INSERT INTO refresh_tokens(hash,user_id,expires_at) VALUES(?,?,?)').bind(await hash(refreshToken), user.id, refreshExpires),
  ]);
  const installation = deviceInput.skipDevice ? null : await upsertInstallation(user, deviceInput, request, env);
  return { accessToken, refreshToken, expiresAt: accessExpires, ...(installation ? { installationId: installation.id } : {}) };
}
async function userFromRefresh(refreshToken, env) {
  if (!refreshToken) return null;
  return env.DB.prepare('SELECT u.*, t.hash AS refresh_hash FROM users u JOIN refresh_tokens t ON t.user_id=u.id WHERE t.hash=? AND t.revoked_at IS NULL AND t.expires_at>?').bind(await hash(refreshToken), new Date().toISOString()).first();
}
async function signLicense(payload, env) {
  if (!env.LICENSE_PRIVATE_KEY) throw new Error('LICENSE_PRIVATE_KEY não configurada');
  const pem = env.LICENSE_PRIVATE_KEY.replace(/\\n/g, '\n'); const binary = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', binary, { name: 'Ed25519' }, false, ['sign']);
  const encoded = b64(new TextEncoder().encode(JSON.stringify(payload))); const signature = await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(encoded));
  return { payload: encoded, signature: b64(signature) };
}
async function issueLicense(user, input, env) {
  const installationId = String(input.installationId || '').trim(); if (!installationId) throw new Error('installationId obrigatório');
  const subscription = await env.DB.prepare('SELECT plan,status,current_period_end FROM subscriptions WHERE user_id=? ORDER BY current_period_end DESC LIMIT 1').bind(user.id).first(); const plan = ['VIP','BUSINESS','PRO','FREE'].includes(String(subscription?.plan || '').toUpperCase()) ? String(subscription.plan).toUpperCase() : 'FREE'; const perpetual = plan === 'VIP'; const now = new Date(); const valid = perpetual ? new Date('9999-12-31T23:59:59.999Z') : new Date(now.getTime() + (plan === 'FREE' ? 7 : 30) * 86400000); const grace = perpetual ? valid : new Date(valid.getTime() + 7 * 86400000);
  await upsertInstallation(user, input, null, env);
  const limits = await accessLimits(user, env);
  const payload = { version: 1, issuer: env.ISSUER || 'rb-commercial', audience: env.APP_AUDIENCE || 'rb-gestao', installationId, plan, status: String(subscription?.status || 'active'), issuedAt: now.toISOString(), validUntil: valid.toISOString(), offlineGraceUntil: grace.toISOString(), entitlements: { features: { mobileAccess: plan !== 'FREE', automaticBackup: plan !== 'FREE', multipleProfiles: plan !== 'FREE', advancedReports: plan !== 'FREE', investments: plan !== 'FREE', permissions: plan !== 'FREE', extendedAudit: ['BUSINESS','VIP'].includes(plan), cloudBackup: plan === 'VIP' }, limits: { profiles: plan === 'VIP' ? 9999 : plan === 'BUSINESS' ? 50 : plan === 'PRO' ? 10 : 1, records: plan === 'VIP' ? 999999 : plan === 'BUSINESS' ? 50000 : plan === 'PRO' ? 5000 : 50, devices: plan === 'VIP' ? 9999 : limits.maxDevices, apps: plan === 'VIP' ? 9999 : limits.maxApps } } };
  const license = await signLicense(payload, env);
  await env.DB.prepare('INSERT INTO licenses(id,installation_id,plan,status,issued_at,valid_until,offline_grace_until,payload,signature) VALUES(?,?,?,?,?,?,?,?,?)').bind(id(), installationId, 'PRO', 'active', payload.issuedAt, payload.validUntil, payload.offlineGraceUntil, license.payload, license.signature).run();
  return license;
}
const planList = () => [{ id: 'FREE', name: 'Grátis', price: 0, interval: 'lifetime', features: ['Uso básico', 'Até 1 perfil', 'Até 50 registros'] }, { id: 'PRO', name: 'PRO', price: 29.90, interval: 'month', features: ['Acesso mobile', 'Validade de 1 mês', 'Até 5 dispositivos'] }, { id: 'BUSINESS', name: 'Business', price: 79.90, interval: 'month', features: ['Todos os recursos profissionais', 'Validade de 1 mês', 'Até 20 dispositivos'] }, { id: 'VIP', name: 'VIP', price: 0, interval: 'lifetime', features: ['Acesso total', 'Licença permanente', 'Dispositivos ilimitados'] }];
const ADMIN_ASSET_VERSION = '93a26f5';
const planLimits = (plan) => plan === 'VIP' ? { maxDevices: 9999, maxApps: 9999 } : plan === 'BUSINESS' ? { maxDevices: 20, maxApps: 8 } : plan === 'PRO' ? { maxDevices: 5, maxApps: 4 } : { maxDevices: 1, maxApps: 1 };
async function ensureLimitsTable(env) { await env.DB.prepare('CREATE TABLE IF NOT EXISTS subscription_limits (user_id TEXT PRIMARY KEY,max_devices INTEGER NOT NULL DEFAULT 1,max_apps INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)').run(); }
async function accessLimits(user, env) {
  let row; try { row = await env.DB.prepare('SELECT s.plan,l.max_devices,l.max_apps FROM subscriptions s LEFT JOIN subscription_limits l ON l.user_id=s.user_id WHERE s.user_id=? ORDER BY s.current_period_end DESC LIMIT 1').bind(user.id).first(); } catch (_) { await ensureLimitsTable(env); row = await env.DB.prepare('SELECT s.plan,l.max_devices,l.max_apps FROM subscriptions s LEFT JOIN subscription_limits l ON l.user_id=s.user_id WHERE s.user_id=? ORDER BY s.current_period_end DESC LIMIT 1').bind(user.id).first(); }
  const defaults = planLimits(String(row?.plan || 'FREE').toUpperCase());
  return { maxDevices: Math.max(1, Number(row?.max_devices || defaults.maxDevices)), maxApps: Math.max(1, Number(row?.max_apps || defaults.maxApps)) };
}
export default { async fetch(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' } });
  if (!(await rateLimit(request, env))) return json({ error: 'Muitas requisições. Tente novamente em um minuto.' }, 429);
  try {
    if (url.pathname === '/health') return json({ ok: true, service: 'rb-gestao-subscriptions', version: 1 });
    if (url.pathname === '/v1/admin/login' && request.method === 'POST') {
      const input = await body(request); const email = String(input.email || '').trim().toLowerCase(); const rawPassword = String(input.password || '');
      if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET) return json({ error: 'Painel administrativo não configurado' }, 503);
      if (email !== env.ADMIN_EMAIL || await password(rawPassword, env.ADMIN_EMAIL) !== env.ADMIN_PASSWORD_HASH) return json({ error: 'Credenciais administrativas inválidas' }, 401);
      await audit(env, request, { email }, 'login'); return json({ accessToken: await adminToken(env), expiresIn: 28800 });
    }
    if (url.pathname === '/v1/admin/overview' && request.method === 'GET') {
      if (!await adminFrom(request, env)) return json({ error: 'Sessão administrativa inválida' }, 401);
      const [users, active, blocked, devices, paid] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) AS count FROM users').first(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE status='active'").first(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE status='blocked'").first(),
        env.DB.prepare('SELECT COUNT(*) AS count FROM installations WHERE revoked_at IS NULL').first(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM subscriptions WHERE plan IN ('PRO','BUSINESS') AND status IN ('active','trialing')").first(),
      ]);
      return json({ users: Number(users?.count || 0), active: Number(active?.count || 0), blocked: Number(blocked?.count || 0), devices: Number(devices?.count || 0), paidSubscriptions: Number(paid?.count || 0) });
    }
    if (url.pathname === '/v1/admin/customers' && request.method === 'GET') {
      if (!await adminFrom(request, env)) return json({ error: 'Sessão administrativa inválida' }, 401);
      const q = String(url.searchParams.get('q') || '').trim().toLowerCase(); const status = String(url.searchParams.get('status') || '');
      let query = 'SELECT u.id,u.name,u.email,u.status,u.created_at,s.plan,s.status AS subscription_status,(SELECT COUNT(*) FROM installations i WHERE i.user_id=u.id AND i.revoked_at IS NULL) AS devices FROM users u LEFT JOIN subscriptions s ON s.user_id=u.id';
      const args = []; const clauses = []; if (q) { clauses.push('(lower(u.name) LIKE ? OR lower(u.email) LIKE ?)'); args.push('%' + q + '%', '%' + q + '%'); } if (status) { clauses.push('u.status=?'); args.push(status); } if (clauses.length) query += ' WHERE ' + clauses.join(' AND '); query += ' ORDER BY u.created_at DESC LIMIT 200';
      const result = await env.DB.prepare(query).bind(...args).all(); return json((result.results || []).map((row) => ({ id: row.id, name: row.name, email: row.email, status: row.status || 'active', plan: row.plan || 'FREE', subscriptionStatus: row.subscription_status || 'active', devices: Number(row.devices || 0), createdAt: row.created_at })));
    }
    if (url.pathname === '/v1/admin/customers' && request.method === 'POST') {
      if (!await adminFrom(request, env)) return json({ error: 'Sessão administrativa inválida' }, 401);
      const input = await body(request); const name = String(input.name || '').trim(); const email = String(input.email || '').trim().toLowerCase(); const rawPassword = String(input.password || ''); const plan = ['FREE', 'PRO', 'BUSINESS', 'VIP'].includes(input.plan) ? input.plan : 'FREE';
      if (!name || !email || rawPassword.length < 8) return json({ error: 'Nome, e-mail e senha de pelo menos 8 caracteres são obrigatórios.' }, 400);
      const userId = id(); try { await env.DB.batch([env.DB.prepare('INSERT INTO users(id,name,email,password_hash,created_at,verified,status) VALUES(?,?,?,?,?,0,?)').bind(userId, name, email, await password(rawPassword, userId), new Date().toISOString(), 'active'), env.DB.prepare('INSERT INTO subscriptions(id,user_id,plan,status,current_period_end,trial_ends_at) VALUES(?,?,?,?,?,?)').bind(id(), userId, plan, 'active', null, null)]); } catch (error) { if (String(error.message).toLowerCase().includes('unique')) return json({ error: 'E-mail já cadastrado.' }, 409); throw error; }
      await audit(env, request, await adminFrom(request, env), 'customer.created', userId, { plan });
      return json({ ok: true, id: userId }, 201);
    }
    if (url.pathname.match(/^\/v1\/admin\/customers\/[^/]+$/) && request.method === 'PATCH') {
      if (!await adminFrom(request, env)) return json({ error: 'Sessão administrativa inválida' }, 401);
      const userId = decodeURIComponent(url.pathname.split('/')[4]);
      const input = await body(request); const name = String(input.name || '').trim(); const plan = String(input.plan || 'FREE').toUpperCase(); const rawPassword = String(input.password || '');
      if (!name || !['FREE', 'PRO', 'BUSINESS', 'VIP'].includes(plan)) return json({ error: 'Nome e plano válidos são obrigatórios.' }, 400);
      const user = await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(userId).first(); if (!user) return json({ error: 'Cliente não encontrado' }, 404);
      const statements = [env.DB.prepare('UPDATE users SET name=? WHERE id=?').bind(name, userId), env.DB.prepare('UPDATE subscriptions SET plan=? WHERE user_id=?').bind(plan, userId)];
      if (rawPassword) { if (rawPassword.length < 8) return json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, 400); statements.push(env.DB.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(await password(rawPassword, userId), userId)); }
      await env.DB.batch(statements); await audit(env, request, await adminFrom(request, env), 'customer.updated', userId, { plan, passwordChanged: Boolean(rawPassword) }); return json({ ok: true, id: userId });
    }
    if (url.pathname.match(/^\/v1\/admin\/customers\/[^/]+$/) && request.method === 'GET') {
      const actor = await adminFrom(request, env); if (!actor) return json({ error: 'Sessão administrativa inválida' }, 401);
      const userId = decodeURIComponent(url.pathname.split('/')[4]); const row = await env.DB.prepare('SELECT u.id,u.name,u.email,u.status,u.created_at,u.verified,s.plan,s.status AS subscription_status,s.current_period_end,s.trial_ends_at,(SELECT COUNT(*) FROM installations i WHERE i.user_id=u.id AND i.revoked_at IS NULL) AS devices FROM users u LEFT JOIN subscriptions s ON s.user_id=u.id WHERE u.id=?').bind(userId).first(); if (!row) return json({ error: 'Cliente não encontrado' }, 404); return json({ id: row.id, name: row.name, email: row.email, status: row.status || 'active', verified: Boolean(row.verified), createdAt: row.created_at, plan: row.plan || 'FREE', subscriptionStatus: row.subscription_status || 'active', currentPeriodEnd: row.current_period_end, trialEndsAt: row.trial_ends_at, devices: Number(row.devices || 0) });
    }
    if (url.pathname.match(/^\/v1\/admin\/customers\/[^/]+\/limits$/) && request.method === 'GET') {
      const actor = await adminFrom(request, env); if (!actor) return json({ error: 'Sessão administrativa inválida' }, 401);
      const userId = decodeURIComponent(url.pathname.split('/')[4]); const user = await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(userId).first(); if (!user) return json({ error: 'Cliente não encontrado' }, 404); await accessLimits({ id: userId }, env);
      const row = await env.DB.prepare('SELECT max_devices,max_apps,updated_at FROM subscription_limits WHERE user_id=?').bind(userId).first(); const subscription = await env.DB.prepare('SELECT plan FROM subscriptions WHERE user_id=?').bind(userId).first(); const defaults = planLimits(String(subscription?.plan || 'FREE').toUpperCase());
      return json({ userId, maxDevices: Number(row?.max_devices || defaults.maxDevices), maxApps: Number(row?.max_apps || defaults.maxApps), updatedAt: row?.updated_at || null });
    }
    if (url.pathname.match(/^\/v1\/admin\/customers\/[^/]+\/limits$/) && request.method === 'PATCH') {
      const actor = await adminFrom(request, env); if (!actor) return json({ error: 'Sessão administrativa inválida' }, 401);
      const userId = decodeURIComponent(url.pathname.split('/')[4]); const input = await body(request); const maxDevices = Math.max(1, Math.min(100, Number(input.maxDevices || 1))); const maxApps = Math.max(1, Math.min(30, Number(input.maxApps || 1))); const user = await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(userId).first(); if (!user) return json({ error: 'Cliente não encontrado' }, 404); await ensureLimitsTable(env);
      await env.DB.prepare('INSERT INTO subscription_limits(user_id,max_devices,max_apps,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET max_devices=excluded.max_devices,max_apps=excluded.max_apps,updated_at=excluded.updated_at').bind(userId, maxDevices, maxApps, new Date().toISOString()).run(); await audit(env, request, actor, 'customer.limits.updated', userId, { maxDevices, maxApps }); return json({ ok: true, userId, maxDevices, maxApps });
    }
    if (url.pathname.match(/^\/v1\/admin\/customers\/[^/]+\/block$/) && request.method === 'POST') {
      if (!await adminFrom(request, env)) return json({ error: 'Sessão administrativa inválida' }, 401);
      const userId = decodeURIComponent(url.pathname.split('/')[4]); const user = await env.DB.prepare('SELECT status FROM users WHERE id=?').bind(userId).first(); if (!user) return json({ error: 'Cliente não encontrado' }, 404);
      const blocked = user.status !== 'blocked'; const next = blocked ? 'blocked' : 'active';
      await env.DB.batch([env.DB.prepare('UPDATE users SET status=? WHERE id=?').bind(next, userId), env.DB.prepare('UPDATE subscriptions SET status=? WHERE user_id=?').bind(blocked ? 'suspended' : 'active', userId), ...(blocked ? [env.DB.prepare('UPDATE access_tokens SET revoked_at=? WHERE user_id=?').bind(new Date().toISOString(), userId), env.DB.prepare('UPDATE installations SET revoked_at=? WHERE user_id=?').bind(new Date().toISOString(), userId)] : [])]);
      await audit(env, request, await adminFrom(request, env), blocked ? 'customer.blocked' : 'customer.unblocked', userId);
      return json({ ok: true, status: next });
    }
    if (url.pathname.match(/^\/v1\/admin\/customers\/[^/]+\/devices$/) && request.method === 'GET') {
      const actor = await adminFrom(request, env); if (!actor) return json({ error: 'Sessão administrativa inválida' }, 401); const userId = decodeURIComponent(url.pathname.split('/')[4]); const rows = await env.DB.prepare('SELECT id,name,platform,app_version,last_seen,revoked_at FROM installations WHERE user_id=? ORDER BY last_seen DESC').bind(userId).all(); return json((rows.results || []).map((r) => ({ id: r.id, name: r.name, platform: r.platform, appVersion: r.app_version || '', lastSeen: r.last_seen, revokedAt: r.revoked_at })));
    }
    if (url.pathname === '/v1/admin/devices' && request.method === 'GET') {
      const actor = await adminFrom(request, env); if (!actor) return json({ error: 'Sessão administrativa inválida' }, 401);
      const rows = await env.DB.prepare('SELECT i.id,i.name,i.platform,i.app_version,i.last_seen,i.revoked_at,u.id AS user_id,u.name AS customer_name,u.email FROM installations i LEFT JOIN users u ON u.id=i.user_id ORDER BY i.last_seen DESC').all();
      return json((rows.results || []).map((r) => ({ id: r.id, name: r.name, platform: r.platform, appVersion: r.app_version || '', lastSeen: r.last_seen, revokedAt: r.revoked_at, customerId: r.user_id, customerName: r.customer_name || 'Cliente removido', email: r.email || '' })));
    }
    if (url.pathname.match(/^\/v1\/admin\/customers\/[^/]+\/devices\/[^/]+\/revoke$/) && request.method === 'POST') {
      const actor = await adminFrom(request, env); if (!actor) return json({ error: 'Sessão administrativa inválida' }, 401); const parts = url.pathname.split('/'); const userId = decodeURIComponent(parts[4]); const deviceId = decodeURIComponent(parts[6]); const result = await env.DB.prepare('UPDATE installations SET revoked_at=? WHERE id=? AND user_id=?').bind(new Date().toISOString(), deviceId, userId).run(); if (!result.meta?.changes) return json({ error: 'Dispositivo não encontrado' }, 404); await audit(env, request, actor, 'device.revoked', userId, { deviceId }); return json({ ok: true });
    }
    if (url.pathname === '/v1/admin/licenses' && request.method === 'GET') {
      const actor = await adminFrom(request, env); if (!actor) return json({ error: 'Sessão administrativa inválida' }, 401); const rows = await env.DB.prepare('SELECT l.id,l.installation_id,l.plan,l.status,l.issued_at,l.valid_until,l.offline_grace_until,i.name AS device_name,i.platform,u.id AS user_id,u.name AS customer_name,u.email FROM licenses l JOIN installations i ON i.id=l.installation_id LEFT JOIN users u ON u.id=i.user_id ORDER BY l.issued_at DESC LIMIT 300').all(); return json((rows.results || []).map((r) => ({ id: r.id, installationId: r.installation_id, plan: r.plan, status: r.status, issuedAt: r.issued_at, validUntil: r.valid_until, offlineGraceUntil: r.offline_grace_until, deviceName: r.device_name, platform: r.platform, customerId: r.user_id, customerName: r.customer_name, email: r.email })));
    }
    if (url.pathname === '/v1/admin/audit' && request.method === 'GET') {
      const actor = await adminFrom(request, env); if (!actor) return json({ error: 'Sessão administrativa inválida' }, 401); const rows = await env.DB.prepare('SELECT id,actor_email,action,target_user_id,metadata,ip,created_at FROM admin_audit ORDER BY created_at DESC LIMIT 300').all(); return json((rows.results || []).map((r) => ({ id: r.id, actor: r.actor_email, action: r.action, targetUserId: r.target_user_id, metadata: r.metadata ? JSON.parse(r.metadata) : {}, ip: r.ip, createdAt: r.created_at })));
    }
    if (url.pathname === '/v1/auth/register' && request.method === 'POST') {
      const input = await body(request); const email = String(input.email || '').trim().toLowerCase(); const name = String(input.name || '').trim(); const rawPassword = String(input.password || '');
      if (!email || !name || rawPassword.length < 8) return json({ error: 'Nome, e-mail e senha de pelo menos 8 caracteres são obrigatórios.' }, 400);
      const userId = id();
      try { await env.DB.batch([env.DB.prepare('INSERT INTO users(id,name,email,password_hash,created_at,verified) VALUES(?,?,?,?,?,0)').bind(userId, name, email, await password(rawPassword, userId), new Date().toISOString()), env.DB.prepare('INSERT INTO subscriptions(id,user_id,plan,status,current_period_end,trial_ends_at) VALUES(?,?,?,?,?,?)').bind(id(), userId, 'FREE', 'active', null, null)]); } catch (error) { if (String(error.message).toLowerCase().includes('unique')) return json({ error: 'E-mail já cadastrado.' }, 409); throw error; }
      return json({ ok: true, user: { id: userId, name, email } }, 201);
    }
    if (url.pathname === '/v1/auth/login' && request.method === 'POST') {
      const input = await body(request); const user = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(String(input.email || '').trim().toLowerCase()).first();
      if (!user || user.status === 'blocked' || user.password_hash !== await password(String(input.password || ''), user.id)) return json({ error: 'Credenciais inválidas' }, 401);
      return json({ ...(await issueSession(user, env, request, input)), user: { id: user.id, name: user.name, email: user.email } });
    }
    if (url.pathname === '/v1/auth/refresh' && request.method === 'POST') {
      const input = await body(request); const user = await userFromRefresh(String(input.refreshToken || ''), env); if (!user) return json({ error: 'Refresh token inválido ou expirado' }, 401);
      await env.DB.prepare('UPDATE refresh_tokens SET revoked_at=? WHERE hash=?').bind(new Date().toISOString(), user.refresh_hash).run(); return json(await issueSession(user, env, request, { skipDevice: true }));
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
    if (env.ASSETS && (url.pathname === '/' || url.pathname.startsWith('/admin'))) { const isStatic = /\.(?:js|css|png|svg|ico|webp)$/i.test(url.pathname); const assetRequest = !isStatic ? new Request(new URL('/admin/index.html', request.url), request) : request; const response = await env.ASSETS.fetch(assetRequest); if (!isStatic) { const html = await response.text(); const headers = new Headers(response.headers); headers.delete('content-length'); headers.set('cache-control', 'no-store'); return new Response(html.replace('/admin/admin.css', `/admin/admin.css?v=${ADMIN_ASSET_VERSION}`).replace('/admin/admin.js', `/admin/admin.js?v=${ADMIN_ASSET_VERSION}`), { status: response.status, headers }); } return response; }
    return json({ error: 'Not found' }, 404);
  } catch (error) { console.error(error); return json({ error: error.message || 'Erro interno' }, Number(error?.status) || 500); }
} };
