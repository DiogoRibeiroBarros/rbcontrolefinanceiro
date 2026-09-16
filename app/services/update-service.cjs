'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FOUR_HOURS = 4 * 60 * 60 * 1000;

// Build metadata has no precedence; numeric prerelease identifiers sort numerically.
function parseVersion(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(String(value || ''));
  if (!match) return null;
  const pre = match[4] ? match[4].split('.') : [];
  if (pre.some(value => /^\d+$/.test(value) && value.length > 1 && value[0] === '0')) return null;
  return { core: match.slice(1, 4).map(BigInt), pre };
}

function compareVersions(left, right) {
  const a = parseVersion(left), b = parseVersion(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i++) {
    if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i] ? 1 : -1;
  }
  if (!a.pre.length || !b.pre.length) return a.pre.length === b.pre.length ? 0 : (a.pre.length ? -1 : 1);
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    if (a.pre[i] === b.pre[i]) continue;
    if (a.pre[i] === undefined) return -1;
    if (b.pre[i] === undefined) return 1;
    const numericA = /^\d+$/.test(a.pre[i]), numericB = /^\d+$/.test(b.pre[i]);
    if (numericA && numericB) return BigInt(a.pre[i]) > BigInt(b.pre[i]) ? 1 : -1;
    if (numericA !== numericB) return numericA ? -1 : 1;
    return a.pre[i] > b.pre[i] ? 1 : -1;
  }
  return 0;
}

function sanitizeError(error) {
  return String(error && error.message || error || '')
    .replace(/https?:\/\/[^\s"'<>]+/gi, value => {
      try { const url = new URL(value); return `${url.protocol}//${url.host}${url.pathname}`; }
      catch (_) { return '[endereço omitido]'; }
    })
    .replace(/\b(Bearer\s+)\S+/gi, '$1[omitido]')
    .replace(/\b(token|accessToken|authorization|password|secret|key)\s*[:=]\s*[^\s,;]+/gi, '$1=[omitido]')
    .slice(0, 2000);
}

function createFileUpdateStore(file) {
  return {
    read() { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return {}; } },
    write(value) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temporary = `${file}.tmp`;
      fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(temporary, file);
    }
  };
}

function createUpdateLogger(file) {
  return (event, error, details = {}) => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (fs.existsSync(file) && fs.statSync(file).size > 512 * 1024) {
        fs.copyFileSync(file, `${file}.previous`);
        fs.truncateSync(file, 0);
      }
      fs.appendFileSync(file, JSON.stringify({
        date: new Date().toISOString(), event: sanitizeError(event), error: sanitizeError(error),
        version: parseVersion(details.version) ? details.version : undefined,
        status: sanitizeError(details.status)
      }) + '\n', { mode: 0o600 });
    } catch (_) { /* A logging failure must not close the financial application. */ }
  };
}

