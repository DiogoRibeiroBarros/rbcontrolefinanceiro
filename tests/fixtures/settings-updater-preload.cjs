// This fixture is loaded only by settings-updater-smoke.cjs. It never contacts
// GitHub, Tailscale, a real updater, a real backup folder, or production IPC.
const { contextBridge } = require('electron');

const actions = [];
const subscribers = { state: new Set(), prompt: new Set() };
let updateState = {
  phase: 'idle', currentVersion: '2.4.5', version: '', progress: null,
  lastCheck: '2026-09-15T21:00:00.000Z', supported: true, autoCheck: true
};
const backupState = {
  folder: 'C:\\Prévia local\\Backups', lastBackupAt: '2026-09-15T21:00:00.000Z',
  lastBackupPath: '', lastError: ''
};
const remoteState = {
  pairingCode: '483921', publicUrl: 'https://preview.rb-gestao.invalid',
  accessUrl: 'https://preview.rb-gestao.invalid/mobile',
  browserUrl: 'https://preview.rb-gestao.invalid',
  status: 'online', message: 'Demonstração local — nenhum serviço externo conectado',
  configured: true, online: true, port: 41732, devices: [],
  discovery: { available: false, status: 'not-configured' },
  resolverConfigured: false, preview: true
};
const clone = value => JSON.parse(JSON.stringify(value));
function record(name, value) { actions.push({ name, value }); }
function publish(value) {
  updateState = { ...updateState, ...clone(value) };
  for (const callback of subscribers.state) callback(clone(updateState));
  return clone(updateState);
}
function prompt(value) {
  if (value) publish(value);
  for (const callback of subscribers.prompt) callback(clone(updateState));
}
function subscribe(kind, callback) {
  subscribers[kind].add(callback);
  return () => subscribers[kind].delete(callback);
}

contextBridge.exposeInMainWorld('rbDesktop', {
  backup: {
    snapshot: () => {},
    configure: async settings => { record('backup.configure', settings); return clone(backupState); },
    status: async () => clone(backupState),
    chooseFolder: async () => clone(backupState),
    runNow: async () => ({ ok: true, at: '2026-09-15T21:00:00.000Z', path: 'preview.json' }),
    onCompleted: () => () => {}
  },
  sync: {
    status: async () => clone(remoteState),
    configure: async () => { throw new Error('A prévia não configura serviços externos.'); },
    regenerateCode: async () => { record('sync.regenerateCode'); return { ...clone(remoteState), pairingCode: '731085' }; },
    onIncoming: () => () => {},
    onStatus: () => () => {}
  },
  updates: {
    status: async () => clone(updateState),
    check: async () => { record('check'); return publish({ phase: 'idle' }); },
    force: async () => { record('force'); return publish({ phase: 'idle' }); },
    download: async () => { record('download'); return publish({ phase: 'downloading', progress: { percent: 0 } }); },
    defer: async () => { record('defer'); return publish({ phase: 'deferred' }); },
    install: async () => { record('install'); return publish({ phase: 'installing' }); },
    onState: callback => subscribe('state', callback),
    onPrompt: callback => subscribe('prompt', callback)
  }
});
contextBridge.exposeInMainWorld('__rbTest', {
  emitState: value => publish(value),
  emitPrompt: value => prompt(value),
  actions: () => clone(actions),
  listeners: () => ({ state: subscribers.state.size, prompt: subscribers.prompt.size }),
  clearActions: () => { actions.length = 0; }
});
window.addEventListener('rb-test-update-state', event => publish(event.detail));
window.addEventListener('rb-test-update-prompt', event => prompt(event.detail));
