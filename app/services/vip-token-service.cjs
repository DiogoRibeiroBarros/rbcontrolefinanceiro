'use strict';
const crypto=require('node:crypto');

function createVipLicense({privateKey,installationId,name='Cliente VIP',validUntil,features={mobileAccess:true,multipleProfiles:true,advancedReports:true,automaticBackup:true,investments:true,permissions:true,extendedAudit:true,cloudBackup:true},limits={profiles:9999,devices:9999,records:999999},now=Date.now()}){
  if(!privateKey)throw new Error('Chave privada VIP não informada.');
  if(!installationId)throw new Error('installationId obrigatório.');
  const issuedAt=new Date(now).toISOString();
  const valid=new Date('9999-12-31T23:59:59.999Z');
  if(!Number.isFinite(valid.getTime())||valid.getTime()<=now)throw new Error('validUntil inválido.');
  const payload={version:1,issuer:'rb-commercial',audience:'rb-gestao',installationId,plan:'VIP',status:'active',issuedAt,validUntil:valid.toISOString(),offlineGraceUntil:valid.toISOString(),entitlements:{features,limits},metadata:{name,manual:true,perpetual:true}};
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature=crypto.sign(null,Buffer.from(encoded),crypto.createPrivateKey(privateKey)).toString('base64url');
  return {payload:encoded,signature};
}
module.exports={createVipLicense};
