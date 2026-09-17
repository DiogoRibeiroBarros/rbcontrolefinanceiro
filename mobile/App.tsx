import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import { loadSyncConfiguration, saveSyncConfiguration, SyncConfiguration, testConnection } from './src/api/sync';
import { findLatestMobileRelease } from './src/api/updater';

const FIRST_RUN_KEY = '@rb-gestao/mobile-shell-ready';
const NATIVE_BRIDGE = `(function(){window.rbNativeApp=true;window.rbNativeBiometrics=true;true;})();`;
const PDF_BRIDGE = `(function(){function asDataUrl(src){if(!src||src.indexOf('data:')===0)return Promise.resolve(src);return fetch(src,{credentials:'include',cache:'no-store'}).then(function(response){if(!response.ok)throw new Error('Imagem indisponível');return response.blob();}).then(function(blob){return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(reader.result);};reader.onerror=reject;reader.readAsDataURL(blob);});}).catch(function(){return src;});}window.print=async function(){var css='';Array.prototype.forEach.call(document.styleSheets||[],function(sheet){try{Array.prototype.forEach.call(sheet.cssRules||[],function(rule){css+=rule.cssText+'\\n';});}catch(_){}});var clone=document.documentElement.cloneNode(true);var originals=Array.prototype.slice.call(document.querySelectorAll('img'));var copies=Array.prototype.slice.call(clone.querySelectorAll('img'));await Promise.all(originals.map(function(img,index){return asDataUrl(img.currentSrc||img.src).then(function(data){if(copies[index])copies[index].setAttribute('src',String(data));});}));Array.prototype.forEach.call(clone.querySelectorAll('script,link[rel="stylesheet"]'),function(node){node.remove();});var style=clone.ownerDocument.createElement('style');style.textContent=css;clone.querySelector('head').appendChild(style);window.ReactNativeWebView.postMessage(JSON.stringify({type:'print-pdf',html:'<!doctype html>'+clone.outerHTML}));};true;})();`;
const StatusBar = ({ backgroundColor }: { style?:string; backgroundColor?:string }) => <NativeStatusBar barStyle="light-content" backgroundColor={backgroundColor} translucent={false} />;

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const web = useRef<WebView>(null);
  const biometricBusy = useRef(false);
  const webRetryCount = useRef(0);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [configuration, setConfiguration] = useState<SyncConfiguration>({ baseUrl:'', accessToken:'' });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [pairing, setPairing] = useState<{ url:string; code:string; name:string } | null>(null);

  useEffect(() => {
    Promise.all([loadSyncConfiguration(), AsyncStorage.getItem(FIRST_RUN_KEY)]).then(([saved]) => {
      setConfiguration(saved);
      setEditing(!saved.baseUrl);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    void findLatestMobileRelease().then(release => {
      if (!release) return;
      const asset = release.assets.find(item => /\.apk$/i.test(item.name));
      if (!asset) return;
      Alert.alert('Atualização disponível', `${release.name || release.tag_name}\n\n${release.body || 'Uma nova versão está pronta.'}`, [
        { text:'Depois', style:'cancel' },
        { text:'Atualizar', onPress:() => { void downloadAndInstall(asset.browser_download_url, asset.name); } }
      ]);
    }).catch(() => undefined);
  }, [loading]);

  const downloadAndInstall = async (url:string, name:string) => {
    try {
      const file = await File.downloadFileAsync(url, new File(Paths.cache, name), { idempotent:true });
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data:file.uri, type:'application/vnd.android.package-archive', flags:1 | 2 });
    } catch {
      Alert.alert('Atualização', 'Não foi possível abrir o instalador. Autorize a instalação de fontes desconhecidas para o RB Gestão e tente novamente.');
      try { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, { data:`package:${Application.applicationId}` }); } catch { /* Android sem esta tela */ }
    }
  };

  const mobileUrl = useMemo(() => configuration.baseUrl ? `${configuration.baseUrl.replace(/\/$/, '')}/mobile` : '', [configuration]);
  const pairingUrl = pairing ? `${pairing.url.replace(/\/$/, '')}/pair` : '';
  const pairingScript = pairing ? `(function(){var c=document.getElementById('pair-code'),n=document.getElementById('device-name'),f=document.getElementById('pair-form');if(c&&n&&f){c.value=${JSON.stringify(pairing.code)};n.value=${JSON.stringify(pairing.name)};f.requestSubmit();}})();true;` : NATIVE_BRIDGE;

  const requestBiometric = async (profileId:string, profileName:string) => {
    if (biometricBusy.current || !profileId) return;
    biometricBusy.current = true;
    let success = false;
    let errorMessage = '';
    try {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hardware && await LocalAuthentication.isEnrolledAsync();
      if (!hardware) errorMessage = 'Este aparelho não possui leitor biométrico compatível.';
      else if (!enrolled) errorMessage = 'Cadastre uma digital nas configurações do celular antes de usar este recurso.';
      else {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage:`Acessar como ${profileName || 'usuário'}`,
          promptSubtitle:'RB Gestão Financeira',
          promptDescription:'Toque no sensor de impressão digital para continuar.',
          cancelLabel:'Cancelar',
          fallbackLabel:'Usar PIN do aplicativo',
          disableDeviceFallback:true,
          biometricsSecurityLevel:'strong'
        });
        success = result.success;
        if (!result.success && result.error !== 'user_cancel' && result.error !== 'system_cancel') {
          errorMessage = 'A digital não foi reconhecida. Tente novamente ou use o PIN.';
        }
      }
    } catch {
      errorMessage = 'Não foi possível abrir o leitor biométrico neste aparelho.';
    } finally {
      const payload = JSON.stringify({ profileId, success, error:errorMessage });
      web.current?.injectJavaScript(`window.rbHandleBiometricResult&&window.rbHandleBiometricResult(${payload});true;`);
      biometricBusy.current = false;
    }
  };

  const onWebMessage = async (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data || '{}');
      if (message.type === 'configure-connection') {
        setEditing(true);
        return;
      }
      if (message.type === 'biometric-auth') {
        await requestBiometric(String(message.profileId || ''), String(message.profileName || 'perfil'));
        return;
      }
      if (message.type === 'print-pdf' && message.html) {
        const result = await Print.printToFileAsync({ html:String(message.html), width:595, height:842 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType:'application/pdf', dialogTitle:'Salvar ou compartilhar relatório PDF', UTI:'com.adobe.pdf' });
        else await Print.printAsync({ uri:result.uri });
      }
    } catch (cause) { Alert.alert('Não foi possível concluir', cause instanceof Error ? cause.message : 'Tente novamente.'); }
  };

  if (loading) return <Loading />;
  if (editing || !mobileUrl) return <ConnectionScreen initial={configuration} busy={connecting} onSave={async (next, code, name) => {
    try {
      setConnecting(true);
      await testConnection({ ...next, accessToken:'' });
      setPairing({ url:next.baseUrl, code, name });
      setError('');
    } catch (cause) {
      Alert.alert('Não foi possível conectar', cause instanceof Error ? cause.message : 'Verifique o endereço e a chave.');
    } finally { setConnecting(false); }
  }} />;

  if (pairing) return <SafeAreaView style={styles.safe} edges={['top','right','bottom','left']}>
    <StatusBar style="light" backgroundColor="#0d0e10" />
    <WebView ref={web} source={{ uri:pairingUrl }} originWhitelist={['https://*','http://*']} sharedCookiesEnabled thirdPartyCookiesEnabled javaScriptEnabled domStorageEnabled cacheEnabled={false} injectedJavaScriptBeforeContentLoaded={NATIVE_BRIDGE} injectedJavaScript={pairingScript} startInLoadingState renderLoading={() => <Loading inline />} onNavigationStateChange={state => {
      if (state.url.replace(/\/$/,'') === `${pairing.url.replace(/\/$/,'')}/mobile`) {
        void saveSyncConfiguration({ baseUrl:pairing.url, accessToken:'' }).then(saved => { setConfiguration(saved); setPairing(null); setEditing(false); AsyncStorage.setItem(FIRST_RUN_KEY, 'true'); });
      }
    }} onHttpError={event => setError(event.nativeEvent.statusCode === 401 ? 'Código recusado ou pareamento ainda não aprovado.' : `O desktop respondeu com erro ${event.nativeEvent.statusCode}.`)} onError={() => setError('Não foi possível alcançar o RB Gestão desktop. Verifique o endereço e tente novamente.')} style={styles.web} />
  </SafeAreaView>;

  return <SafeAreaView style={styles.safe} edges={['top','right','bottom','left']}>
    <StatusBar style="light" backgroundColor="#0d0e10" />
    {error ? <View style={styles.errorBar}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => { setError(''); web.current?.reload(); }}><Text style={styles.retry}>Tentar novamente</Text></Pressable><Pressable onPress={() => setEditing(true)}><Text style={styles.configure}>Configurar</Text></Pressable></View> : null}
    <WebView ref={web} source={{ uri:mobileUrl }} originWhitelist={['https://*','http://*','rbgestao://*']} sharedCookiesEnabled thirdPartyCookiesEnabled javaScriptEnabled domStorageEnabled cacheEnabled={false} pullToRefreshEnabled injectedJavaScriptBeforeContentLoaded={NATIVE_BRIDGE + PDF_BRIDGE} injectedJavaScript={NATIVE_BRIDGE} setSupportMultipleWindows={false} allowsBackForwardNavigationGestures startInLoadingState renderLoading={() => <Loading inline />} onMessage={onWebMessage} onShouldStartLoadWithRequest={request => {
      if (!request.url.startsWith('rbgestao://biometric')) return true;
      try {
        const query = request.url.split('?')[1] || '';
        const params:Record<string,string> = {};
        query.split('&').forEach(part => { const [key,value=''] = part.split('='); params[key] = decodeURIComponent(value.replace(/\+/g,' ')); });
        void requestBiometric(params.profileId || '', params.profileName || 'perfil');
      } catch { Alert.alert('Biometria', 'Não foi possível iniciar o leitor biométrico.'); }
      return false;
     }} onLoadStart={() => setError('')} onLoad={() => { webRetryCount.current = 0; setError(''); }} onLoadEnd={() => web.current?.injectJavaScript(NATIVE_BRIDGE)} onHttpError={event => { if (event.nativeEvent.statusCode === 401) setEditing(true); setError(event.nativeEvent.statusCode === 401 ? 'Pareamento necessário. Informe novamente o código de seis dígitos.' : `O desktop respondeu com erro ${event.nativeEvent.statusCode}.`); }} onError={() => {
      if (webRetryCount.current < 2) {
        webRetryCount.current += 1;
        setError(`Conexão oscilou. Nova tentativa ${webRetryCount.current} de 2…`);
        setTimeout(() => web.current?.reload(), 1200 * webRetryCount.current);
      } else setError('Não foi possível alcançar o RB Gestão desktop. Toque em Tentar novamente.');
    }} style={styles.web} />
  </SafeAreaView>;
}

