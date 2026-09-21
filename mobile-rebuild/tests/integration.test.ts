import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beginPairing, checkPairing } from '../src/domain/pairing';
import { requestJson } from '../src/domain/protocol';

// Desktop modules are CJS and stay in the desktop project, outside this new app.
const { PairingService }=require('../../app/services/pairing-service.cjs');
const { createMobileV2HttpHandler }=require('../../app/services/mobile-v2-http.cjs');

test('cliente Mobile novo e desktop real concluem vínculo, heartbeat e dois celulares', async () => {
  const folder=mkdtempSync(join(tmpdir(),'rb-mobile-contract-'));
  let server:Server|undefined;
  try {
    const pairing=new PairingService({filePath:join(folder,'pair.json')});
    const handler=createMobileV2HttpHandler({pairing,webRoot:join(__dirname,'../../app'),getPublicUrl:()=>'',allowInsecureLoopback:true});
    server=createServer((request,response) => {void handler(request,response,new URL(request.url||'/','http://localhost'));});
    await new Promise<void>(resolve => server!.listen(0,'127.0.0.1',resolve));
    const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
    const first=await beginPairing(origin,pairing.data.code,'Android A');
    const second=await beginPairing(origin,pairing.data.code,'Android B');
    assert.equal(await checkPairing(origin,first.pending,'Android A'),null);
    pairing.decide(first.pending.requestId,true);
    pairing.decide(second.pending.requestId,true);
    const a=await checkPairing(origin,first.pending,'Android A');
    const b=await checkPairing(origin,second.pending,'Android B');
    if (!a || !b) throw new Error('O PC não concluiu o vínculo.');
    assert.notEqual(a.token,b.token);
    const heartbeat=await requestJson<{deviceId:string;ready:boolean}>(origin,'/v2/mobile/heartbeat',{token:a.token});
    assert.equal(heartbeat.deviceId,a.device.deviceId);
    assert.equal(heartbeat.ready,true);
  } finally {
    if(server) await new Promise<void>(resolve => server!.close(() => resolve()));
    rmSync(folder,{recursive:true,force:true});
  }
});
