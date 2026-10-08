import {CommercialPanel} from './src/CommercialPanel';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Image, KeyboardAvoidingView, Platform, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useMobileController } from './src/hooks/useMobileController';
import { useMobileUpdates } from './src/hooks/useMobileUpdates';
import { readLogs, type LogEntry } from './src/platform/diagnostics';
import { handleTrustedWebMessage, showBridgeError, WEB_BRIDGE } from './src/platform/webBridge';
import { loadOfflineStore, saveOfflineStore, type CachedStore } from './src/platform/offlineCache';
import { getEntity, initializeDatabase, queueProfileStore, queueStats, saveSnapshot, setDeviceId } from './src/database/database';
import { scheduleSync } from './src/sync/syncEngine';
import { connectionScope } from './src/domain/connectionScope';

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

function Diagnostics({close,syncInfo,scope}:{close:()=>void;syncInfo:string;scope:string}) {const [entries,setEntries]=useState<LogEntry[]>([]);const [stats,setStats]=useState({pending:0,conflicts:0,cursor:'0'});useEffect(() => {void readLogs().then(setEntries);if(scope)void queueStats(scope).then(setStats).catch(()=>{});},[scope]);return <View style={styles.full}><View style={styles.row}><Text style={styles.title}>Diagnóstico</Text><Button title="Fechar" secondary onPress={close}/></View><Text style={styles.body}>SQLite local · {syncInfo}</Text><Text style={styles.body}>Pendentes: {stats.pending} · Conflitos: {stats.conflicts} · Cursor: {stats.cursor||'0'}</Text><ScrollView>{entries.slice().reverse().map((item,index)=><View style={styles.log} key={index}><Text style={styles.body}>{item.at} · {item.event}</Text><Text style={styles.body}>{item.detail}</Text></View>)}</ScrollView></View>;}

