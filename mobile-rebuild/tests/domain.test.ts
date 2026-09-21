import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDesktopAddress } from '../src/domain/endpoint';
import { compareMobileVersions, latestMobileRelease } from '../src/domain/releases';
import { beginPairing, checkPairing } from '../src/domain/pairing';
import { ApiError, classifyConnection } from '../src/domain/protocol';

test('normaliza link, rejeita credencial ou URL insegura', () => {
  assert.equal(normalizeDesktopAddress('https://pc.ts.net/mobile'), 'https://pc.ts.net');
  assert.throws(() => normalizeDesktopAddress('http://pc.ts.net/mobile'));
  assert.throws(() => normalizeDesktopAddress('https://pc.ts.net/mobile?key=segredo'));
});

test('releases mobile não se confundem com desktop ou com versão instalada', () => {
  assert.equal(compareMobileVersions('vMB.2.0.10','vMB.2.0.9'),1);
  const asset={name:'RB_Gestao_Financeira_Mobile_2.0.1.apk',size:1024,digest:`sha256:${'a'.repeat(64)}`,browser_download_url:'https://example.org/a.apk'};
  const releases=[{tag_name:'vDK.99.0.0',assets:[asset]},{tag_name:'vMB.2.0.0',assets:[asset]},{tag_name:'vMB.2.0.1',assets:[asset]}];
  assert.equal(latestMobileRelease(releases,'vMB.2.0.0')?.release.tag_name,'vMB.2.0.1');
  assert.equal(latestMobileRelease(releases,'vMB.2.0.1'),null);
});

test('novo cliente pareia em etapas e só recebe token após aprovação', async () => {
  let approved=false;
  const fetcher=async (input:RequestInfo|URL, init?:RequestInit) => {
    const pathname=new URL(String(input)).pathname;
    if(pathname==='/v2/mobile/identity') return new Response(JSON.stringify({protocol:2,installationId:'pc-id'}),{status:200});
    if(pathname==='/v2/mobile/pair/request') {
      assert.equal(JSON.parse(String(init?.body)).code,'482731');
      return new Response(JSON.stringify({installationId:'pc-id',requestId:'req',requestSecret:'secret',expiresIn:300}),{status:202});
    }
    if(pathname==='/v2/mobile/pair/complete') return new Response(JSON.stringify(approved?{status:'paired',installationId:'pc-id',token:'x'.repeat(43),deviceId:'device'}:{status:'pending',installationId:'pc-id'}),{status:approved?200:202});
    throw new Error('unexpected');
  };
  const started=await beginPairing('https://pc.ts.net/mobile','482731','Celular',fetcher as typeof fetch);
  assert.equal(await checkPairing(started.origin,started.pending,'Celular',fetcher as typeof fetch),null);
  approved=true;
  assert.equal((await checkPairing(started.origin,started.pending,'Celular',fetcher as typeof fetch))?.device.deviceId,'device');
});

test('distingue autenticação, timeout, PC offline e sem internet', () => {
  assert.equal(classifyConnection(new ApiError('unauthorized',401,''),true),'auth_error');
  assert.equal(classifyConnection(new ApiError('timeout',0,''),true),'timeout');
  assert.equal(classifyConnection(new Error('network'),true),'pc_offline');
  assert.equal(classifyConnection(new Error('network'),false),'no_internet');
});
