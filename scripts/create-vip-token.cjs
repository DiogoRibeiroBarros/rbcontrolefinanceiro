'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {createVipLicense}=require('../app/services/vip-token-service.cjs');
const privateKeyPath=process.env.RB_VIP_PRIVATE_KEY||process.argv[2];
const installationId=process.env.RB_VIP_INSTALLATION_ID||process.argv[3];
const validUntil=process.env.RB_VIP_VALID_UNTIL||process.argv[4];
if(!privateKeyPath||!installationId){console.error('Uso: RB_VIP_PRIVATE_KEY=admin-private.pem RB_VIP_INSTALLATION_ID=... RB_VIP_VALID_UNTIL=2027-01-01 node scripts/create-vip-token.cjs');process.exit(1);}
const token=createVipLicense({privateKey:fs.readFileSync(path.resolve(privateKeyPath)),installationId,validUntil,name:process.env.RB_VIP_NAME||'Cliente VIP'});
process.stdout.write(JSON.stringify(token)+'\n');
