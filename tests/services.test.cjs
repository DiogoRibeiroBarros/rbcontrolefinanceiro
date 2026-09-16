const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { PairingService, PairingError } = require('../app/services/pairing-service.cjs');
const { createUpdateService, compareVersions } = require('../app/services/update-service.cjs');

assert.equal(compareVersions('2.4.10','2.4.9'), 1);
assert.equal(compareVersions('2.4.5-beta.2','2.4.5-beta.10'), -1);
assert.equal(compareVersions('2.4.5','2.4.5-beta.1'), 1);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-services-'));
(async () => { try {
  const pairingFile = path.join(temp, 'pairing.json');
  let clock = 1000;
  const pairing = new PairingService({ filePath: pairingFile, now:() => clock });
  const code = pairing.getStatus().pairingCode;
  const restored = new PairingService({ filePath: pairingFile, now:() => clock });
  assert.equal(restored.getStatus().pairingCode, code, 'O código deve persistir entre aberturas.');
  const request = restored.requestPairing({ code, name:'Teste', clientId:'client-a' });
  assert.equal(restored.complete(request.requestId, request.requestSecret).status, 'pending');
  assert.equal(restored.decide(request.requestId, true), true);
  const result = restored.complete(request.requestId, request.requestSecret);
  assert.equal(result.status, 'paired');
  assert.ok(restored.authenticate(result.token));
  assert.throws(() => restored.rotateCode(), PairingError);
  restored.rotateCode({ confirmed:true });
  assert.notEqual(restored.getStatus().pairingCode, code);

  const updater = new EventEmitter();
  updater.checkForUpdates = async () => { updater.emit('update-available', {version:'2.4.6'}); return {isUpdateAvailable:true, updateInfo:{version:'2.4.6'}}; };
  updater.downloadUpdate = async () => { updater.emit('update-downloaded', {version:'2.4.6'}); };
  let installed = false;
  updater.quitAndInstall = () => { installed = true; };
  let state;
  const service = createUpdateService({ updater, currentVersion:'2.4.5', timers:{setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>2,clearInterval:()=>{}}, onState:value=>{state=value;} });
  service.start();
  await service.check({manual:true});
  assert.equal(state.status, 'available');
  await service.download('2.4.6');
  assert.equal(state.status, 'downloaded');
  await service.install();
  assert.equal(installed, true);
  console.log('Serviços globais: pareamento persistente, aprovação, rotação e updater sem download automático validados.');
} finally { fs.rmSync(temp, {recursive:true,force:true}); } })().catch(error => { console.error(error); process.exitCode=1; });
