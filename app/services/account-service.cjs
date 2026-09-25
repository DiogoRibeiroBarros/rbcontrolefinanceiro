'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {FREE,verifyLicense,EntitlementService}=require('./license-service.cjs');
class AccountService{
 constructor({directory,vault,config,version,fetcher=fetch,now=Date.now}){
  this.vault=vault;this.config=config;this.version=version;this.fetcher=fetcher;this.now=now;
  fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,'commercial-installation.json');
  if(fs.existsSync(file))this.installationId=JSON.parse(fs.readFileSync(file,'utf8')).id;else{this.installationId=randomUUID();fs.writeFileSync(file,JSON.stringify({id:this.installationId}));}
  this.data=vault.load();this.rights=new EntitlementService(()=>this.license());this.refreshing=null;
 }
 license(){return verifyLicense(this.data.license,this.config.publicKey,this.installationId,this.now(),this.data.lastSeen||0)||FREE;}
 status(){return {configured:!!this.config.apiUrl,installationId:this.installationId,appVersion:this.version,user:this.data.user||null,subscription:this.data.subscription||null,license:this.license(),message:this.message||'',onboarded:!!this.data.onboarded};}
 persist(){this.data.lastSeen=Math.max(this.data.lastSeen||0,this.now());this.vault.save(this.data);}
 async request(endpoint,body,method='POST',retry=true){
  const base=new URL(this.config.apiUrl);if(base.protocol!=='https:'&&!(this.config.development&&['localhost','127.0.0.1'].includes(base.hostname)))throw new Error('Configure a API comercial HTTPS');
  const response=await this.fetcher(new URL(endpoint,base),{method,headers:{'Content-Type':'application/json',...(this.data.accessToken?{Authorization:'Bearer '+this.data.accessToken}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000),redirect:'error'});
  if(response.status===401&&retry&&this.data.refreshToken&&endpoint!=='/v1/auth/refresh'){
   const tokens=await this.request('/v1/auth/refresh',{refreshToken:this.data.refreshToken},'POST',false);Object.assign(this.data,tokens);this.persist();return this.request(endpoint,body,method,false);
  }
  const result=await response.json();if(!response.ok){const e=new Error(result.error||'Serviço indisponível');e.status=response.status;throw e;}return result;
 }
 async login(input){const tokens=await this.request('/v1/auth/login',{email:String(input.email||''),password:String(input.password||'')},'POST',false);this.data={...tokens,onboarded:true,lastSeen:this.now()};this.persist();return this.refresh();}
 async register(input){return this.request('/v1/auth/register',{name:String(input.name||''),email:String(input.email||''),password:String(input.password||''),termsVersion:String(input.termsVersion||'')});}
 async refresh(){if(this.refreshing)return this.refreshing;this.refreshing=this.refreshInternal().finally(()=>{this.refreshing=null;});return this.refreshing;}
 async refreshInternal(){
  if(!this.data.accessToken){this.persist();return this.status();}
  try{const account=await this.request('/v1/account',undefined,'GET');this.data.user=account.user;this.data.subscription=account.subscription;
   const license=await this.request('/v1/licenses/activate',{installationId:this.installationId,name:'RB Windows',platform:'windows',appVersion:this.version});
   if(!verifyLicense(license,this.config.publicKey,this.installationId,this.now()))throw new Error('A assinatura da licença não foi validada');this.data.license=license;this.message='Licença atualizada';
  }catch(e){if([401,403,409].includes(e.status)){delete this.data.license;if(e.status===401){delete this.data.accessToken;delete this.data.refreshToken;}}this.message=e.status?'Entre novamente ou gerencie os dispositivos da conta.':'Sem conexão com o servidor. A licença anterior vale até o fim da tolerância.';}
  this.persist();return this.status();
 }
 async logout(){try{if(this.data.accessToken)await this.request('/v1/auth/logout',{});}finally{this.data={onboarded:true,lastSeen:this.now()};this.persist();}return this.status();}
 continueFree(){this.data.onboarded=true;this.persist();return this.status();}
 async action(name,input={}){
  if(name==='status')return this.status();if(name==='login')return this.login(input);if(name==='register')return this.register(input);if(name==='refresh')return this.refresh();if(name==='logout')return this.logout();if(name==='free')return this.continueFree();
  if(name==='devices')return this.request('/v1/devices',undefined,'GET');
  if(name==='revoke')return this.request('/v1/devices/'+encodeURIComponent(String(input.id)),undefined,'DELETE');
  if(name==='forgot')return this.request('/v1/auth/forgot-password',{email:String(input.email||'')});
  if(name==='verify')return this.request('/v1/auth/verification',{});
  if(name==='plans')return this.request('/v1/plans',undefined,'GET');
  if(name==='checkout')return this.request('/v1/payments/checkout',{plan:input.plan});
  throw new Error('Ação comercial não permitida');
 }
}
module.exports={AccountService};
