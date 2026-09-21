import { normalizeDesktopAddress } from './endpoint';
import { requestJson, type PairRequest, type LinkedDevice } from './protocol';

export async function beginPairing(address:string, code:string, name:string, fetcher:typeof fetch = fetch):Promise<{ origin:string; pending:PairRequest }> {
  const origin = normalizeDesktopAddress(address);
  if (!/^\d{6}$/.test(code)) throw new Error('Digite os seis dígitos do código do PC.');
  const identity = await requestJson<{protocol:number; installationId:string}>(origin, '/v2/mobile/identity', { fetcher });
  if (identity.protocol !== 2 || !identity.installationId) throw new Error('Atualize o RB Gestão no PC para usar o novo aplicativo.');
  const pending = await requestJson<PairRequest>(origin, '/v2/mobile/pair/request', {method:'POST', body:{ code, name:name.slice(0,60) }, fetcher});
  if (identity.installationId !== pending.installationId) throw new Error('A identificação do PC mudou durante o pareamento.');
  return { origin, pending };
}

export async function checkPairing(origin:string, pending:PairRequest, name:string, fetcher:typeof fetch = fetch):Promise<{device:LinkedDevice; token:string}|null> {
  const result = await requestJson<{status:string; token?:string; deviceId?:string; installationId:string}>(origin, '/v2/mobile/pair/complete', {
    method:'POST', body:{requestId:pending.requestId, requestSecret:pending.requestSecret}, fetcher
  });
  if (result.status === 'pending') return null;
  if (result.status !== 'paired' || !result.token || !result.deviceId || result.installationId !== pending.installationId) throw new Error('O PC não confirmou este dispositivo.');
  return { device:{ origin, installationId:result.installationId, deviceId:result.deviceId, name }, token:result.token };
}