function Loading({ inline=false }: { inline?:boolean }) {
  return <View style={[styles.loading, inline && styles.loadingInline]}><Image source={require('./assets/rb_gestao_horizontal_sidebar_hd.png')} style={styles.logo} resizeMode="contain" /><ActivityIndicator color="#b7ff3c" size="large" /><Text style={styles.muted}>Carregando o RB Gestão…</Text></View>;
}

function ConnectionScreen({ initial, busy, onSave }: { initial:SyncConfiguration; busy:boolean; onSave:(value:SyncConfiguration, code:string, name:string)=>void }) {
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl); const [code, setCode] = useState(''); const [name, setName] = useState('Meu celular');
  return <SafeAreaView style={styles.connection} edges={['top','right','bottom','left']}><StatusBar style="light" backgroundColor="#0d0e10" /><Image source={require('./assets/rb_gestao_horizontal_sidebar_hd.png')} style={styles.connectionLogo} resizeMode="contain" /><View style={styles.connectionCard}><Text style={styles.title}>Conectar ao desktop</Text><Text style={styles.muted}>Informe o endereço HTTPS e o código de seis dígitos exibido em Configurações → Sistema.</Text><Text style={styles.label}>URL do desktop</Text><TextInput autoCapitalize="none" autoCorrect={false} keyboardType="url" value={baseUrl} onChangeText={setBaseUrl} placeholder="https://seu-endereco.ts.net" placeholderTextColor="#74777b" style={styles.input} /><Text style={styles.label}>Código de conexão</Text><TextInput autoCapitalize="none" autoCorrect={false} keyboardType="number-pad" maxLength={6} value={code} onChangeText={value => setCode(value.replace(/\D/g,''))} placeholder="000000" placeholderTextColor="#74777b" style={styles.input} /><Text style={styles.label}>Nome deste dispositivo</Text><TextInput value={name} onChangeText={setName} placeholder="Meu celular" placeholderTextColor="#74777b" style={styles.input} /><Pressable disabled={busy || !baseUrl.trim() || !/^\d{6}$/.test(code)} onPress={() => onSave({ baseUrl:baseUrl.trim(), accessToken:'' }, code, name.trim() || 'Meu celular')} style={[styles.primary, (busy || !baseUrl.trim() || !/^\d{6}$/.test(code)) && styles.disabled]}>{busy ? <ActivityIndicator color="#11140d" /> : <Text style={styles.primaryText}>Solicitar pareamento</Text>}</Pressable></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe:{ flex:1, backgroundColor:'#0d0e10' }, web:{ flex:1, backgroundColor:'#0d0e10' }, loading:{ flex:1, alignItems:'center', justifyContent:'center', gap:18, backgroundColor:'#0d0e10' }, loadingInline:{ position:'absolute', top:0, right:0, bottom:0, left:0, zIndex:3 }, logo:{ width:220, height:80 }, muted:{ color:'#a7a9ac', lineHeight:21 }, connection:{ flex:1, justifyContent:'center', padding:24, gap:20, backgroundColor:'#0d0e10' }, connectionLogo:{ width:'76%', height:90, alignSelf:'center' }, connectionCard:{ padding:20, gap:12, borderRadius:22, borderWidth:1, borderColor:'#2d3035', backgroundColor:'#1b1d20' }, title:{ color:'#f6f4ee', fontSize:25, fontWeight:'900' }, label:{ color:'#c8cac5', marginTop:6, fontSize:12, fontWeight:'700' }, input:{ height:50, paddingHorizontal:14, borderRadius:13, borderWidth:1, borderColor:'#34373c', backgroundColor:'#282a2e', color:'#f6f4ee', fontSize:15 }, primary:{ height:52, marginTop:8, alignItems:'center', justifyContent:'center', borderRadius:13, backgroundColor:'#b7ff3c' }, disabled:{ opacity:.45 }, primaryText:{ color:'#11140d', fontWeight:'900', fontSize:15 }, errorBar:{ paddingHorizontal:12, paddingVertical:8, flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'#4a2228' }, errorText:{ flex:1, color:'#ffe8ea', fontSize:12 }, retry:{ color:'#b7ff3c', fontWeight:'800' }, configure:{ color:'#fff', fontWeight:'800' } });
