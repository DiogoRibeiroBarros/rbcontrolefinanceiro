import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { WebView } from 'react-native-webview';

export const WEB_BRIDGE = String.raw`
(function () {
  if (window.rbMobileV2Bridge) return true;
  window.rbMobileV2Bridge = true;
  window.rbNativeBiometrics = true;
  window.print = function () {
    var copy = document.documentElement.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll('script'), function (item) { item.remove(); });
    window.ReactNativeWebView.postMessage(JSON.stringify({ type:'print-pdf', html:'<!doctype html>' + copy.outerHTML }));
  };
  true;
})();`;

function reply(web:React.RefObject<WebView|null>, profileId:string, success:boolean, detail:string) {
  const result=JSON.stringify({profileId,success,error:detail});
  web.current?.injectJavaScript(`if(window.rbHandleBiometricResult){window.rbHandleBiometricResult(${result});}true;`);
}

export async function handleTrustedWebMessage(raw:string, web:React.RefObject<WebView|null>):Promise<'configure'|'handled'> {
  let message:{type?:string;profileId?:string;profileName?:string;html?:string};
  try { message=JSON.parse(raw); } catch { return 'handled'; }
  if (message.type === 'configure-connection') return 'configure';
  if (message.type === 'biometric-auth') {
    const profileId=String(message.profileId||'').slice(0,120);
    if (!profileId) return 'handled';
    try {
      const [hardware,enrolled]=await Promise.all([LocalAuthentication.hasHardwareAsync(),LocalAuthentication.isEnrolledAsync()]);
      if (!hardware) { reply(web,profileId,false,'Este aparelho não possui sensor biométrico compatível.'); return 'handled'; }
      if (!enrolled) { reply(web,profileId,false,'Nenhuma impressão digital está cadastrada neste aparelho. Cadastre uma digital nas configurações do Android.'); return 'handled'; }
      const result=await LocalAuthentication.authenticateAsync({
        promptMessage:`Abrir ${String(message.profileName||'perfil').slice(0,60)}`,
        cancelLabel:'Cancelar',disableDeviceFallback:true,biometricsSecurityLevel:'weak'
      });
      const detail=result.success?'Biometria confirmada.':result.error==='user_cancel'?'Autenticação cancelada.':result.error==='lockout'?'Biometria temporariamente bloqueada.':'Não foi possível confirmar a impressão digital.';
      reply(web,profileId,result.success,detail);
    } catch (error) { reply(web,profileId,false,error instanceof Error?error.message:'Não foi possível validar a biometria.'); }
    return 'handled';
  }
  if (message.type === 'print-pdf') {
    const html=String(message.html||'');
    if (!html || html.length > 5*1024*1024) throw new Error('O relatório excede o tamanho permitido.');
    const file=await Print.printToFileAsync({html,width:595,height:842});
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',dialogTitle:'Salvar ou compartilhar relatório PDF',UTI:'com.adobe.pdf'});
    else await Print.printAsync({uri:file.uri});
  }
  return 'handled';
}

export function showBridgeError(error:unknown) {
  Alert.alert('Não foi possível concluir',error instanceof Error?error.message:'Tente novamente.');
}
