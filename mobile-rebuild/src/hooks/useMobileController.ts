import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { beginPairing, checkPairing } from '../domain/pairing';
import { ApiError, classifyConnection, requestJson, type Connectivity, type LinkedDevice, type PairRequest } from '../domain/protocol';
import { clearLinkedDevice, loadLinkedDevice, saveLinkedDevice } from '../platform/vault';
import { writeLog } from '../platform/diagnostics';

type Link = { device:LinkedDevice; token:string };
type Pending = { origin:string; request:PairRequest; name:string; code:string };
export function useMobileController() {
  const [loaded,setLoaded] = useState(false);
  const [link,setLink] = useState<Link|null>(null);
  const [pending,setPending] = useState<Pending|null>(null);
  const [status,setStatus] = useState<Connectivity>('checking');
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => { let alive=true; writeLog('startup'); loadLinkedDevice().then(value => {
    if (alive) { setLink(value); setStatus(value ? 'checking' : 'awaiting_pc'); setLoaded(true); }
  }).catch(error => { if(alive) { setMessage(String(error)); setLoaded(true); } }); return () => {alive=false;}; }, []);

  const heartbeat = useCallback(async () => {
    if (!link || inFlight.current) return;
    inFlight.current=true;
    try {
      const network = await Network.getNetworkStateAsync();
      if (!network.isConnected || network.isInternetReachable === false) { setStatus('no_internet'); return; }
      setStatus(previous => previous === 'connected' ? previous : 'reconnecting');
      const result = await requestJson<{installationId:string;deviceId:string;ready:boolean}>(link.device.origin, '/v2/mobile/heartbeat', {token:link.token});
      if (result.installationId !== link.device.installationId || result.deviceId !== link.device.deviceId) throw new ApiError('identity_changed',401,'O vínculo com o PC mudou.');
      setStatus(result.ready ? 'connected' : 'awaiting_pc');
      setMessage('');
    } catch (error) {
      const network=await Network.getNetworkStateAsync().catch(() => null);
      const state=classifyConnection(error, Boolean(network?.isConnected && network?.isInternetReachable !== false));
      setStatus(state);
      setMessage(error instanceof Error ? error.message : 'Não foi possível conectar ao PC.');
      writeLog(state === 'timeout' ? 'timeout' : 'disconnected', state);
    } finally { inFlight.current=false; }
  },[link]);

  useEffect(() => { if(!link) return; void heartbeat(); const timer=setInterval(() => {void heartbeat();},10000);
    const app=AppState.addEventListener('change',state => {if(state==='active') void heartbeat();});
    const network=Network.addNetworkStateListener(() => {void heartbeat();});
    return () => {clearInterval(timer);app.remove();network.remove();};
  },[link,heartbeat]);

  useEffect(() => { if(!pending) return; let cancelled=false, polling=false;
    const poll=async () => {if(polling) return; polling=true; try {const paired=await checkPairing(pending.origin,pending.request,pending.name);
      if(cancelled || !paired) return;
      await saveLinkedDevice(paired.device,paired.token,pending.code);
      if(!cancelled) {setLink(paired);setPending(null);setStatus('checking');setMessage('');writeLog('pair_approved');}
    } catch(error) {if(!cancelled) {
      if(error instanceof ApiError && error.status===0) {setMessage('Conexão interrompida. Tentando consultar a aprovação novamente...');writeLog('reconnecting','pairing');}
      else {setPending(null);setMessage(error instanceof Error?error.message:'Pareamento recusado.');writeLog('pair_denied');}
    }} finally {polling=false;}};
    void poll();const timer=setInterval(() => {void poll();},3000);
    return () => {cancelled=true;clearInterval(timer);};
  },[pending]);

  const pair=async (address:string,code:string,name:string) => {
    setBusy(true);setMessage('');writeLog('pair_request');
    try {const result=await beginPairing(address,code,name);setPending({origin:result.origin,request:result.pending,name,code});writeLog('pair_pending');}
    catch(error) {setMessage(error instanceof Error?error.message:'Falha ao pedir autorização.');writeLog('api_error',String(error));}
    finally {setBusy(false);}
  };
  const unlink=async () => {await clearLinkedDevice();setLink(null);setPending(null);setStatus('awaiting_pc');setMessage('');};
  return {loaded,link,pending,status,message,busy,pair,unlink,heartbeat};
}
