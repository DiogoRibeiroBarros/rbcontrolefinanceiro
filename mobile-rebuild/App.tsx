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
  if(pending) return <View style={styles.connection}><Image source={require('./assets/rb_gestao_horizontal_sidebar_hd.png')} style={styles.connectionLogo} resizeMode="contain"/><View style={styles.connectionCard}><Text style={styles.step}>SOLICITAÇÃO ENVIADA</Text><Text style={styles.title}>Aguardando aprovação</Text><Text style={styles.body}>A solicitação foi enviada ao RB Gestão no PC. Abra Configurações → Sistema e aprove este celular.</Text><Text style={styles.body}>Depois da aprovação, o vínculo será concluído automaticamente.</Text>{message ? <Text style={styles.error}>{message}</Text>:null}</View></View>;
  return <View style={styles.connection}><Image source={require('./assets/rb_gestao_horizontal_sidebar_hd.png')} style={styles.connectionLogo} resizeMode="contain"/><View style={styles.connectionCard}><Text style={styles.title}>Conectar ao desktop</Text><Text style={styles.body}>{['1. Informe o link de acesso mostrado no PC.','2. Digite o código de seis números.','3. Dê um nome a este celular.'][step]}</Text>
    {step===0?<><Text style={styles.label}>URL do desktop</Text><TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://seu-endereco.ts.net" placeholderTextColor="#74777b" autoCapitalize="none" keyboardType="url" accessibilityLabel="Link de acesso ao PC"/></>:null}
    {step===1?<><Text style={styles.label}>Código de conexão</Text><TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="000000" placeholderTextColor="#74777b" keyboardType="number-pad" maxLength={6} accessibilityLabel="Código de acesso"/></>:null}
    {step===2?<><Text style={styles.label}>Nome deste dispositivo</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Meu celular" placeholderTextColor="#74777b" maxLength={60} accessibilityLabel="Nome do dispositivo"/></>:null}
    {message?<Text style={styles.error}>{message}</Text>:null}
    <View style={styles.row}>{step>0?<Button title="Voltar" secondary onPress={() => setStep(step-1)}/>:null}<Button title={busy?'Enviando...':step===2?'Solicitar pareamento':'Continuar'} disabled={busy|| (step===0&&!url.trim()) || (step===1&&!/^\d{6}$/.test(code))} onPress={() => {if(step<2)setStep(step+1);else void pair(url,code,name.trim()||'Meu celular');}}/></View>
  </View></View>;
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
    </>}
    <Modal visible={Boolean(updates.available)} transparent animationType="fade"><View style={styles.overlay}><View style={styles.card}><Text style={styles.title}>Nova atualização disponível</Text><Text style={styles.body}>Instalada: {updates.installed}</Text><Text style={styles.body}>Nova: {updates.available?.release.tag_name}</Text><Text style={styles.body}>O Android pedirá confirmação para instalar. Seus dados serão preservados.</Text>{updates.progress!==null?<Text style={styles.body}>Baixando: {updates.progress}%</Text>:null}{updates.message?<Text style={styles.error}>{updates.message}</Text>:null}<View style={styles.row}><Button title="Depois" secondary onPress={updates.dismiss}/><Button title="Atualizar agora" disabled={updates.progress!==null} onPress={() => {void updates.install();}}/></View></View></View></Modal>
  </SafeAreaView>;
}

const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#0d0e10'},setup:{flexGrow:1,justifyContent:'center'},connection:{flex:1,justifyContent:'center',padding:24,gap:20,backgroundColor:'#0d0e10'},connectionLogo:{width:'76%',height:90,alignSelf:'center'},connectionCard:{padding:20,gap:12,borderRadius:22,borderWidth:1,borderColor:'#2d3035',backgroundColor:'#1b1d20'},card:{margin:16,padding:20,backgroundColor:panel,borderRadius:18,gap:14},step:{color:'#a7a9ac',fontSize:15,lineHeight:21},label:{color:'#c8cac5',marginTop:6,fontSize:12,fontWeight:'700'},title:{color:'#f6f4ee',fontSize:25,fontWeight:'900'},body:{color:'#a7a9ac',fontSize:15,lineHeight:21},error:{color:'#ff9999',fontSize:14},input:{height:50,paddingHorizontal:14,borderRadius:13,borderWidth:1,borderColor:'#34373c',backgroundColor:'#282a2e',color:'#f6f4ee',fontSize:15},row:{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center'},button:{flex:1,height:52,alignItems:'center',justifyContent:'center',borderRadius:13,backgroundColor:green,overflow:'hidden',paddingHorizontal:16},secondary:{backgroundColor:'#2a2c31'},disabled:{opacity:.45},buttonText:{fontWeight:'900',color:'#11140d',fontSize:15},secondaryText:{color:'#f6f4ee'},web:{flex:1,backgroundColor:'#0d0e10'},full:{flex:1,padding:16},log:{borderBottomColor:'#333',borderBottomWidth:1,paddingVertical:10},overlay:{flex:1,justifyContent:'center',backgroundColor:'#000b'}});
