'use strict';
const {verify,createPublicKey}=require('node:crypto');
const FREE=Object.freeze({plan:'FREE',status:'free',entitlements:{features:{},limits:{profiles:1,devices:1}},flags:{}});
function verifyLicense(envelope,publicKey,installationId,now=Date.now(),lastSeen=0){
 try{
  if(!envelope||typeof envelope.payload!=='string'||envelope.payload.length>20000||typeof envelope.signature!=='string')return null;
  if(!verify(null,Buffer.from(envelope.payload),createPublicKey(publicKey),Buffer.from(envelope.signature,'base64url')))return null;
  const p=JSON.parse(Buffer.from(envelope.payload,'base64url').toString('utf8'));
  const issued=Date.parse(p.issuedAt),valid=Date.parse(p.validUntil),grace=Date.parse(p.offlineGraceUntil);
  if(p.version!==1||p.issuer!=='rb-commercial'||p.audience!=='rb-gestao'||p.installationId!==installationId||!['FREE','PRO','BUSINESS'].includes(p.plan)||['expired','suspended','revoked'].includes(p.status)||![issued,valid,grace].every(Number.isFinite)||now<issued-300000||now<lastSeen-300000||now>grace||valid>grace||grace-issued>7*86400000||!p.entitlements?.features||!p.entitlements?.limits)return null;
  return {...p,offline:now>valid};
 }catch{return null;}
}
class EntitlementService{
 constructor(read){this.read=read;}
 can(feature){return this.read()?.entitlements?.features?.[feature]===true;}
 limit(name){const n=this.read()?.entitlements?.limits?.[name];return Number.isSafeInteger(n)&&n>=0?n:FREE.entitlements.limits[name]||0;}
 require(feature){if(!this.can(feature))throw new Error('Este recurso requer PRO. Seus dados continuam preservados.');}
}
module.exports={FREE,verifyLicense,EntitlementService};
