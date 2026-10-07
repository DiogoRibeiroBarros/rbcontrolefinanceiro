import {generateKeyPairSync} from 'node:crypto';
export function configuration(env=process.env){
  const production=env.RB_ENV==='production';
  let privateKey=(env.LICENSE_PRIVATE_KEY||'').replace(/\\n/g,'\n'),publicKey=(env.LICENSE_PUBLIC_KEY||'').replace(/\\n/g,'\n');
  if(!privateKey||!publicKey){if(production)throw new Error('License signing keys required');const keys=generateKeyPairSync('ed25519');privateKey=keys.privateKey.export({type:'pkcs8',format:'pem'}).toString();publicKey=keys.publicKey.export({type:'spki',format:'pem'}).toString();}
  const baseUrl=env.APP_BASE_URL||'http://localhost:3080',provider=env.PAYMENT_PROVIDER||'mock';
  if(production&&(!baseUrl.startsWith('https://')||provider==='mock'||!env.SMTP_URL||!env.MAIL_FROM))throw new Error('Production requires HTTPS, SMTP and a real payment provider');
  return {production,privateKey,publicKey,baseUrl,provider,termsVersion:env.TERMS_VERSION||'2026-09-23',adminEmail:(env.ADMIN_EMAIL||'').trim().toLowerCase(),adminPasswordHash:env.ADMIN_PASSWORD_HASH||'',adminSessionSecret:env.ADMIN_SESSION_SECRET||''};
}
