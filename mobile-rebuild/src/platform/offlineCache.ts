import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY='rb_mobile_last_profile_store_v1';
export type CachedStore={format?:string;profileStore?:Record<string,any>;savedAt:string};

export async function saveOfflineStore(value:unknown):Promise<void>{
  const profileStore=(value as CachedStore)?.profileStore;
  if(!profileStore || typeof profileStore!=='object') return;
  await AsyncStorage.setItem(CACHE_KEY,JSON.stringify({format:'rb-gestao-profiles-v1',profileStore,savedAt:new Date().toISOString()}));
}
export async function loadOfflineStore():Promise<CachedStore|null>{
  try { const raw=await AsyncStorage.getItem(CACHE_KEY); return raw?JSON.parse(raw) as CachedStore:null; } catch { return null; }
}
