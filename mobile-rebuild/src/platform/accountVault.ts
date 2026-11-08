import * as SecureStore from 'expo-secure-store';

const VAULT='rb_mobile_account_v3';
const LEGACY_TOKEN='rb_site_auth_token_v2',LEGACY_ACCOUNT='rb_site_account_v2',LEGACY_CREDENTIALS='rb_site_credentials_v2';
export type AccountVault={email:string;password:string;token:string;identity:any|null;updatedAt:number};

function read(raw:string|null){try{return raw?JSON.parse(raw):null;}catch{return null;}}
function valid(value:any):value is AccountVault{return Boolean(value&&typeof value.email==='string'&&typeof value.password==='string'&&typeof value.token==='string'&&value.email&&value.password&&value.token);}

export async function loadAccountVault():Promise<AccountVault|null>{
  const current=read(await SecureStore.getItemAsync(VAULT));if(valid(current))return current;
  const [tokenRaw,accountRaw,credentialsRaw]=await Promise.all([SecureStore.getItemAsync(LEGACY_TOKEN),SecureStore.getItemAsync(LEGACY_ACCOUNT),SecureStore.getItemAsync(LEGACY_CREDENTIALS)]);
  const token=read(tokenRaw)?.token,credentials=read(credentialsRaw),identity=read(accountRaw);
  if(typeof token!=='string'||typeof credentials?.email!=='string'||typeof credentials?.password!=='string')return null;
  const migrated={email:credentials.email,password:credentials.password,token,identity:identity||null,updatedAt:Date.now()};await saveAccountVault(migrated);return migrated;
}
export async function saveAccountVault(vault:AccountVault){await SecureStore.setItemAsync(VAULT,JSON.stringify(vault));}
export async function updateAccountVault(patch:Partial<AccountVault>){const current=await loadAccountVault();if(!current)return null;const next={...current,...patch,updatedAt:Date.now()};await saveAccountVault(next);return next;}
export async function clearAccountVault(){await Promise.all([SecureStore.deleteItemAsync(VAULT),SecureStore.deleteItemAsync(LEGACY_TOKEN),SecureStore.deleteItemAsync(LEGACY_ACCOUNT),SecureStore.deleteItemAsync(LEGACY_CREDENTIALS)]);}
