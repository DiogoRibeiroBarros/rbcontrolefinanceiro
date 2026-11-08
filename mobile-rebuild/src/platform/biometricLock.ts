import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const ENABLED='rb_mobile_biometrics_enabled_v1';
const BACKGROUND_AT='rb_mobile_background_at_v1';
// A proteção só é solicitada depois de quatro minutos fora do aplicativo.
// Assim, alternar rapidamente entre apps não interrompe o uso em andamento.
export const BIOMETRIC_IDLE_MS=4*60*1000;

// Quando há biometria cadastrada ela é obrigatória. Isso também corrige
// instalações antigas que haviam deixado a preferência como "false".
export async function biometricsEnabled(){
  const [hardware,enrolled]=await Promise.all([LocalAuthentication.hasHardwareAsync(),LocalAuthentication.isEnrolledAsync()]);
  if(!hardware||!enrolled)return false;
  if((await SecureStore.getItemAsync(ENABLED))!=='true')await SecureStore.setItemAsync(ENABLED,'true');
  return true;
}
export async function markBackgrounded(){await SecureStore.setItemAsync(BACKGROUND_AT,String(Date.now()));}
// Um processo novo nunca herda a tela financeira desbloqueada. Já um retorno
// ao mesmo processo, ainda mantido nos apps recentes, respeita os 4 minutos.
export async function requiresBiometricUnlock(processStarted=false){
  if(!(await biometricsEnabled()))return false;
  if(processStarted)return true;
  const raw=await SecureStore.getItemAsync(BACKGROUND_AT);return Boolean(raw&&Date.now()-Number(raw)>=BIOMETRIC_IDLE_MS);
}
export async function unlockWithBiometrics(){
  const [hardware,enrolled]=await Promise.all([LocalAuthentication.hasHardwareAsync(),LocalAuthentication.isEnrolledAsync()]);
  if(!hardware||!enrolled)throw new Error('A biometria não está disponível neste aparelho.');
  const result=await LocalAuthentication.authenticateAsync({promptMessage:'Desbloquear RB Gestão Financeira',cancelLabel:'Cancelar',disableDeviceFallback:true,biometricsSecurityLevel:'strong'});
  if(!result.success)throw new Error(result.error==='user_cancel'?'Autenticação cancelada.':'Não foi possível confirmar a biometria.');
  await SecureStore.deleteItemAsync(BACKGROUND_AT);
}
