import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {buildApp} from '../src/app.js';
import {digest} from '../src/security/crypto.js';

test('PostgreSQL: conta, sessão, trial, limites concorrentes, revogação e exclusão', {skip:!process.env.DATABASE_URL},async()=>{
 const db=new PrismaClient(),app=await buildApp(db),email=`test-${randomUUID()}@example.test`,password='Sufficient-test-password!';
 const call=(method:any,url:string,body?:unknown,access='')=>app.inject({method,url,payload:body,headers:access?{authorization:'Bearer '+access}:{}});
 let userId='';
 try{
  assert.equal((await call('POST','/v1/auth/register',{name:'Teste',email,password,termsVersion:'2026-09-23',transactions:[]})).statusCode,400);
  assert.equal((await call('POST','/v1/auth/register',{name:'Teste',email,password,termsVersion:'2026-09-23'})).statusCode,201);
  const user=await db.user.findUniqueOrThrow({where:{email}});userId=user.id;
  assert.equal((await call('POST','/v1/auth/login',{email,password:'wrong'})).statusCode,401);
  const tokens=(await call('POST','/v1/auth/login',{email,password})).json();assert.ok(tokens.refreshToken);
  let access=tokens.accessToken;
  assert.equal((await call('GET','/v1/account',undefined,access)).json().plan,'FREE');
  const verification='a'.repeat(43);await db.actionToken.create({data:{userId,kind:'verify',tokenHash:digest(verification),expiresAt:new Date(Date.now()+60000)}});
  assert.equal((await call('POST','/v1/auth/verify',{token:verification})).statusCode,200);
  assert.equal((await call('POST','/v1/auth/verify',{token:verification})).statusCode,400);
  assert.equal((await call('GET','/v1/account',undefined,access)).json().plan,'PRO');
  const refreshed=(await call('POST','/v1/auth/refresh',{refreshToken:tokens.refreshToken})).json();access=refreshed.accessToken;
  assert.equal((await call('POST','/v1/auth/refresh',{refreshToken:tokens.refreshToken})).statusCode,401);
  const installationId=randomUUID(),device={installationId,name:'PC teste',platform:'windows',appVersion:'2.4.22'};
  const license=(await call('POST','/v1/licenses/activate',device,access)).json();assert.ok(license.signature);
  const devices=(await call('GET','/v1/devices',undefined,access)).json();assert.equal(devices.length,1);
  assert.equal((await call('POST','/v1/licenses/activate',device,access)).statusCode,200);
  await db.subscription.update({where:{userId},data:{status:'expired'}});
  assert.equal((await call('POST','/v1/licenses/activate',{...device,installationId:randomUUID()},access)).statusCode,409);
  assert.equal((await call('DELETE','/v1/devices/'+devices[0].id,undefined,access)).statusCode,200);
  assert.equal((await call('GET','/v1/account',undefined,access)).statusCode,401);
  const again=(await call('POST','/v1/auth/login',{email,password})).json();access=again.accessToken;
  assert.equal((await call('POST','/v1/licenses/activate',device,access)).statusCode,403);
  const results=await Promise.all([1,2].map(()=>call('POST','/v1/licenses/activate',{...device,installationId:randomUUID()},access)));
  assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,409]);
  assert.equal((await call('POST','/webhooks/payment',{data:{id:'fake'}})).statusCode,401);
  assert.equal((await call('GET','/v1/account/export',undefined,access)).statusCode,200);
  assert.equal((await call('DELETE','/v1/account',{password},access)).statusCode,200);
  assert.equal(await db.user.findUnique({where:{id:userId}}),null);
  assert.ok(await db.trialClaim.findUnique({where:{emailHash:digest(email)}}));
 }finally{if(userId)await db.user.deleteMany({where:{id:userId}});await db.trialClaim.deleteMany({where:{emailHash:digest(email)}});await app.close();await db.$disconnect();}
});
