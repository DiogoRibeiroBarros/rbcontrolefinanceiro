import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {verifyMobileLicense} from '../src/domain/license';
test('mobile verifica licença assinada, instalação e prazo offline',()=>{const k=generateKeyPairSync('ed25519'),key=k.publicKey.export({type:'spki',format:'pem'}).toString(),now=Date.now();const p={version:1,issuer:'rb-commercial',audience:'rb-gestao',plan:'PRO',status:'active',installationId:'phone',issuedAt:new Date(now).toISOString(),offlineGraceUntil:new Date(now+86400000).toISOString()};const payload=Buffer.from(JSON.stringify(p)).toString('base64url'),e={payload,signature:sign(null,Buffer.from(payload),k.privateKey).toString('base64url')};assert.equal(verifyMobileLicense(e,key,'phone',now).plan,'PRO');assert.equal(verifyMobileLicense(e,key,'other',now),null);assert.equal(verifyMobileLicense(e,key,'phone',now+2*86400000),null);assert.equal(verifyMobileLicense({...e,payload:payload+'A'},key,'phone',now),null);});
test('cache usa AES-GCM, migra legado e rejeita adulteração sem apagá-lo',async()=>{
 const disk=new Map<string,string>(),vault=new Map<string,string>();
 const storage={getItem:async(k:string)=>disk.get(k)||null,setItem:async(k:string,v:string)=>{disk.set(k,v);},removeItem:async(k:string)=>{disk.delete(k);}};
 const key=(raw:Buffer)=>({raw,encoded:async()=>raw.toString('hex')});
 const cryptoAdapter={AESEncryptionKey:{generate:async()=>key(randomBytes(32)),import:async(raw:string)=>key(Buffer.from(raw,'hex'))},AESSealedData:{fromCombined:(x:Uint8Array)=>Buffer.from(x)},aesEncryptAsync:async(plain:Uint8Array,k:any,o:any)=>{const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',k.raw,iv);c.setAAD(Buffer.from(o.additionalData));const cipher=Buffer.concat([c.update(plain),c.final()]);return {combined:async()=>Buffer.concat([iv,cipher,c.getAuthTag()])};},aesDecryptAsync:async(sealed:Buffer,k:any,o:any)=>{const d=createDecipheriv('aes-256-gcm',k.raw,sealed.subarray(0,12));d.setAAD(Buffer.from(o.additionalData));d.setAuthTag(sealed.subarray(-16));return Buffer.concat([d.update(sealed.subarray(12,-16)),d.final()]);}};
 const exports:any={};const source=readFileSync(new URL('../src/platform/encryptedOfflineStore.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,TextEncoder,TextDecoder,Uint8Array,require:(id:string)=>id==='expo-crypto'?cryptoAdapter:id==='expo-secure-store'?{getItemAsync:async(k:string)=>vault.get(k)||null,setItemAsync:async(k:string,v:string)=>vault.set(k,v)}:storage});
 const store=new exports.EncryptedOfflineStore('test-cache'),plain=JSON.stringify({salary:4567,profile:'João'});disk.set('test-cache',plain);assert.equal(await store.migrate(),plain);assert.equal(disk.has('test-cache'),false);assert.ok(!disk.get('test-cache.encrypted-v2')!.includes('salary'));assert.equal(vault.size,1);const envelope=JSON.parse(disk.get('test-cache.encrypted-v2')!);envelope.sealed[20]^=1;disk.set('test-cache.encrypted-v2',JSON.stringify(envelope));await assert.rejects(()=>store.getItem());assert.ok(disk.has('test-cache.encrypted-v2'));
});
