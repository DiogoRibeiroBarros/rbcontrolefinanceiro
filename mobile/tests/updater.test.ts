import assert from 'node:assert/strict';
import { compareVersions, findLatestMobileRelease, isNewerMobileRelease, parseMobileVersion } from '../src/api/updater';

assert.deepEqual(parseMobileVersion('vMB.1.2.10'), [1,2,10]);
assert.equal(parseMobileVersion('v2.4.12'), null);
assert.equal(compareVersions([1,2,10], [1,2,9]) > 0, true);
assert.equal(isNewerMobileRelease('vMB.1.1.14', '1.1.13'), true);
assert.equal(isNewerMobileRelease('vMB.1.1.14', '1.1.14'), false);
const releases = [
  { tag_name:'v2.4.99', assets:[{ name:'desktop.exe', browser_download_url:'x' }] },
  { tag_name:'vMB.1.1.14', assets:[{ name:'mobile.apk', browser_download_url:'apk' }] },
  { tag_name:'vMB.1.1.15', assets:[{ name:'mobile.apk', browser_download_url:'apk2' }] }
];
void (async () => {
  const latest = await findLatestMobileRelease(async () => new Response(JSON.stringify(releases), { status:200, headers:{'content-type':'application/json'} }));
  assert.equal(latest?.tag_name, 'vMB.1.1.15');
  console.log('Atualizador móvel: filtragem vMB, comparação semântica e seleção do APK aprovadas.');
})().catch(error => { console.error(error); process.exit(1); });
