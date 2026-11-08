import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import {Linking} from 'react-native';
import {clearAccountVault,loadAccountVault,saveAccountVault,updateAccountVault} from './accountVault';

const API=(process.env.EXPO_PUBLIC_RB_API_URL||'https://rbfinanceirosite-api.rbgestao.workers.dev').replace(/\/$/,'');
const PORTAL=(process.env.EXPO_PUBLIC_RB_PORTAL_URL||'https://rbfinanceirosite-api.rbgestao.workers.dev/gestao');
const ID='rb_commercial_installation_v1',ACTIVITY='rb_account_activity_v2';
let idleTimeoutSeconds=3600,lastActivity=0,lastActivitySent=0;

export async function installationId(){let value=await SecureStore.getItemAsync(ID);if(!value){value=Crypto.randomUUID();await SecureStore.setItemAsync(ID,value);}return value;}
async function request(endpoint:string,body?:unknown,method='POST',authenticated=true):Promise<any>{const vault=authenticated?await loadAccountVault():null;const response=await fetch(`${API}${endpoint}`,{method,headers:{Accept:'application/json','Content-Type':'application/json',...(vault?{Authorization:`Bearer ${vault.token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});const result=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(result.error||'Não foi possível concluir a solicitação.'),{status:response.status});return result;}
function normalize(account:any,security:any){return {user:{id:account.id,name:account.name,email:account.email,tenantId:account.tenant_id,role:account.role,canManageUsers:account.can_manage_users===true},tenantId:account.tenant_id,plan:account.plan,subscription:{status:account.subscription_status||account.status},license:{plan:account.plan,offlineGraceUntil:account.plan_expires_at,perpetual:account.plan==='VIP'},idleTimeoutSeconds:Number(security?.idleTimeoutSeconds||3600)};}
async function saveActivity(){lastActivity=Date.now();await SecureStore.setItemAsync(ACTIVITY,JSON.stringify({at:lastActivity,idleTimeoutSeconds}));}
function readActivity(raw:string|null){try{const v=raw?JSON.parse(raw):null;return {at:Number(v?.at||0),idleTimeoutSeconds:Math.max(300,Math.min(43200,Number(v?.idleTimeoutSeconds||3600)))};}catch{return null;}}
export async function accountLogin(email:string,password:string){const normalizedEmail=email.trim().toLowerCase(),result=await request('/api/v1/auth/login',{email:normalizedEmail,password},'POST',false);if(typeof result?.token!=='string')throw new Error('A resposta de login é inválida.');await saveAccountVault({email:normalizedEmail,password,token:result.token,identity:null,updatedAt:Date.now()});await saveActivity();return accountStatus();}
export async function accountStatus(){const [account,security]=await Promise.all([request('/api/v1/account',undefined,'GET'),request('/api/v1/account/security',undefined,'GET')]);await request('/api/v1/account/device',{installationId:await installationId(),name:'RB Gestão Mobile',platform:'android',appVersion:'2.0.22'});idleTimeoutSeconds=Math.max(300,Math.min(43200,Number(security?.idleTimeoutSeconds||3600)));const identity=normalize(account,security);await updateAccountVault({identity});await saveActivity();return identity;}
export async function restoreAccountSession(){const activity=readActivity(await SecureStore.getItemAsync(ACTIVITY));if(activity){lastActivity=activity.at;idleTimeoutSeconds=activity.idleTimeoutSeconds;}const vault=await loadAccountVault();if(!vault)throw Object.assign(new Error('Nenhuma conta armazenada neste aparelho.'),{status:401});if(vault.identity)return vault.identity;return refreshAccountSession();}
export async function refreshAccountSession(){const vault=await loadAccountVault();if(!vault)throw Object.assign(new Error('Nenhuma conta armazenada neste aparelho.'),{status:401});try{return await accountStatus();}catch(error){if((error as any)?.status!==401){if(vault.identity)return vault.identity;throw error;}return accountLogin(vault.email,vault.password);}}
export async function accountActivity(){const now=Date.now();if(lastActivity&&now-lastActivity>=idleTimeoutSeconds*1000)throw Object.assign(new Error('Sessão encerrada por inatividade.'),{status:401});lastActivity=now;await SecureStore.setItemAsync(ACTIVITY,JSON.stringify({at:lastActivity,idleTimeoutSeconds}));if(now-lastActivitySent<15000)return;lastActivitySent=now;const result=await request('/api/v1/auth/activity',{});idleTimeoutSeconds=Math.max(300,Math.min(43200,Number(result?.idleTimeoutSeconds||idleTimeoutSeconds)));}
export async function accountSessionActive(){const activity=readActivity(await SecureStore.getItemAsync(ACTIVITY));return Boolean(activity&&Date.now()-activity.at<activity.idleTimeoutSeconds*1000);}
export async function accountToken(){return (await loadAccountVault())?.token||null;}
export async function accountLogout(){try{await request('/api/v1/auth/logout',{});}catch{}finally{lastActivity=0;await Promise.all([clearAccountVault(),SecureStore.deleteItemAsync(ACTIVITY)]);}}
export async function openAccountPortal(){
  if(!PORTAL.startsWith('https://'))throw new Error('O endereço do portal deve usar HTTPS.');
  await Linking.openURL(PORTAL);
}
