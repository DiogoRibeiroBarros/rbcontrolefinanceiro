import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import {Linking} from 'react-native';
import {verifyMobileLicense} from '../domain/license';
const API=process.env.EXPO_PUBLIC_RB_API_URL||'';
const PORTAL=process.env.EXPO_PUBLIC_RB_PORTAL_URL||'';
const TOKEN='rb_account_tokens_v1',ID='rb_commercial_installation_v1';
const LICENSE='rb_commercial_license_v1',CLOCK='rb_commercial_clock_v1';
const PUBLIC_KEY=(process.env.EXPO_PUBLIC_RB_LICENSE_PUBLIC_KEY||'').replace(/\\n/g,'\n');
type Tokens={accessToken:string;refreshToken:string};
let refreshing:Promise<Tokens>|null=null;
export async function installationId(){let id=await SecureStore.getItemAsync(ID);if(!id){id=Crypto.randomUUID();await SecureStore.setItemAsync(ID,id);}return id;}
async function request(endpoint:string,body?:unknown,method='POST',retry=true):Promise<any>{
 if(!API.startsWith('https://'))throw new Error('Conta RB ainda não configurada nesta distribuição.');
 const stored=await SecureStore.getItemAsync(TOKEN),tokens:Tokens|null=stored?JSON.parse(stored):null;
 const response=await fetch(new URL(endpoint,API).href,{method,headers:{'Content-Type':'application/json',...(tokens?{Authorization:'Bearer '+tokens.accessToken}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 if(response.status===401&&tokens&&retry){refreshing??=request('/v1/auth/refresh',{refreshToken:tokens.refreshToken},'POST',false).finally(()=>{refreshing=null;});const next=await refreshing;await SecureStore.setItemAsync(TOKEN,JSON.stringify(next));return request(endpoint,body,method,false);}
 const result=await response.json();if(!response.ok){if([401,403,409].includes(response.status))await SecureStore.deleteItemAsync(LICENSE);throw Object.assign(new Error(result.error||'Conta indisponível'),{status:response.status});}return result;
}
export async function accountLogin(email:string,password:string){const result=await request('/v1/auth/login',{email,password},'POST',false);await SecureStore.setItemAsync(TOKEN,JSON.stringify(result));return accountStatus();}
export async function cachedLicense(){const [raw,clock,id]=await Promise.all([SecureStore.getItemAsync(LICENSE),SecureStore.getItemAsync(CLOCK),installationId()]);const license=raw?verifyMobileLicense(JSON.parse(raw),PUBLIC_KEY,id,Date.now(),Number(clock||0)):null;await SecureStore.setItemAsync(CLOCK,String(Math.max(Number(clock||0),Date.now())));return license;}
export async function accountStatus(){try{const account=await request('/v1/account',undefined,'GET'),id=await installationId(),envelope=await request('/v1/licenses/activate',{installationId:id,name:'RB Mobile',platform:'android',appVersion:'2.0.9'});const license=verifyMobileLicense(envelope,PUBLIC_KEY,id);if(!license)throw new Error('Assinatura da licença inválida');await SecureStore.setItemAsync(LICENSE,JSON.stringify(envelope));return {...account,license};}catch(e){if(!(e as any).status){const license=await cachedLicense();if(license)return {user:{email:'Conta em modo offline'},plan:license.plan,subscription:{status:'offline'},license};}throw e;}}
export async function accountLogout(){try{await request('/v1/auth/logout',{});}finally{await SecureStore.deleteItemAsync(TOKEN);await SecureStore.deleteItemAsync(LICENSE);}}
export async function openAccountPortal(){if(!PORTAL.startsWith('https://'))throw new Error('Portal ainda não configurado');await Linking.openURL(PORTAL);}