function OfflineApp({offline,data,profiles,reconnect,diagnostics}:{offline:CachedStore;data:any;profiles:any[];reconnect:()=>void;diagnostics:()=>void}) {
  const [module,setModule]=useState<'inicio'|'transacoes'|'contas'|'cartoes'>('inicio');
  const items=module==='transacoes'?(Array.isArray(data.entries)?data.entries:[]):module==='contas'?(Array.isArray(data.bankAccounts)?data.bankAccounts:[]):module==='cartoes'?(Array.isArray(data.cards)?data.cards:[]):[];
  const title={inicio:'Início',transacoes:'Transações',contas:'Contas',cartoes:'Cartões'}[module];
  return <View style={styles.offlineApp}><View style={styles.offlineHeader}><Text style={styles.offlineBrand}>RB GESTÃO</Text><Text style={styles.offlineMode}>MODO OFFLINE</Text></View><View style={styles.offlineNav}>{(['inicio','transacoes','contas','cartoes'] as const).map(item=><Pressable key={item} onPress={()=>setModule(item)} style={[styles.offlineNavButton,module===item&&styles.offlineNavActive]}><Text style={styles.offlineNavText}>{item==='inicio'?'Início':item[0].toUpperCase()+item.slice(1)}</Text></Pressable>)}</View><ScrollView contentContainerStyle={styles.offlineContent}><Text style={styles.offlineHeading}>{title}</Text>{module==='inicio'?<><Text style={styles.body}>Últimos dados sincronizados</Text><View style={styles.offlineBanner}><Text style={styles.offlineTitle}>Servidor temporariamente indisponível</Text><Text style={styles.body}>Os dados exibidos são os últimos salvos em {new Date(offline.savedAt).toLocaleString('pt-BR')}.</Text></View><View style={styles.offlineGrid}><View style={styles.offlineMetric}><Text style={styles.metricLabel}>PERFIS</Text><Text style={styles.metricValue}>{profiles.length}</Text></View><View style={styles.offlineMetric}><Text style={styles.metricLabel}>LANÇAMENTOS</Text><Text style={styles.metricValue}>{Array.isArray(data.entries)?data.entries.length:0}</Text></View><View style={styles.offlineMetric}><Text style={styles.metricLabel}>CONTAS</Text><Text style={styles.metricValue}>{Array.isArray(data.bankAccounts)?data.bankAccounts.length:0}</Text></View><View style={styles.offlineMetric}><Text style={styles.metricLabel}>CARTÕES</Text><Text style={styles.metricValue}>{Array.isArray(data.cards)?data.cards.length:0}</Text></View></View></>:<View style={styles.offlineList}>{items.length?items.slice(0,100).map((item:any,index:number)=><View style={styles.offlineListItem} key={String(item.id||index)}><Text style={styles.offlineTitle}>{String(item.name||item.description||item.title||item.type||`Registro ${index+1}`)}</Text><Text style={styles.body}>{item.amount!==undefined?`Valor: ${String(item.amount)}`:'Consulta offline disponível'}</Text></View>):<Text style={styles.body}>Nenhum registro salvo para este módulo.</Text>}</View>}<Text style={styles.offlineNote}>Você pode consultar os dados salvos. Alterações serão sincronizadas quando o PC voltar a ficar disponível.</Text><View style={styles.row}><Button title="Tentar conexão" onPress={reconnect}/><Button title="Diagnóstico" secondary onPress={diagnostics}/></View></ScrollView></View>;
}

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const mobile=useMobileController(), updates=useMobileUpdates();
  const insets=useSafeAreaInsets();
  const [commercial,setCommercial]=useState(false),[configuring,setConfiguring]=useState(false);
  useEffect(()=>{setConfiguring(false);setShowWeb(true);},[mobile.link]);
  const webRef=useRef<WebView>(null);
  const [webError,setWebError]=useState(''),[diagnostics,setDiagnostics]=useState(false),[showWeb,setShowWeb]=useState(true),[webKey,setWebKey]=useState(0),[cached,setCached]=useState<(CachedStore & {scope:string})|null>(null);
  const scope=mobile.link?connectionScope(mobile.link.device):'';
  const currentScope=useRef(scope);currentScope.current=scope;
  const offline=cached?.scope===scope?cached:null;
  const cacheWrites=useRef<Promise<void>>(Promise.resolve());
  const [syncInfo,setSyncInfo]=useState('Sincronização aguardando vínculo');
  async function refreshCache(boundScope:string){
    const sqlite=await getEntity<any>(boundScope,'profile_store','shared');
    const value=sqlite?{savedAt:sqlite.updatedAt,profileStore:sqlite.payload}:await loadOfflineStore(boundScope);
    if(value&&currentScope.current===boundScope)setCached({...value,scope:boundScope});
  }
  useEffect(()=>{
    const link=mobile.link;if(!link)return;
    let stopped=false;let stopSync:(()=>void)|undefined;
    void(async()=>{
      try{
        await setDeviceId(scope,link.device.deviceId);await refreshCache(scope);if(stopped)return;
        stopSync=scheduleSync(link,result=>setSyncInfo(`Sincronizado · ${result.pending} pendente(s) · ${result.conflicts} conflito(s)`),
          ()=>setSyncInfo('Servidor indisponível · dados locais preservados'),
          async change=>{
            if(change.entityType!=='profile_store'||!change.payload)return;
            await saveOfflineStore(scope,{profileStore:change.payload});await refreshCache(scope);
            if(!stopped&&currentScope.current===scope)webRef.current?.injectJavaScript(`window.postMessage(${JSON.stringify(JSON.stringify({type:'apply-profile-store',profileStore:change.payload}))}, '*');true;`);
          });
      }catch{if(!stopped)setWebError('Não foi possível abrir os dados deste vínculo. Reconecte ao servidor.');}
    })();
    return()=>{stopped=true;stopSync?.();};
  },[mobile.link,scope]);
  const cachedData=(offline?.profileStore as any)?.sharedData || {};
  const cachedProfiles=Array.isArray((offline?.profileStore as any)?.profiles)?(offline?.profileStore as any).profiles:[];
  useEffect(() => {const sub=BackHandler.addEventListener('hardwareBackPress',() => {if(diagnostics){setDiagnostics(false);return true;}if(!showWeb)return false;setShowWeb(false);return true;});return () => sub.remove();},[diagnostics,showWeb]);
  const device=mobile.link?.device;
  const ready=Boolean(device && mobile.status==='connected');
  if(commercial)return <SafeAreaView style={styles.root}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={insets.top}><CommercialPanel close={()=>setCommercial(false)}/></KeyboardAvoidingView></SafeAreaView>;
  return <SafeAreaView style={styles.root}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={insets.top}><Pressable accessibilityLabel='Minha conta RB' onPress={()=>setCommercial(true)}><Text style={styles.body}>Minha conta RB</Text></Pressable><StatusBar style="light"/>
    {diagnostics?<Diagnostics close={() => setDiagnostics(false)} syncInfo={syncInfo} scope={scope}/>:<>
    {!mobile.loaded?<View style={styles.card}><Text style={styles.body}>Carregando vínculo salvo...</Text></View>:!device||configuring?<ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.setup}><Setup pair={mobile.pair} busy={mobile.busy} message={mobile.message} pending={Boolean(mobile.pending)}/>{device&&!mobile.pending?<Button title="Manter vínculo atual" secondary onPress={()=>setConfiguring(false)}/>:null}</ScrollView>:<>
      {!ready || !showWeb?(offline?<OfflineApp offline={offline} data={cachedData} profiles={cachedProfiles} reconnect={()=>{void mobile.heartbeat();setWebKey(value=>value+1);setShowWeb(true);}} diagnostics={()=>setDiagnostics(true)}/>:<View style={styles.card}><Text style={styles.title}>{device.name}</Text><Text style={styles.body}>PC: {device.origin}</Text><Text style={styles.body}>{labels[mobile.status]}</Text>{mobile.message?<Text style={styles.error}>{mobile.message}</Text>:null}<View style={styles.row}><Button title="Tentar novamente" onPress={() => {void mobile.heartbeat();setWebKey(value=>value+1);setShowWeb(true);}}/><Button title="Diagnóstico" secondary onPress={() => setDiagnostics(true)}/></View></View>):null}
      {ready && showWeb?<WebView ref={webRef} key={scope+webKey} style={styles.web} source={{uri:`${device!.origin}/v2/mobile/bootstrap`}} javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled={false}
        injectedJavaScriptBeforeContentLoaded={WEB_BRIDGE} injectedJavaScript={WEB_BRIDGE} setSupportMultipleWindows={false}
        onLoadEnd={event => {if(event.nativeEvent.url.includes('/v2/mobile/bootstrap')) {const token=mobile.link!.token; webRef.current?.injectJavaScript(`window.rbStartMobileSession(${JSON.stringify(token)},${JSON.stringify({tenantId:device!.tenantId,deviceId:device!.deviceId})}); true;`);}}}
        onShouldStartLoadWithRequest={request => {try {return new URL(request.url).origin===device!.origin;} catch {return false;}}}
        onMessage={event => {
          try {
            if(new URL(event.nativeEvent.url).origin!==device!.origin)return;
            const value=JSON.parse(event.nativeEvent.data);
            if(value.type==='profile-store-snapshot'||value.type==='profile-store-changed'){
              const store=value.payload?.profileStore,isChange=value.type==='profile-store-changed',boundScope=scope,boundDevice=device!;
              if(!store||!Array.isArray(store.profiles))return;
              if(boundDevice.installationId==='rbfinanceirosite-cloud-v2'&&(store.cloudDeviceId!==boundDevice.deviceId||(boundDevice.tenantId&&store.cloudTenantId!==boundDevice.tenantId)))throw new Error('A base recebida não corresponde a este vínculo.');
              cacheWrites.current=cacheWrites.current.then(async()=>{
                if(isChange)await queueProfileStore(boundScope,store,boundDevice.deviceId);
                else await saveSnapshot(boundScope,'profile_store','shared',store,Number.isSafeInteger(value.payload.version)?value.payload.version:1,new Date().toISOString(),boundDevice.deviceId);
                const entity=await getEntity<any>(boundScope,'profile_store','shared');
                if(entity)await saveOfflineStore(boundScope,{profileStore:entity.payload});
                await refreshCache(boundScope);
                if(currentScope.current===boundScope)webRef.current?.injectJavaScript('window.rbConfirmCacheMigration?.();true;');
              }).catch(()=>{if(currentScope.current===boundScope)setWebError('Não foi possível salvar os dados deste vínculo.');});
              return;
            }
            if(value.type==='session-error'){setWebError('O servidor recusou a sessão. Tente reconectar.');setShowWeb(false);return;}
            void handleTrustedWebMessage(event.nativeEvent.data,webRef).then(result=>{if(result==='configure')setConfiguring(true);}).catch(showBridgeError);
          }catch(error){setWebError(error instanceof Error?error.message:'Mensagem inválida.');}
        }}
        onError={event => {setWebError(event.nativeEvent.description);setShowWeb(false);}}
        renderError={() => <View style={styles.card}><Text style={styles.error}>{webError||'Não foi possível abrir o PC.'}</Text><Button title="Tentar novamente" onPress={() => setWebKey(value=>value+1)}/></View>}
      />:null}
    </>}
    </>}
    <Modal visible={Boolean(updates.available)} transparent animationType="fade"><View style={styles.overlay}><SafeAreaView style={styles.modalSafe} edges={['top','right','bottom','left']}><View style={styles.card}><Text style={styles.title}>Nova atualização disponível</Text><Text style={styles.body}>Instalada: {updates.installed}</Text><Text style={styles.body}>Nova: {updates.available?.release.tag_name}</Text><Text style={styles.body}>O Android pedirá confirmação para instalar. Seus dados serão preservados.</Text>{updates.progress!==null?<Text style={styles.body}>Baixando: {updates.progress}%</Text>:null}{updates.message?<Text style={styles.error}>{updates.message}</Text>:null}<View style={styles.row}><Button title="Depois" secondary onPress={updates.dismiss}/><Button title="Atualizar agora" disabled={updates.progress!==null} onPress={() => {void updates.install();}}/></View></View></SafeAreaView></View></Modal>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#0d0e10'},setup:{flexGrow:1,justifyContent:'center'},connection:{flex:1,justifyContent:'center',padding:24,gap:20,backgroundColor:'#0d0e10'},connectionLogo:{width:'76%',height:90,alignSelf:'center'},connectionCard:{padding:20,gap:12,borderRadius:22,borderWidth:1,borderColor:'#2d3035',backgroundColor:'#1b1d20'},card:{margin:16,padding:20,backgroundColor:panel,borderRadius:18,gap:14},offlineApp:{flex:1,backgroundColor:'#0d0e10'},offlineHeader:{paddingHorizontal:20,paddingVertical:18,backgroundColor:'#1b1d20',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},offlineBrand:{color:green,fontSize:20,fontWeight:'900'},offlineMode:{color:'#a7a9ac',fontSize:11,fontWeight:'800'},offlineNav:{flexDirection:'row',flexWrap:'wrap',padding:10,gap:8,backgroundColor:'#151619'},offlineNavButton:{paddingHorizontal:14,paddingVertical:10,borderRadius:10,backgroundColor:'#2a2c31'},offlineNavActive:{backgroundColor:green},offlineNavText:{color:'#f6f4ee',fontWeight:'800'},offlineContent:{padding:20,gap:14},offlineHeading:{color:'#f6f4ee',fontSize:30,fontWeight:'900'},offlineBanner:{padding:16,borderRadius:16,backgroundColor:'#27321e',gap:8},offlineNote:{color:'#a7a9ac',fontSize:13,lineHeight:20},offlineGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},offlineMetric:{width:'47%',minHeight:86,padding:14,borderRadius:14,backgroundColor:'#202225',gap:8},metricLabel:{color:'#a7a9ac',fontSize:11,fontWeight:'800'},metricValue:{color:green,fontSize:26,fontWeight:'900'},offlineList:{gap:10},offlineListItem:{padding:14,borderRadius:14,backgroundColor:'#202225',gap:6},offlineBox:{padding:14,borderRadius:14,backgroundColor:'#27321e',gap:8},offlineTitle:{color:green,fontSize:16,fontWeight:'800'},step:{color:'#a7a9ac',fontSize:15,lineHeight:21},label:{color:'#c8cac5',marginTop:6,fontSize:12,fontWeight:'700'},title:{color:'#f6f4ee',fontSize:25,fontWeight:'900'},body:{color:'#a7a9ac',fontSize:15,lineHeight:21},error:{color:'#ff9999',fontSize:14},input:{height:50,paddingHorizontal:14,borderRadius:13,borderWidth:1,borderColor:'#34373c',backgroundColor:'#282a2e',color:'#f6f4ee',fontSize:15},row:{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center'},button:{flex:1,height:52,alignItems:'center',justifyContent:'center',borderRadius:13,backgroundColor:green,overflow:'hidden',paddingHorizontal:16},secondary:{backgroundColor:'#2a2c31'},disabled:{opacity:.45},buttonText:{fontWeight:'900',color:'#11140d',fontSize:15},secondaryText:{color:'#f6f4ee'},web:{flex:1,backgroundColor:'#0d0e10'},full:{flex:1,padding:16},log:{borderBottomColor:'#333',borderBottomWidth:1,paddingVertical:10},overlay:{flex:1,justifyContent:'center',backgroundColor:'#000b'},modalSafe:{flex:1,justifyContent:'center'}});


