'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');

const WINDOW_MS = 15 * 60 * 1000;
const REQUEST_MS = 5 * 60 * 1000;
const DEVICE_MS = 180 * 24 * 60 * 60 * 1000;
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const equal = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

class PairingError extends Error {
  constructor(message, status = 400, retryAfter = 0) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/** A code identifies a pairing request; only local approval grants a device credential. */
class PairingService extends EventEmitter {
  constructor({ filePath, now = Date.now, randomBytes = crypto.randomBytes, randomInt = crypto.randomInt } = {}) {
    super();
    if (!filePath) throw new Error('O arquivo de pareamento é obrigatório.');
    this.filePath = filePath;
    this.now = now;
    this.randomBytes = randomBytes;
    this.randomInt = randomInt;
    this.pending = new Map();
    if (fs.existsSync(filePath)) {
      // Fail closed on corruption: never silently regenerate the code or accept old devices.
      this.data = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
      if (this.data.schema !== 1 || !/^\d{6}$/.test(this.data.code) || !Array.isArray(this.data.devices) || !Array.isArray(this.data.attempts)) {
        throw new Error('Configuração de pareamento inválida. Preserve o arquivo e recupere um backup.');
      }
    } else {
      this.data = { schema: 1, installationId: this.secret(), code: this.newCode(), devices: [], attempts: [], createdAt: this.now() };
      this.save();
    }
  }

  secret() { return this.randomBytes(32).toString('base64url'); }
  newCode() {
    let code;
    do { code = String(this.randomInt(0, 1000000)).padStart(6, '0'); } while (code === this.data?.code);
    return code;
  }
  save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = this.filePath + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(temporary, this.filePath);
  }
  getStatus() {
    const now = this.now();
    const devices = this.data.devices.filter(device => device.expiresAt > now);
    return {
      pairingCode: this.data.code,
      pairedDevices: devices.filter(device => (device.status || 'active') === 'active').length,
      devices: this.listDevices(),
      pendingRequests: this.listPending(),
      approvalRequired: true,
      // Native code-only discovery needs a separate directory. Never claim it already exists.
      mobileDirectoryConfigured: false
    };
  }
  listDevices() {
    return this.data.devices.filter(device => device.expiresAt > this.now()).map(({ id, name, createdAt, expiresAt, status }) => ({ id, name, createdAt, expiresAt, status: status || 'active' }));
  }
  listPending() {
    this.expirePending();
    return Array.from(this.pending.values()).filter(request => request.state === 'pending').map(({ id, name, expiresAt, state }) => ({ id, name, expiresAt, state }));
  }
  limit(clientId) {
    const now = this.now();
    const client = hash(clientId || 'unknown');
    this.data.attempts = this.data.attempts.filter(attempt => now - attempt.at < WINDOW_MS);
    const own = this.data.attempts.filter(attempt => attempt.client === client);
    if (own.length >= 5 || this.data.attempts.length >= 20) {
      const attempts = own.length >= 5 ? own : this.data.attempts;
      throw new PairingError('Muitas tentativas. Aguarde antes de tentar novamente.', 429, Math.max(1, Math.ceil((attempts[0].at + WINDOW_MS - now) / 1000)));
    }
    this.data.attempts.push({ client, at: now });
    // Persist every attempt before checking the code: restarts cannot reset the budget.
    this.save();
  }
  requestPairing({ code, name, clientId } = {}) {
    this.limit(clientId);
    if (!/^\d{6}$/.test(String(code)) || !equal(hash(code), hash(this.data.code))) {
      throw new PairingError('Código inválido. Confira o código exibido no computador.', 401);
    }
    this.expirePending();
    if (this.pending.size >= 5) throw new PairingError('Já existem solicitações aguardando. Confirme no computador.', 429, 60);
    const requestId = this.secret();
    const requestSecret = this.secret();
    const deviceName = String(name || 'Navegador').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 60);
    this.pending.set(requestId, { id: requestId, secretHash: hash(requestSecret), name: deviceName, state: 'pending', expiresAt: this.now() + REQUEST_MS });
    this.emit('request', { requestId, deviceName, expiresAt: this.now() + REQUEST_MS });
    return { requestId, requestSecret, status: 'pending', expiresIn: REQUEST_MS / 1000 };
  }
  expirePending() {
    for (const [id, request] of this.pending) if (request.expiresAt <= this.now()) this.pending.delete(id);
  }
  decide(requestId, approved) {
    this.expirePending();
    const request = this.pending.get(requestId);
    if (!request || request.state !== 'pending') return false;
    request.state = approved ? 'approved' : 'denied';
    this.emit('change', this.getStatus());
    return true;
  }
  complete(requestId, requestSecret) {
    this.expirePending();
    const request = this.pending.get(String(requestId));
    if (!request || !equal(request.secretHash, hash(requestSecret || ''))) throw new PairingError('Solicitação expirada ou inválida. Inicie o pareamento novamente.', 401);
    if (request.state === 'denied') {
      this.pending.delete(request.id);
      throw new PairingError('O pareamento não foi autorizado no computador.', 403);
    }
    if (request.state !== 'approved') return { status: 'pending' };
    const token = this.secret();
    const device = { id: this.secret(), name: request.name, tokenHash: hash(token), createdAt: this.now(), expiresAt: this.now() + DEVICE_MS };
    this.data.devices = this.data.devices.filter(item => item.expiresAt > this.now());
    this.data.devices.push(device);
    this.save();
    this.pending.delete(request.id);
    this.emit('change', this.getStatus());
    return { status: 'paired', token, deviceId: device.id, expiresIn: DEVICE_MS / 1000 };
  }
  authenticate(token) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const tokenHash = hash(token);
    const device = this.data.devices.find(item => item.expiresAt > this.now() && (item.status || 'active') === 'active' && equal(item.tokenHash, tokenHash));
    return device ? { id: device.id, name: device.name } : null;
  }
  revokeToken(token) {
    const device = this.authenticate(token);
    if (!device) return false;
    this.setDeviceStatus(device.id, 'inactive');
    return true;
  }
  setDeviceStatus(deviceId, status = 'inactive') {
    if (!['active', 'inactive', 'blocked'].includes(status)) throw new PairingError('Estado de dispositivo inválido.');
    const device = this.data.devices.find(item => item.id === String(deviceId) && item.expiresAt > this.now());
    if (!device) throw new PairingError('Dispositivo não encontrado.', 404);
    device.status = status;
    this.save();
    this.emit('change', this.getStatus());
    return this.getStatus();
  }
  rotateCode({ confirmed = false } = {}) {
    if (confirmed !== true) throw new PairingError('Confirme a troca: os dispositivos vinculados precisarão conectar novamente.');
    this.data.code = this.newCode();
    this.data.devices = [];
    this.pending.clear();
    // Keep brute-force history even after rotation.
    this.save();
    this.emit('change', this.getStatus());
    return this.getStatus();
  }
}

module.exports = { PairingService, PairingError, WINDOW_MS, DEVICE_MS };
