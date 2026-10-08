import { AppState } from 'react-native';
import { applyServerOperation, getMeta, markOperation, pendingOperations, setMeta } from '../database/database';
import { requestJson, type LinkedDevice } from '../domain/protocol';
import { connectionScope, assertLinkedBase } from '../domain/connectionScope';

type SyncResult={pushed:number;pulled:number;pending:number;conflicts:number;cursor:string};
export async function synchronize(link:{device:LinkedDevice;token:string},onPull?:(change:any)=>Promise<void>):Promise<SyncResult>{
  const scope=connectionScope(link.device),deviceId=link.device.deviceId;const queued=await pendingOperations(scope);let pushed=0;let conflicts=0;
  if(queued.length){const result=await requestJson<any>(link.device.origin,'/v2/sync/push',{method:'POST',token:link.token,body:{deviceId,operations:queued}});assertLinkedBase(link.device,result);for(const item of result.results||[]){if(item.status==='SUCCESS'||item.status==='ALREADY_PROCESSED'){await markOperation(scope,item.operationId,'SYNCED');pushed++;}else if(item.status==='CONFLICT'){await markOperation(scope,item.operationId,'CONFLICT',item.message||'Conflito',item.serverData,item.serverVersion);conflicts++;}else await markOperation(scope,item.operationId,'ERROR',item.message||'Operação rejeitada.');}}
  let cursor=await getMeta(scope,'server_cursor');let pulled=0;let more=true;
  while(more){const result=await requestJson<any>(link.device.origin,`/v2/sync/pull?cursor=${encodeURIComponent(cursor)}`,{token:link.token});assertLinkedBase(link.device,result);for(const change of result.changes||[]){const applied=await applyServerOperation(scope,change);if(applied&&onPull)await onPull(change);pulled++;}cursor=String(result.nextCursor??cursor);more=Boolean(result.hasMore);}
  await setMeta(scope,'server_cursor',cursor);return {pushed,pulled,conflicts,pending:(await pendingOperations(scope)).length,cursor};
}
export function scheduleSync(link: {device:LinkedDevice;token:string},onResult:(result:SyncResult)=>void,onError:(error:unknown)=>void,onPull?:(change:any)=>Promise<void>){let stopped=false;let running=false;let timer:ReturnType<typeof setTimeout>|null=null;let delay=5000;const run=async()=>{if(stopped||running)return;running=true;try{const result=await synchronize(link,async change=>{if(!stopped&&onPull)await onPull(change);});if(!stopped)onResult(result);delay=5000;}catch(error){if(!stopped)onError(error);delay=Math.min(delay*2,300000);}finally{running=false;if(!stopped)timer=setTimeout(run,delay);}};void run();const app=AppState.addEventListener('change',state=>{if(state==='active')void run();});return()=>{stopped=true;if(timer)clearTimeout(timer);app.remove();};}
