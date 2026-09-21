import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Application from 'expo-application';
import { checkMobileRelease, type Release, type ReleaseAsset } from '../domain/releases';
import { downloadAndOpenApk } from '../platform/installer';
import { writeLog } from '../platform/diagnostics';

const installed=`vMB.${Application.nativeApplicationVersion || '2.0.8'}`;
export function useMobileUpdates() {
  const [available,setAvailable]=useState<{release:Release;asset:ReleaseAsset}|null>(null);
  const [progress,setProgress]=useState<number|null>(null);
  const [message,setMessage]=useState('');
  const [checking,setChecking]=useState(false);
  const checkingNow=useRef(false);
  const check=useCallback(async () => {
    if(checkingNow.current) return;
    checkingNow.current=true;setChecking(true);setMessage('');writeLog('update_check');
    try {const result=await checkMobileRelease(installed);setAvailable(result);
      if(result) writeLog('update_found',result.release.tag_name);
      else setMessage('Você usa a versão mais recente.');
    } catch(error) {setMessage(error instanceof Error?error.message:'Não foi possível verificar atualizações.');writeLog('api_error','update_check');}
    finally {checkingNow.current=false;setChecking(false);}
  },[]);
  useEffect(() => {void check();const timer=setInterval(() => {void check();},4*60*60*1000);
    const app=AppState.addEventListener('change',state => {if(state==='active') void check();});
    return () => {clearInterval(timer);app.remove();};
  },[]);
  const install=async () => {if(!available) return;setProgress(0);setMessage('');writeLog('download_start',available.release.tag_name);
    try {await downloadAndOpenApk(available.asset,setProgress);writeLog('install_requested');}
    catch(error) {setMessage(error instanceof Error?error.message:'Falha ao instalar atualização.');writeLog('download_error',String(error));}
    finally {setProgress(null);}
  };
  return {installed,available,progress,message,checking,check,install,dismiss:() => setAvailable(null)};
}

