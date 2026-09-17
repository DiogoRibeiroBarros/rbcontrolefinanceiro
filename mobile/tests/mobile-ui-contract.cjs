const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('App.tsx', 'utf8');
for (const feature of ['react-native-webview', 'react-native-safe-area-context', 'SafeAreaProvider', "edges={['top','right','bottom','left']}", 'translucent={false}', '/mobile', '/pair', 'pair-code', 'sharedCookiesEnabled', 'javaScriptEnabled', 'domStorageEnabled', 'setPairing({ url:next.baseUrl, code, name })', 'saveSyncConfiguration({ baseUrl:pairing.url, accessToken:\'\' })', 'printToFileAsync', 'shareAsync', 'configure-connection', 'onHttpError', 'onMessage', 'onError']) {
  assert.ok(source.includes(feature), `interação ausente: ${feature}`);
}
for (const feature of ['pairingScript', 'Solicitar pareamento', 'webRetryCount', 'Nova tentativa']) assert.ok(source.includes(feature), `fallback de conexão ausente: ${feature}`);
assert.ok(!source.includes('/mobile?key='), 'o APK não pode expor chave longa na URL móvel');
assert.ok(fs.readFileSync('src/api/updater.ts', 'utf8').includes("vMB\\."), 'o atualizador deve aceitar apenas tags vMB');
assert.ok(!source.includes('moduleCatalog'), 'o mobile não pode manter uma cópia divergente dos módulos');
assert.ok(!source.includes('sample:'), 'o mobile não pode conter dados financeiros de exemplo');
console.log('Interface móvel: painel compartilhado, autenticação, persistência e recuperação de conexão verificados.');

for (const removed of ['file:///android_asset/webapp/index.html','savePendingProfile','synchronizeProfileStore','Modo offline']) assert.ok(!source.includes(removed), `modo offline ainda presente: ${removed}`);
for (const feature of ['asDataUrl','readAsDataURL','credentials:\'include\'','copies[index].setAttribute']) assert.ok(source.includes(feature), `incorporação de imagem no PDF ausente: ${feature}`);
for (const feature of ['expo-local-authentication','hasHardwareAsync','isEnrolledAsync','authenticateAsync','biometric-auth','rbHandleBiometricResult','disableDeviceFallback:true']) assert.ok(source.includes(feature), `desbloqueio biométrico ausente: ${feature}`);
for (const feature of ['rbgestao://biometric','onShouldStartLoadWithRequest','requestBiometric','biometricBusy','injectedJavaScript={NATIVE_BRIDGE}','onLoadEnd','biometricsSecurityLevel:\'strong\'']) assert.ok(source.includes(feature), `fluxo biométrico nativo ausente: ${feature}`);
for (const feature of ['window.rbNativeBiometrics=true','message.type === \'biometric-auth\'']) assert.ok(source.includes(feature), `ponte biométrica direta ausente: ${feature}`);
