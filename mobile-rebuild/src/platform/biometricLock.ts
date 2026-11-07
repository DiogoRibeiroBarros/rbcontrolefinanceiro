import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const ENABLED='rb_mobile_biometrics_enabled_v1';
const BACKGROUND_AT='rb_mobile_background_at_v1';
export const BIOMETRIC_IDLE_MS=3*60*1000;

export async function biometricsEnabled(){return (await SecureStore.getItemAsync(ENABLED))==='true';}
export async function setBiometricsEnabled(value:boolean){
  if(value){const [hardware,enrolled]=await Promise.all([LocalAuthentication.hasHardwareAsync(),LocalAuthentication.isEnrolledAsync()]);if(!hardware||!enrolled)throw new Error('Cadastre uma digital ou biometria no aparelho antes de ativar a proteção. A senha ou PIN do aparelho continuará disponível como alternativa.');}
  await SecureStore.setItemAsync(ENABLED,value?'true':'false');
}
export async function markBackgrounded(){await SecureStore.setItemAsync(BACKGROUND_AT,String(Date.now()));}
export async function requiresBiometricUnlock(){
  if(!(await biometricsEnabled()))return false;
  const raw=await SecureStore.getItemAsync(BACKGROUND_AT);return Boolean(raw&&Date.now()-Number(raw)>=BIOMETRIC_IDLE_MS);
}
export async function unlockWithBiometrics(){
  const [hardware,enrolled]=await Promise.all([LocalAuthentication.hasHardwareAsync(),LocalAuthentication.isEnrolledAsync()]);
  if(!hardware||!enrolled)throw new Error('A biometria não está disponível neste aparelho. Entre novamente com e-mail e senha.');
  const result=await LocalAuthentication.authenticateAsync({promptMessage:'Desbloquear RB Gestão Financeira',cancelLabel:'Cancelar',disableDeviceFallback:false,biometricsSecurityLevel:'strong'});
  if(!result.success)throw new Error(result.error==='user_cancel'?'Autenticação cancelada.':'Não foi possível confirmar a digital ou a senha do aparelho.');
  await SecureStore.deleteItemAsync(BACKGROUND_AT);
}
