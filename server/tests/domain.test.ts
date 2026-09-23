import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {catalog,effectivePlan} from '../src/plans/catalog.js';
import {hashPassword,verifyPassword,signedLicense,sanitize} from '../src/security/crypto.js';
import {configuration} from '../src/config.js';
test('planos e estados da assinatura',()=>{const tomorrow=new Date(Date.now()+86400000),yesterday=new Date(Date.now()-86400000);for(const plan of ['PRO','BUSINESS'])for(const status of ['active','canceled','past_due','trialing'])assert.equal(effectivePlan({plan,status,currentPeriodEnd:tomorrow,trialEndsAt:tomorrow}),plan);for(const status of ['expired','suspended','canceled','trialing'])assert.equal(effectivePlan({plan:'PRO',status,currentPeriodEnd:yesterday,trialEndsAt:yesterday}),'FREE');assert.equal(catalog.FREE.features.mobileAccess,false);assert.ok(catalog.BUSINESS.limits.devices>catalog.PRO.limits.devices);});
test('Argon2id, assinatura e redaction',async()=>{const hash=await hashPassword('password-test-12345');assert.ok(hash.startsWith('$argon2id$'));assert.equal(await verifyPassword(hash,'password-test-12345'),true);assert.equal(await verifyPassword(hash,'wrong'),false);const k=generateKeyPairSync('ed25519'),signed=signedLicense({plan:'PRO'},k.privateKey.export({format:'pem',type:'pkcs8'}).toString());assert.ok(verify(null,Buffer.from(signed.payload),k.publicKey,Buffer.from(signed.signature,'base64url')));assert.deepEqual(sanitize({refreshToken:'secret',profileStore:{entries:[]}}),{refreshToken:'[REDACTED]',profileStore:'[REDACTED]'});});
test('produção recusa configuração mock/incompleta',()=>assert.throws(()=>configuration({RB_ENV:'production'})));
