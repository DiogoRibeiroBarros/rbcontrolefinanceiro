'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createVipLicense}=require('../app/services/vip-token-service.cjs');
const {verifyLicense}=require('../app/services/license-service.cjs');
test('token VIP é assinado e validado somente para a instalação correta',()=>{
  const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
  const token=createVipLicense({privateKey:keys.privateKey.export({type:'pkcs8',format:'pem'}),installationId:'inst-vip',validUntil:'2030-01-01T00:00:00.000Z'});
  const pub=keys.publicKey.export({type:'spki',format:'pem'});
  assert.ok(verifyLicense(token,pub,'inst-vip',Date.parse('2027-01-01')));
  assert.equal(verifyLicense(token,pub,'outra',Date.parse('2027-01-01')),null);
});
