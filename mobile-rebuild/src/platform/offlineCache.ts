import {EncryptedOfflineStore} from './encryptedOfflineStore';

const CACHE_KEY='rb_mobile_last_profile_store_v1';
const encrypted=new EncryptedOfflineStore(CACHE_KEY);
export type CachedStore={format?:string;profileStore?:Record<string,any>;savedAt:string};

export async function saveOfflineStore(value:unknown):Promise<void>{
  const profileStore=(value as CachedStore)?.profileStore;
  if(!profileStore || typeof profileStore!=='object') return;
  await encrypted.setItem(JSON.stringify({format:'rb-gestao-profiles-v1',schemaVersion:2,profileStore,savedAt:new Date().toISOString()}));
}
export async function loadOfflineStore():Promise<CachedStore|null>{
  const raw=await encrypted.migrate(); return raw?JSON.parse(raw) as CachedStore:null;
}
