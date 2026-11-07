import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import {Linking} from 'react-native';

const API=(process.env.EXPO_PUBLIC_RB_API_URL||'https://rbfinanceirosite-api.rbgestao.workers.dev').replace(/\/$/,'');
const PORTAL=(process.env.EXPO_PUBLIC_RB_PORTAL_URL||'https://rbfinanceirosite-api.rbgestao.workers.dev/gestao');
const TOKEN='rb_site_auth_token_v2',ID='rb_commercial_installation_v1',ACTIVITY='rb_account_activity_v2';
type StoredToken={token:string};
let idleTimeoutSeconds=3600,lastActivity=0,lastActivitySent=0;

export async function installationId(){let value=await SecureStore.getItemAsync(ID);if(!value){value=Crypto.randomUUID();await SecureStore.setItemAsync(ID,value);}return value;}
async function storedToken():Promise<StoredToken|null>{const raw=await SecureStore.getItemAsync(TOKEN);if(!raw)return null;try{const value=JSON.parse(raw);return typeof value?.token==='string'&&value.token.length>20?value:null;}catch{return null;}}
async function request(endpoint:string,body?:unknown,method='POST',authenticated=true):Promise<any>{
  if(!API.startsWith('https://'))throw new Error('Conta RB não está configurada nesta distribuição.');
  const credentials=authenticated?await storedToken():null;
  const response=await fetch(`${API}${endpoint}`,{method,headers:{Accept:'application/json','Content-Type':'application/json',...(credentials?{Authorization:`Bearer ${credentials.token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){if(response.status===401)await SecureStore.deleteItemAsync(TOKEN);throw Object.assign(new Error(result.error||'Não foi possível concluir a solicitação.'),{status:response.status});}
  return result;
}
function normalize(account:any,security:any){return {user:{id:account.id,name:account.name,email:account.email,tenantId:account.tenant_id,role:account.role,canManageUsers:account.can_manage_users===true},tenantId:account.tenant_id,plan:account.plan,subscription:{status:account.subscription_status||account.status},license:{plan:account.plan,offlineGraceUntil:account.plan_expires_at,perpetual:account.plan==='VIP'},idleTimeoutSeconds:Number(security?.idleTimeoutSeconds||3600)};}
export async function accountLogin(email:string,password:string){
  const result=await request('/api/v1/auth/login',{email:email.trim().toLowerCase(),password},'POST',false);
  if(typeof result?.token!=='string')throw new Error('A resposta de login é inválida.');
  await SecureStore.setItemAsync(TOKEN,JSON.stringify({token:result.token}));
  lastActivity=Date.now();await SecureStore.setItemAsync(ACTIVITY,JSON.stringify({at:lastActivity,idleTimeoutSeconds}));
  return accountStatus();
}
export async function accountStatus(){
  const [account,security]=await Promise.all([request('/api/v1/account',undefined,'GET'),request('/api/v1/account/security',undefined,'GET')]);
  const deviceId=await installationId();
  await request('/api/v1/account/device',{installationId:deviceId,name:'RB Gestão Mobile',platform:'android',appVersion:'2.0.18'});
  idleTimeoutSeconds=Math.max(300,Math.min(43200,Number(security?.idleTimeoutSeconds||3600)));lastActivity=lastActivity||Date.now();
  await SecureStore.setItemAsync(ACTIVITY,JSON.stringify({at:lastActivity,idleTimeoutSeconds}));
  return normalize(account,security);
}
export async function restoreAccountSession(){
  const raw=await SecureStore.getItemAsync(ACTIVITY);if(raw){try{const value=JSON.parse(raw);lastActivity=Number(value.at||0);idleTimeoutSeconds=Math.max(300,Math.min(43200,Number(value.idleTimeoutSeconds||3600)));if(lastActivity&&Date.now()-lastActivity>=idleTimeoutSeconds*1000){await accountLogout();throw Object.assign(new Error('Sessão encerrada por inatividade.'),{status:401});}}catch(error){if((error as any).status===401)throw error;}}
  return accountStatus();
}
export async function accountActivity(){
  const now=Date.now();if(lastActivity&&now-lastActivity>=idleTimeoutSeconds*1000){await accountLogout();throw Object.assign(new Error('Sessão encerrada por inatividade.'),{status:401});}
  lastActivity=now;await SecureStore.setItemAsync(ACTIVITY,JSON.stringify({at:lastActivity,idleTimeoutSeconds}));if(now-lastActivitySent<15000)return;lastActivitySent=now;
  const result=await request('/api/v1/auth/activity',{});idleTimeoutSeconds=Math.max(300,Math.min(43200,Number(result?.idleTimeoutSeconds||idleTimeoutSeconds)));
}
export async function accountSessionActive(){const raw=await SecureStore.getItemAsync(ACTIVITY);if(!raw)return false;try{const value=JSON.parse(raw);return Date.now()-Number(value.at||0)<Math.max(300,Math.min(43200,Number(value.idleTimeoutSeconds||3600)))*1000;}catch{return false;}}
export async function accountToken(){return (await storedToken())?.token||null;}
export async function accountLogout(){try{await request('/api/v1/auth/logout',{});}catch{}finally{lastActivity=0;await Promise.all([SecureStore.deleteItemAsync(TOKEN),SecureStore.deleteItemAsync(ACTIVITY)]);}}
export async function openAccountPortal(){if(!PORTAL.startsWith('https://'))throw new Error('Portal ainda não configurado.');await Linking.openURL(PORTAL);}
