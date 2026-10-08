import {EncryptedOfflineStore} from './encryptedOfflineStore';
import {scopedName} from './scopedName';

const CACHE_KEY='rb_mobile_last_profile_store_v1';
const stores=new Map<string,Promise<EncryptedOfflineStore>>();
function encrypted(scope:string){let store=stores.get(scope);if(!store){store=scopedName(scope).then(name=>new EncryptedOfflineStore(CACHE_KEY+'_'+name));stores.set(scope,store);}return store;}
export type CachedStore={format?:string;profileStore?:Record<string,any>;savedAt:string};

export async function saveOfflineStore(scope:string,value:unknown):Promise<void>{
  const profileStore=(value as CachedStore)?.profileStore;
  if(!profileStore || typeof profileStore!=='object') return;
  await (await encrypted(scope)).setItem(JSON.stringify({format:'rb-gestao-profiles-v1',schemaVersion:2,profileStore,savedAt:new Date().toISOString()}));
}
export async function loadOfflineStore(scope:string):Promise<CachedStore|null>{
  const target=await encrypted(scope),raw=await target.getItem();if(raw)return JSON.parse(raw) as CachedStore;
  // A corrupt unrelated legacy cache must not prevent the correct base syncing.
  const previous=await new EncryptedOfflineStore(CACHE_KEY).getItem().catch(()=>null);
  if(previous){const cached=JSON.parse(previous) as CachedStore;if(cached.profileStore?.cloudDeviceId===JSON.parse(scope)[2]){await target.setItem(previous);return cached;}}
  return null;
}
