import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {AESEncryptionKey,AESSealedData,aesEncryptAsync,aesDecryptAsync} from 'expo-crypto';

const KEY='rb_financial_cache_aes_v2';
let keyPromise:Promise<AESEncryptionKey>|null=null;
async function key(create:boolean):Promise<AESEncryptionKey>{
 if(keyPromise)return keyPromise;
 keyPromise=(async()=>{const raw=await SecureStore.getItemAsync(KEY);if(raw)return AESEncryptionKey.import(raw,'hex');if(!create)throw new Error('Chave do cache indisponível. Reconecte ao PC para recuperar os dados.');const generated=await AESEncryptionKey.generate();await SecureStore.setItemAsync(KEY,await generated.encoded('hex'),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});return generated;})();
 try{return await keyPromise;}catch(e){keyPromise=null;throw e;}
}
export class EncryptedOfflineStore {
 private queue:Promise<unknown>=Promise.resolve();
 constructor(private readonly name:string){}
 private get aad(){return new TextEncoder().encode('rb-cache-v2:'+this.name);}
 async getItem():Promise<string|null>{const raw=await AsyncStorage.getItem(this.name+'.encrypted-v2');if(!raw)return null;const envelope=JSON.parse(raw);if(envelope.version!==2||!Array.isArray(envelope.sealed))throw new Error('Cache inválido, preservado para recuperação.');const plain=await aesDecryptAsync(AESSealedData.fromCombined(new Uint8Array(envelope.sealed)),await key(false),{additionalData:this.aad});return new TextDecoder().decode(plain);}
 setItem(value:string):Promise<void>{const operation=this.queue.then(async()=>{const sealed=await aesEncryptAsync(new TextEncoder().encode(value),await key(true),{additionalData:this.aad});const raw=JSON.stringify({version:2,sealed:Array.from(await sealed.combined())});await AsyncStorage.setItem(this.name+'.encrypted-v2',raw);if(await this.getItem()!==value)throw new Error('Falha ao conferir o cache cifrado');});this.queue=operation.catch(()=>{});return operation;}
 async migrate():Promise<string|null>{const encrypted=await this.getItem();if(encrypted!==null)return encrypted;const raw=await AsyncStorage.getItem(this.name);if(raw===null)return null;JSON.parse(raw);await this.setItem(raw);await AsyncStorage.removeItem(this.name);return raw;}
}