function createUpdateService(options) {
  const { updater, currentVersion } = options;
  if (!updater || !parseVersion(currentVersion)) throw new Error('Atualizador ou versão atual inválida.');
  const enabled = options.enabled !== false;
  const now = options.now || Date.now;
  const timers = options.timers || { setTimeout, clearTimeout, setInterval, clearInterval };
  const store = options.store || { read: () => ({}), write: () => {} };
  const log = options.log || (() => {});
  const interval = options.intervalMs || FOUR_HOURS;
  let persisted = {};
  try { persisted = store.read() || {}; } catch (error) { log('read-preferences', error); }
  let deferredVersion = parseVersion(persisted.deferredVersion) ? persisted.deferredVersion : '';
  let deferredUntil = Number(persisted.deferredUntil) || 0;
  let started = false, stopped = false, startupTimer = null, periodicTimer = null;
  let checking = null, downloading = null, installing = null, manualCheck = false;
  let candidate = '', approvedDownload = '', notifiedVersion = '';
  let notification = null, lastError = '';
  let state = {
    status: 'idle', currentVersion, version: '', enabled, lastCheckedAt: '',
    percent: 0, transferred: 0, total: 0, error: '',
    message: enabled ? 'Verificação automática ativa.' : 'Verificação disponível no aplicativo Windows instalado.'
  };

  const snapshot = () => ({ ...state });
  function publish(changes) {
    if (stopped) return snapshot();
    state = { ...state, ...changes };
    try { if (options.onState) options.onState(snapshot()); } catch (error) { log('renderer-state', error); }
    return snapshot();
  }
  function persistDeferral() {
    try { store.write({ deferredVersion, deferredUntil }); }
    catch (error) { log('save-preferences', error); }
  }
  function closeNotification() {
    try { if (notification && notification.close) notification.close(); } catch (_) {}
    notification = null;
  }
  function emitPrompt(kind) {
    if (stopped) return;
    try { if (options.onPrompt) options.onPrompt({ ...snapshot(), kind }); }
    catch (error) { log('renderer-prompt', error); }
  }
  function announce(kind) {
    const window = options.getWindow && options.getWindow();
    const alive = window && (!window.isDestroyed || !window.isDestroyed());
    const focused = alive && (!window.isMinimized || !window.isMinimized()) &&
      (!window.isVisible || window.isVisible()) && (!window.isFocused || window.isFocused());
    if (focused || !options.notify) { emitPrompt(kind); return; }
    closeNotification();
    const announcedVersion = state.version;
    try {
      notification = options.notify({
        title: 'RB Gestão',
        body: kind === 'downloaded' ? `Versão ${state.version} pronta. Abra o RB Gestão para decidir quando reiniciar.` :
          `Nova atualização disponível: versão ${state.version}. Abra o RB Gestão para escolher.`,
        onClick() {
          if (stopped || state.version !== announcedVersion) return;
          const target = options.getWindow && options.getWindow();
          if (target && (!target.isDestroyed || !target.isDestroyed())) {
            if (target.isMinimized && target.isMinimized() && target.restore) target.restore();
            if (target.show) target.show();
            if (target.focus) target.focus();
          }
          closeNotification();
          if (['available', 'deferred', 'downloaded'].includes(state.status)) {
            emitPrompt(state.status === 'downloaded' ? 'downloaded' : 'available');
          }
        }
      });
      if (!notification) emitPrompt(kind);
    } catch (error) { log('windows-notification', error); emitPrompt(kind); }
  }
  function fail(error, phase) {
    if (stopped) return { ok: false, ...snapshot() };
    const sanitized = sanitizeError(error) || 'Falha não identificada.';
    if (sanitized !== lastError) log(phase, sanitized, { version: state.version, status: state.status });
    lastError = sanitized;
    const checksum = /checksum|sha512|signature/i.test(sanitized);
    publish({ status: 'error', error: sanitized,
      message: checksum ? 'O arquivo recebido não passou na validação de integridade. Nada foi instalado. Verifique novamente ou tente mais tarde.' :
        'Não foi possível concluir a atualização. Você pode continuar usando o aplicativo e tentar novamente.' });
    return { ok: false, ...snapshot() };
  }
  function acceptAvailable(info) {
    if (stopped || !info || compareVersions(info.version, currentVersion) !== 1) return;
    if (['downloading', 'downloaded', 'installing'].includes(state.status)) return;
    candidate = info.version;
    const deferred = candidate === deferredVersion && now() < deferredUntil;
    publish({ version: candidate, status: deferred && !manualCheck ? 'deferred' : 'available', error: '',
      message: deferred && !manualCheck ? 'Atualização adiada. Você pode continuar trabalhando.' : `Versão ${candidate} disponível.` });
    if (deferred && !manualCheck) return;
    if (manualCheck || notifiedVersion !== candidate || (candidate === deferredVersion && now() >= deferredUntil)) {
      notifiedVersion = candidate;
      if (candidate === deferredVersion && now() >= deferredUntil) {
        deferredVersion = ''; deferredUntil = 0; persistDeferral();
      }
      announce('available');
    }
  }

  const listeners = {
    'update-available': acceptAvailable,
    'download-progress': info => {
      if (stopped || state.status !== 'downloading') return;
      publish({ percent: Math.max(0, Math.min(100, Number(info.percent) || 0)),
        transferred: Math.max(0, Number(info.transferred) || 0), total: Math.max(0, Number(info.total) || 0) });
    },
    'update-downloaded': info => {
      if (stopped || !approvedDownload || !info || info.version !== approvedDownload || state.status !== 'downloading') return;
      deferredVersion = ''; deferredUntil = 0; persistDeferral();
      publish({ status: 'downloaded', percent: 100, error: '', message: 'Atualização pronta. Escolha quando reiniciar.' });
      log('downloaded', null, { version: state.version, status: state.status });
      announce('downloaded');
    },
    error: error => fail(error, 'updater-error')
  };

  function start() {
    if (started || stopped) return snapshot();
    started = true;
    // Checks never download or install implicitly. Full downloads avoid .blockmap requests.
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowDowngrade = false;
    updater.disableDifferentialDownload = true;
    if (!enabled) return publish({});
    for (const [event, listener] of Object.entries(listeners)) updater.on(event, listener);
    startupTimer = timers.setTimeout(() => { startupTimer = null; void check(); }, 5000);
    periodicTimer = timers.setInterval(() => { void check(); }, interval);
    return publish({});
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    if (startupTimer !== null) timers.clearTimeout(startupTimer);
    if (periodicTimer !== null) timers.clearInterval(periodicTimer);
    startupTimer = null; periodicTimer = null;
    for (const [event, listener] of Object.entries(listeners)) updater.removeListener(event, listener);
    closeNotification();
  }
  function check({ manual = false, force = false } = {}) {
    if (stopped || !enabled) return Promise.resolve({ ok: false, ...snapshot() });
    if (!started) start();
    if (checking) { manualCheck = manualCheck || manual || force; return checking; }
    if (downloading || installing || ['downloading', 'downloaded', 'installing'].includes(state.status)) {
      if (manual && state.status === 'downloaded') emitPrompt('downloaded');
      return Promise.resolve({ ok: true, ...snapshot() });
    }
    manualCheck = manual || force;
    lastError = '';
    publish({ status: 'checking', message: 'Verificando atualizações…', error: '' });
    checking = Promise.resolve().then(() => updater.checkForUpdates()).then(result => {
      if (stopped) return { ok: false, ...snapshot() };
      publish({ lastCheckedAt: new Date(now()).toISOString() });
      if (!result) return fail(new Error('O serviço de atualizações está indisponível nesta instalação.'), 'check-disabled');
      if (result.isUpdateAvailable && compareVersions(result.updateInfo && result.updateInfo.version, currentVersion) === 1) {
        // Electron emits update-available during the call; fallback only if no event was delivered.
        if (state.status === 'checking') acceptAvailable(result.updateInfo);
      } else {
        candidate = '';
        publish({ status: 'idle', version: '', percent: 0, error: '', message: 'Você está usando a versão mais recente disponível.' });
      }
      return { ok: state.status !== 'error', ...snapshot() };
    }).catch(error => fail(error, 'check')).finally(() => { checking = null; manualCheck = false; });
    return checking;
  }
  function defer(version) {
    if (stopped || version !== candidate || !['available', 'deferred'].includes(state.status)) return { ok: false, ...snapshot() };
    deferredVersion = version; deferredUntil = now() + interval; persistDeferral();
    closeNotification();
    return { ok: true, ...publish({ status: 'deferred', message: 'Atualização adiada. Você pode continuar trabalhando.' }) };
  }
  function download(version) {
    if (downloading) return downloading;
    if (stopped || !enabled || checking || version !== candidate || !candidate ||
        !['available', 'deferred', 'error'].includes(state.status)) return Promise.resolve({ ok: false, ...snapshot() });
    approvedDownload = version;
    lastError = '';
    closeNotification();
    publish({ status: 'downloading', percent: 0, transferred: 0, total: 0, error: '', message: 'Baixando e validando a atualização…' });
    downloading = Promise.resolve().then(() => updater.downloadUpdate()).then(() => {
      if (stopped) return { ok: false, ...snapshot() };
      // Only the updater's validated completion event permits installation.
      if (state.status !== 'downloaded') return fail(new Error('O atualizador não confirmou a integridade do arquivo.'), 'download-unconfirmed');
      return { ok: true, ...snapshot() };
    }).catch(error => fail(error, 'download')).finally(() => { downloading = null; });
    return downloading;
  }
  function install() {
    if (installing) return installing;
    if (stopped || !enabled || state.status !== 'downloaded') return Promise.resolve({ ok: false, ...snapshot() });
    publish({ status: 'installing', message: 'Preparando o reinício para instalar a atualização…' });
    installing = Promise.resolve().then(() => options.beforeInstall && options.beforeInstall()).then(() => {
      if (stopped) return { ok: false, ...snapshot() };
      // Explicit restart consent is required. Windows security prompts remain under OS control.
      updater.quitAndInstall(true, true);
      return { ok: state.status === 'installing', ...snapshot() };
    }).catch(error => fail(error, 'install')).finally(() => { installing = null; });
    return installing;
  }

  return { start, stop, getState: snapshot, check, defer, download, install };
}

module.exports = { createUpdateService, createFileUpdateStore, createUpdateLogger, compareVersions, sanitizeError };
