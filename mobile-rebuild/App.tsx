import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { useMobileController } from './src/hooks/useMobileController';
import { useMobileUpdates } from './src/hooks/useMobileUpdates';
import { readLogs, type LogEntry } from './src/platform/diagnostics';
import { handleTrustedWebMessage, showBridgeError, WEB_BRIDGE } from './src/platform/webBridge';

const green='#B7FF3B', panel='#202123', muted='#B7B8B8';
const labels:Record<string,string>={ checking:'Verificando PC...', connected:'Conectado', reconnecting:'Reconectando...', pc_offline:'PC offline', no_internet:'Sem internet', auth_error:'Autenticação expirada', awaiting_pc:'Aguardando PC', timeout:'PC demorou a responder' };
function Button({title,onPress,disabled=false,secondary=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}) {return <Pressable disabled={disabled} onPress={onPress} style={[styles.button,secondary&&styles.secondary,disabled&&styles.disabled]}><Text style={[styles.buttonText,secondary&&styles.secondaryText]}>{title}</Text></Pressable>;}

function Setup({pair,busy,message,pending}:{pair:(url:string,code:string,name:string)=>Promise<void>;busy:boolean;message:string;pending:boolean}) {
  const [step,setStep]=useState(0),[url,setUrl]=useState(''),[code,setCode]=useState(''),[name,setName]=useState('');
  if(pending) return <View style={styles.card}><Image source={require('./assets/android-icon-foreground.png')} style={styles.smallLogo} resizeMode="contain"/><Text style={styles.step}>SOLICITAÇÃO ENVIADA</Text><Text style={styles.title}>Aguardando aprovação</Text><Text style={styles.body}>A solicitação foi enviada ao RB Gestão no PC. Abra Configurações → Sistema e aprove este celular.</Text><Text style={styles.body}>Depois da aprovação, o vínculo será concluído automaticamente.</Text>{message ? <Text style={styles.error}>{message}</Text>:null}</View>;
  return <View style={styles.card}><Image source={require('./assets/android-icon-foreground.png')} style={styles.logo} resizeMode="contain"/><Text style={styles.title}>Conectar ao desktop</Text><Text style={styles.body}>{['1. Informe o link de acesso mostrado no PC.','2. Digite o código de seis números.','3. Dê um nome a este celular.'][step]}</Text>
    {step===0?<TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://seu-pc.ts.net" placeholderTextColor="#888" autoCapitalize="none" keyboardType="url" accessibilityLabel="Link de acesso ao PC"/>:null}
    {step===1?<TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="Código de 6 dígitos" placeholderTextColor="#888" keyboardType="number-pad" maxLength={6} accessibilityLabel="Código de acesso"/>:null}
    {step===2?<TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Meu celular" placeholderTextColor="#888" maxLength={60} accessibilityLabel="Nome do dispositivo"/>:null}
    {message?<Text style={styles.error}>{message}</Text>:null}
    <View style={styles.row}>{step>0?<Button title="Voltar" secondary onPress={() => setStep(step-1)}/>:null}<Button title={busy?'Enviando...':step===2?'Solicitar pareamento':'Continuar'} disabled={busy|| (step===0&&!url.trim()) || (step===1&&!/^\d{6}$/.test(code))} onPress={() => {if(step<2)setStep(step+1);else void pair(url,code,name.trim()||'Meu celular');}}/></View>
  </View>;
}

function Diagnostics({close}:{close:()=>void}) {const [entries,setEntries]=useState<LogEntry[]>([]);useEffect(() => {void readLogs().then(setEntries);},[]);return <View style={styles.full}><View style={styles.row}><Text style={styles.title}>Diagnóstico</Text><Button title="Fechar" secondary onPress={close}/></View><ScrollView>{entries.slice().reverse().map((item,index)=><View style={styles.log} key={index}><Text style={styles.body}>{item.at} · {item.event}</Text><Text style={styles.body}>{item.detail}</Text></View>)}</ScrollView></View>;}

export default function App() {
  const mobile=useMobileController(), updates=useMobileUpdates();
  const webRef=useRef<WebView>(null);
  const [webError,setWebError]=useState(''),[diagnostics,setDiagnostics]=useState(false),[showWeb,setShowWeb]=useState(true),[webKey,setWebKey]=useState(0);
  useEffect(() => {const sub=BackHandler.addEventListener('hardwareBackPress',() => {if(diagnostics){setDiagnostics(false);return true;}if(!showWeb)return false;setShowWeb(false);return true;});return () => sub.remove();},[diagnostics,showWeb]);
  const device=mobile.link?.device;
  const ready=Boolean(device && mobile.status==='connected');
  return <SafeAreaView style={styles.root}><StatusBar style="light"/>
    {diagnostics?<Diagnostics close={() => setDiagnostics(false)}/>:<>
    <View style={styles.top}><Text style={styles.brand}>RB GESTÃO</Text><Text style={styles.status}>{labels[mobile.status]||mobile.status}</Text></View>
    {!mobile.loaded?<View style={styles.card}><Text style={styles.body}>Carregando vínculo salvo...</Text></View>:!device?<ScrollView contentContainerStyle={styles.setup}><Setup pair={mobile.pair} busy={mobile.busy} message={mobile.message} pending={Boolean(mobile.pending)}/></ScrollView>:<>
      {!ready || !showWeb?<View style={styles.card}><Text style={styles.title}>{device.name}</Text><Text style={styles.body}>PC: {device.origin}</Text><Text style={styles.body}>{labels[mobile.status]}</Text>{mobile.message?<Text style={styles.error}>{mobile.message}</Text>:null}
        <View style={styles.row}><Button title="Tentar novamente" onPress={() => {void mobile.heartbeat();setWebKey(value=>value+1);setShowWeb(true);}}/><Button title="Diagnóstico" secondary onPress={() => setDiagnostics(true)}/></View>
        {ready?<Button title="Abrir RB Gestão" onPress={() => setShowWeb(true)}/>:null}
        {mobile.status==='auth_error'?<Button title="Configurar novamente" secondary onPress={() => Alert.alert('Desvincular celular','Será necessário aprovar este celular novamente no PC.',[{text:'Cancelar'},{text:'Desvincular',onPress:() => {void mobile.unlink();}}])}/>:null}
      </View>:null}
      {ready && showWeb?<WebView ref={webRef} key={webKey} style={styles.web} source={{uri:`${device!.origin}/v2/mobile/bootstrap`}} javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled={false}
        injectedJavaScriptBeforeContentLoaded={WEB_BRIDGE} injectedJavaScript={WEB_BRIDGE} setSupportMultipleWindows={false}
        onLoadEnd={event => {if(event.nativeEvent.url.includes('/v2/mobile/bootstrap')) {const token=mobile.link!.token; webRef.current?.injectJavaScript(`window.rbStartMobileSession(${JSON.stringify(token)}); true;`);}}}
        onShouldStartLoadWithRequest={request => {try {return new URL(request.url).origin===device!.origin;} catch {return false;}}}
        onMessage={event => {try {const value=JSON.parse(event.nativeEvent.data);if(value.type==='session-error'){setWebError('O PC recusou a sessão. Tente reconectar.');setShowWeb(false);return;}void handleTrustedWebMessage(event.nativeEvent.data,webRef).then(result => {if(result==='configure')setShowWeb(false);}).catch(showBridgeError);}catch {}}}
        onError={event => {setWebError(event.nativeEvent.description);setShowWeb(false);}}
        renderError={() => <View style={styles.card}><Text style={styles.error}>{webError||'Não foi possível abrir o PC.'}</Text><Button title="Tentar novamente" onPress={() => setWebKey(value=>value+1)}/></View>}
      />:null}
    </>}
    <View style={styles.footer}><Pressable onPress={() => setDiagnostics(true)}><Text style={styles.footerText}>Diagnóstico</Text></Pressable><Pressable onPress={() => {void updates.check();}}><Text style={styles.footerText}>{updates.checking?'Verificando...':updates.message||`${updates.installed} · Verificar atualização`}</Text></Pressable></View>
    </>}
    <Modal visible={Boolean(updates.available)} transparent animationType="fade"><View style={styles.overlay}><View style={styles.card}><Text style={styles.title}>Nova atualização disponível</Text><Text style={styles.body}>Instalada: {updates.installed}</Text><Text style={styles.body}>Nova: {updates.available?.release.tag_name}</Text><Text style={styles.body}>O Android pedirá confirmação para instalar. Seus dados serão preservados.</Text>{updates.progress!==null?<Text style={styles.body}>Baixando: {updates.progress}%</Text>:null}{updates.message?<Text style={styles.error}>{updates.message}</Text>:null}<View style={styles.row}><Button title="Depois" secondary onPress={updates.dismiss}/><Button title="Atualizar agora" disabled={updates.progress!==null} onPress={() => {void updates.install();}}/></View></View></View></Modal>
  </SafeAreaView>;
}

const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#111213'},top:{padding:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#1b1c1d'},brand:{color:green,fontSize:18,fontWeight:'900'},status:{color:'#eee',fontSize:12},setup:{flexGrow:1,justifyContent:'center',paddingVertical:24},card:{marginHorizontal:16,padding:20,backgroundColor:panel,borderRadius:18,gap:14},logo:{width:130,height:105,alignSelf:'center'},smallLogo:{width:82,height:82,alignSelf:'center'},step:{color:green,fontSize:12,fontWeight:'800',letterSpacing:1},title:{color:'#fff',fontSize:23,fontWeight:'800'},body:{color:muted,fontSize:15,lineHeight:22},error:{color:'#ff9999',fontSize:14},input:{backgroundColor:'#292a2c',borderColor:'#414245',borderWidth:1,borderRadius:12,padding:14,color:'#fff',fontSize:17},row:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},button:{backgroundColor:green,paddingHorizontal:16,paddingVertical:12,borderRadius:12},secondary:{backgroundColor:'#303134'},disabled:{opacity:0.4},buttonText:{fontWeight:'800',color:'#111'},secondaryText:{color:'#fff'},web:{flex:1,backgroundColor:'#111'},footer:{flexDirection:'row',justifyContent:'space-between',padding:10,backgroundColor:'#1b1c1d'},footerText:{color:'#aaa',fontSize:11},full:{flex:1,padding:16},log:{borderBottomColor:'#333',borderBottomWidth:1,paddingVertical:10},overlay:{flex:1,justifyContent:'center',backgroundColor:'#000b'}});
