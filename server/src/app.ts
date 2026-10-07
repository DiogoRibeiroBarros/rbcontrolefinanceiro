import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import {Prisma,PrismaClient} from '@prisma/client';
import {z} from 'zod';
import nodemailer from 'nodemailer';
import {readFile} from 'node:fs/promises';
import {catalog,effectivePlan} from './plans/catalog.js';
import {token,digest,hashPassword,verifyPassword,signedLicense} from './security/crypto.js';
import {configuration} from './config.js';
import {MercadoPagoProvider,MockProvider} from './payments/provider.js';

const email=z.string().email().max(254).transform(x=>x.trim().toLowerCase());
const password=z.string().min(12).max(128);
const fail=(statusCode:number,message:string)=>Object.assign(new Error(message),{statusCode});
const day=86400000;
type Tx=Prisma.TransactionClient;
export async function buildApp(db:PrismaClient,config=configuration()){
 const api=Fastify({bodyLimit:16384,disableRequestLogging:true,logger:{level:'info',serializers:{req:r=>({method:r.method}),res:r=>({statusCode:r.statusCode}),err:e=>({type:e.name,message:"Request failed",stack:""})}}});
 await api.register(rateLimit,{max:60,timeWindow:'1 minute'});
 const provider=config.provider==='mercadopago'?new MercadoPagoProvider(process.env,config.baseUrl):new MockProvider(config.baseUrl);
 if(!['mock','mercadopago'].includes(config.provider))throw new Error('Unknown payment provider');
 const mailer=process.env.SMTP_URL?nodemailer.createTransport(process.env.SMTP_URL):null;
 api.addHook('onSend',async(_req,reply,payload)=>{reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff').header('Referrer-Policy','no-referrer').header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");return payload;});
 api.setErrorHandler((error,_req,reply)=>{const code=error instanceof z.ZodError?400:(error as any).statusCode||((error as any).code==='P2002'?409:500);reply.code(code).send({error:code===500?'Serviço temporariamente indisponível':code===409?'Operação em conflito':error instanceof z.ZodError?'Campos inválidos':(error as Error).message});});
 for(const [id,data] of Object.entries(catalog))await db.plan.upsert({where:{id},create:{id,...data},update:{}});
 async function auth(req:any){const raw=String(req.headers.authorization||'');if(!raw.startsWith('Bearer '))throw fail(401,'Entre na conta RB');const session=await db.session.findUnique({where:{accessHash:digest(raw.slice(7))},include:{user:true}});if(!session||session.revokedAt||session.expiresAt.getTime()<Date.now()||session.accessExpiresAt.getTime()<Date.now()||session.user.status!=='active')throw fail(401,'Sessão expirada');if(session.deviceId){const device=await db.device.findUnique({where:{id:session.deviceId}});if(!device||device.revokedAt)throw fail(401,'Dispositivo revogado');}return session;}
 async function lock(tx:Tx,userId:string){await tx.$executeRaw`SELECT 1 FROM "User" WHERE id=${userId} FOR UPDATE`;}
 async function sessionFor(tx:Tx,userId:string,deviceId?:string){const accessToken=token(),refreshToken=token();await tx.session.create({data:{userId,deviceId,accessHash:digest(accessToken),refreshHash:digest(refreshToken),accessExpiresAt:new Date(Date.now()+900000),expiresAt:new Date(Date.now()+30*day)}});return {accessToken,refreshToken,expiresIn:900};}
 async function sendAction(user:{id:string;email:string},kind:string){const raw=token();await db.actionToken.create({data:{userId:user.id,kind,tokenHash:digest(raw),expiresAt:new Date(Date.now()+3600000)}});if(mailer)await mailer.sendMail({from:process.env.MAIL_FROM,to:user.email,subject:kind==='verify'?'Confirme sua conta RB':'Recuperação da conta RB',text:`Abra ${config.baseUrl}/portal/#${kind}=${raw}\nO link expira em uma hora. Se não solicitou, ignore.`});}
 const authRate={config:{rateLimit:{max:8,timeWindow:'1 minute'}}};
 api.get('/health',async()=>({ok:true}));
 api.get('/v1/plans',async()=>({plans:await db.plan.findMany(),termsVersion:config.termsVersion}));
 api.post('/v1/auth/register',authRate,async(req,reply)=>{
  const b=z.object({name:z.string().trim().min(1).max(100),email,password,termsVersion:z.literal(config.termsVersion)}).strict().parse(req.body);
  const hash=await hashPassword(b.password);
  const user=await db.$transaction(async (tx:Tx)=>{const claimed=await tx.trialClaim.findUnique({where:{emailHash:digest(b.email)}});const u=await tx.user.create({data:{name:b.name,email:b.email,passwordHash:hash,termsVersion:b.termsVersion,subscription:{create:{plan:claimed?'FREE':'PRO',status:claimed?'expired':'trialing',trialEndsAt:claimed?null:new Date(Date.now()+14*day)}}}});await tx.trialClaim.upsert({where:{emailHash:digest(b.email)},create:{emailHash:digest(b.email)},update:{}});return u;});
  await sendAction(user,'verify');reply.code(201);return {message:'Conta criada. Verifique seu e-mail para ativar o teste PRO.'};
 });
 api.post('/v1/auth/login',authRate,async req=>{const b=z.object({email,password:z.string().max(128)}).strict().parse(req.body);const user=await db.user.findUnique({where:{email:b.email}});if(!user||user.status!=='active'||!await verifyPassword(user.passwordHash,b.password))throw fail(401,'E-mail ou senha inválidos');return db.$transaction(async (tx:Tx)=>{await tx.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});return sessionFor(tx,user.id);});});
 api.post('/v1/auth/refresh',authRate,async req=>{const b=z.object({refreshToken:z.string().min(40).max(100)}).strict().parse(req.body);return db.$transaction(async (tx:Tx)=>{const old=await tx.session.findUnique({where:{refreshHash:digest(b.refreshToken)},include:{user:true}});if(!old)throw fail(401,'Sessão expirada');await lock(tx,old.userId);const current=await tx.session.findUniqueOrThrow({where:{id:old.id}});if(current.revokedAt||current.expiresAt.getTime()<Date.now()||old.user.status!=='active')throw fail(401,'Sessão revogada');if(old.deviceId){const d=await tx.device.findUnique({where:{id:old.deviceId}});if(!d||d.revokedAt)throw fail(401,'Dispositivo revogado');}await tx.session.update({where:{id:old.id},data:{revokedAt:new Date()}});return sessionFor(tx,old.userId,old.deviceId||undefined);});});
 api.post('/v1/auth/logout',async req=>{const s=await auth(req);await db.session.update({where:{id:s.id},data:{revokedAt:new Date()}});return {ok:true};});
 api.post('/v1/auth/forgot-password',authRate,async req=>{const b=z.object({email}).strict().parse(req.body),u=await db.user.findUnique({where:{email:b.email}});if(u)await sendAction(u,'reset');return {message:'Se a conta existir, enviaremos instruções.'};});
 api.post('/v1/auth/verification',authRate,async req=>{const s=await auth(req);await sendAction(s.user,'verify');return {ok:true};});
 for(const kind of ['verify','reset'])api.post(`/v1/auth/${kind}`,authRate,async req=>{const b=(kind==='reset'?z.object({token:z.string().max(100),password}):z.object({token:z.string().max(100)})).strict().parse(req.body);const hash='password'in b?await hashPassword(String(b.password)):null;await db.$transaction(async (tx:Tx)=>{const a=await tx.actionToken.findUnique({where:{tokenHash:digest(b.token)}});if(!a)throw fail(400,'Link inválido');await lock(tx,a.userId);const fresh=await tx.actionToken.findUniqueOrThrow({where:{id:a.id}});if(fresh.kind!==kind||fresh.usedAt||fresh.expiresAt.getTime()<Date.now())throw fail(400,'Link expirado');await tx.actionToken.updateMany({where:{userId:a.userId,kind,usedAt:null},data:{usedAt:new Date()}});await tx.user.update({where:{id:a.userId},data:hash?{passwordHash:hash}:{emailVerifiedAt:new Date()}});if(hash)await tx.session.updateMany({where:{userId:a.userId},data:{revokedAt:new Date()}});});return {ok:true};});
 api.post('/v1/auth/change-password',async req=>{const s=await auth(req),b=z.object({currentPassword:z.string().max(128),password}).strict().parse(req.body);if(!await verifyPassword(s.user.passwordHash,b.currentPassword))throw fail(403,'Senha atual inválida');const hash=await hashPassword(b.password);await db.$transaction([db.user.update({where:{id:s.userId},data:{passwordHash:hash}}),db.session.updateMany({where:{userId:s.userId},data:{revokedAt:new Date()}})]);return {ok:true};});
 api.get('/v1/account',async req=>{const s=await auth(req),subscription=await db.subscription.findUnique({where:{userId:s.userId}});return {user:{id:s.userId,name:s.user.name,email:s.user.email,verified:!!s.user.emailVerifiedAt},subscription,plan:s.user.emailVerifiedAt?effectivePlan(subscription):'FREE',installationCount:await db.device.count({where:{userId:s.userId,revokedAt:null}})};});
 api.get('/v1/sessions',async req=>{const s=await auth(req);return db.session.findMany({where:{userId:s.userId,revokedAt:null},select:{id:true,createdAt:true,expiresAt:true,deviceId:true}});});
 api.delete('/v1/sessions/:id',async req=>{const s=await auth(req),id=z.object({id:z.string()}).parse(req.params).id;await db.session.updateMany({where:{id,userId:s.userId},data:{revokedAt:new Date()}});return {ok:true};});
 api.get('/v1/devices',async req=>{const s=await auth(req);return db.device.findMany({where:{userId:s.userId}});});
 api.delete('/v1/devices/:id',async req=>{const s=await auth(req),id=z.object({id:z.string()}).parse(req.params).id;await db.$transaction(async (tx:Tx)=>{await lock(tx,s.userId);await tx.device.updateMany({where:{id,userId:s.userId},data:{revokedAt:new Date()}});await tx.session.updateMany({where:{userId:s.userId,deviceId:id},data:{revokedAt:new Date()}});});return {ok:true};});
 api.post('/v1/licenses/activate',async req=>{
  const s=await auth(req),b=z.object({installationId:z.string().uuid(),name:z.string().min(1).max(100),platform:z.enum(['windows','android','ios']),appVersion:z.string().max(30),parentId:z.string().uuid().optional()}).strict().parse(req.body);
  return db.$transaction(async (tx:Tx)=>{await lock(tx,s.userId);const sub=await tx.subscription.findUnique({where:{userId:s.userId}}),plan=s.user.emailVerifiedAt?effectivePlan(sub):'FREE',rights=await tx.plan.findUniqueOrThrow({where:{id:plan}}),limits=rights.limits as {devices:number};
   let d=await tx.device.findUnique({where:{userId_installationId:{userId:s.userId,installationId:b.installationId}}});if(d?.revokedAt)throw fail(403,'Dispositivo revogado. Registre uma nova instalação após entrar novamente.');
   if(b.parentId&&!await tx.device.findFirst({where:{id:b.parentId,userId:s.userId,revokedAt:null}}))throw fail(400,'Dispositivo pai inválido');
   const devices=await tx.device.findMany({where:{userId:s.userId,revokedAt:null},orderBy:[{activatedAt:'asc'},{id:'asc'}]});
   if(!d&&devices.length>=limits.devices)throw fail(409,'Limite de dispositivos atingido');if(d&&devices.findIndex((x:typeof devices[number])=>x.id===d!.id)>=limits.devices)throw fail(403,'Dispositivo acima do limite do plano');
   d=await tx.device.upsert({where:{userId_installationId:{userId:s.userId,installationId:b.installationId}},create:{userId:s.userId,...b},update:{name:b.name,appVersion:b.appVersion,lastCheckAt:new Date()}});
   await tx.session.update({where:{id:s.id},data:{deviceId:d.id}});
   const now=Date.now(),end=plan==='FREE'?now+7*day:(sub?.status==='trialing'?sub.trialEndsAt:sub?.currentPeriodEnd)?.getTime()||now;
   return signedLicense({version:1,issuer:'rb-commercial',audience:'rb-gestao',licenseId:sub!.id,customerId:s.userId,installationId:b.installationId,deviceId:d.id,plan,status:plan==='FREE'?'free':sub!.status,issuedAt:new Date(now).toISOString(),validUntil:new Date(Math.min(end,now+day)).toISOString(),offlineGraceUntil:new Date(Math.min(end,now+7*day)).toISOString(),entitlements:{features:rights.features,limits:rights.limits},flags:rights.flags},config.privateKey);
  });
 });
 api.post('/v1/payments/checkout',async req=>{const s=await auth(req);if(!s.user.emailVerifiedAt)throw fail(403,'Confirme seu e-mail');const b=z.object({plan:z.enum(['PRO','BUSINESS'])}).strict().parse(req.body);const sub=await db.subscription.findUniqueOrThrow({where:{userId:s.userId}});if(sub.providerId&&sub.status==='active')throw fail(409,'Cancele a renovação existente antes de contratar outro plano');const result=await provider.createCheckout(s.userId,s.user.email,b.plan);await db.subscription.update({where:{userId:s.userId},data:{provider:config.provider,providerId:result.id,pendingPlan:b.plan}});return {url:result.url};});
 api.post('/v1/payments/cancel',async req=>{const s=await auth(req),sub=await db.subscription.findUniqueOrThrow({where:{userId:s.userId}});if(sub.providerId)await provider.cancelSubscription(sub.providerId);await db.subscription.update({where:{id:sub.id},data:{status:'canceled',canceledAt:new Date()}});return {ok:true};});
 api.post('/webhooks/payment',async(req,reply)=>{
  const q=req.query as Record<string,string>,b=req.body as any,id=String(q['data.id']||b?.data?.id||'');if(!provider.validateWebhook(req.headers,id))throw fail(401,'Invalid webhook');
  if((b?.type||q.type)!=='subscription_preapproval')return {ignored:true};
  const eventId=digest(`${req.headers['x-request-id']}:${id}`);if(await db.webhookEvent.findUnique({where:{id:eventId}}))return {ok:true};
  const state=await provider.getSubscription(id);await db.$transaction(async (tx:Tx)=>{await lock(tx,state.customerId);const sub=await tx.subscription.findUnique({where:{userId:state.customerId}});if(!sub||sub.providerId!==state.id)throw fail(400,'Unknown subscription');if(await tx.webhookEvent.findUnique({where:{id:eventId}}))return;
   await tx.subscription.update({where:{id:sub.id},data:{status:state.status,plan:state.status==='active'?state.plan:sub.plan,currentPeriodEnd:state.periodEnd||sub.currentPeriodEnd,canceledAt:state.status==='canceled'?new Date():sub.canceledAt}});await tx.webhookEvent.create({data:{id:eventId,provider:config.provider}});});reply.code(200);return {ok:true};
 });
 if(!config.production&&config.provider==='mock')api.post('/v1/development/subscribe',async req=>{const s=await auth(req),b=z.object({plan:z.enum(['FREE','PRO','BUSINESS'])}).strict().parse(req.body);await db.subscription.update({where:{userId:s.userId},data:{plan:b.plan,status:'active',currentPeriodEnd:new Date(Date.now()+30*day)}});return {ok:true};});
 api.get('/v1/account/export',async req=>{const s=await auth(req);return {user:{name:s.user.name,email:s.user.email,createdAt:s.user.createdAt,termsVersion:s.user.termsVersion,consentAt:s.user.consentAt},subscription:await db.subscription.findUnique({where:{userId:s.userId}}),devices:await db.device.findMany({where:{userId:s.userId}})};});
 api.delete('/v1/account',async req=>{const s=await auth(req),b=z.object({password}).strict().parse(req.body);if(!await verifyPassword(s.user.passwordHash,b.password))throw fail(403,'Senha inválida');const sub=await db.subscription.findUnique({where:{userId:s.userId}});if(sub?.providerId)await provider.cancelSubscription(sub.providerId);await db.user.delete({where:{id:s.userId}});return {ok:true,message:'Conta RB excluída. Dados financeiros locais preservados.'};});
 api.get('/v1/downloads',async()=>({url:process.env.DOWNLOAD_URL||null}));
 for(const [route,file,type]of [['/portal/','index.html','text/html'],['/portal/app.js','app.js','text/javascript'],['/portal/style.css','style.css','text/css']])api.get(route,async(_req,reply)=>reply.type(type).send(await readFile(new URL(`../portal/${file}`,import.meta.url),'utf8').catch(()=>readFile(new URL(`../../portal/${file}`,import.meta.url),'utf8'))));
 return api;
}



