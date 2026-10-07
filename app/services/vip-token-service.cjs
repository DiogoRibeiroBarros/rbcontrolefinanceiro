'use strict';
const crypto=require('node:crypto');

function createVipLicense({privateKey,installationId,name='Cliente VIP',validUntil,features={mobileAccess:true,automaticBackup:true},limits={profiles:20,devices:10},now=Date.now()}){
  if(!privateKey)throw new Error('Chave privada VIP não informada.');
  if(!installationId)throw new Error('installationId obrigatório.');
  const issuedAt=new Date(now).toISOString();
  const valid=new Date(validUntil||now+30*86400000);
  if(!Number.isFinite(valid.getTime())||valid.getTime()<=now)throw new Error('validUntil inválido.');
  const payload={version:1,issuer:'rb-commercial',audience:'rb-gestao',installationId,plan:'PRO',status:'active',issuedAt,validUntil:valid.toISOString(),offlineGraceUntil:new Date(valid.getTime()+7*86400000).toISOString(),entitlements:{features,limits},metadata:{name,manual:true}};
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature=crypto.sign(null,Buffer.from(encoded),crypto.createPrivateKey(privateKey)).toString('base64url');
  return {payload:encoded,signature};
}
module.exports={createVipLicense};
