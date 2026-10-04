'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { MobileSyncService } = require('../app/services/mobile-sync-service.cjs');

test('fila móvel é idempotente, detecta conflito e pagina alterações', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-mobile-sync-'));
  const filePath = path.join(dir, 'state.json');
  const applied = [];
  const service = new MobileSyncService({filePath, applyProfileStore: value => applied.push(value)});
  service.seedProfileStore({value:0});
  const operation = {operationId:'op-1', entityType:'profile_store', entityId:'shared', operation:'UPDATE', baseVersion:0, payload:{value:1}};
  assert.equal(service.push('device-a', [{...operation, baseVersion:1}]).results[0].status, 'SUCCESS');
  assert.equal(service.push('device-a', [operation]).results[0].status, 'ALREADY_PROCESSED');
  assert.equal(applied.length, 1);
  const conflict = service.push('device-b', [{...operation, operationId:'op-2', baseVersion:0, payload:{value:2}}]).results[0];
  assert.equal(conflict.status, 'CONFLICT');
  const page = service.pull(0);
  assert.equal(page.changes.length, 2);
  assert.equal(page.nextCursor, 2);
  fs.rmSync(dir, {recursive:true, force:true});
});
