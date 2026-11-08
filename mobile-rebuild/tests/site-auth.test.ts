import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const account=readFileSync(new URL('../src/platform/commercialAccount.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
const biometric=readFileSync(new URL('../src/platform/biometricLock.ts',import.meta.url),'utf8');

test('mobile reutiliza a autenticação de e-mail e senha do site em produção',()=>{
  assert.match(account,/rbfinanceirosite-api\.rbgestao\.workers\.dev/);
  assert.match(account,/\/api\/v1\/auth\/login/);
  assert.match(account,/\/api\/v1\/auth\/activity/);
  assert.match(account,/\/api\/v1\/auth\/logout/);
  assert.doesNotMatch(account,/rb-gestao-subscriptions/);
  assert.doesNotMatch(account,/auth\/refresh/);
});

test('aplicativo abre o painel do Gestão diretamente e evita a tela offline antiga',()=>{
  assert.match(app,/\/app-clone\/\?tenant=/);
  assert.match(app,/incognito/);
  assert.match(app,/Verificando conexão/);
  assert.match(app,/Não foi possível conectar/);
  assert.match(app,/splash-icon\.png/);
  assert.doesNotMatch(app,/Servidor temporariamente indisponível/);
  assert.doesNotMatch(app,/Conectar ao desktop/);
});

test('biometria bloqueia processo novo e só bloqueia retorno após quatro minutos fora do aplicativo',()=>{
  assert.match(biometric,/BIOMETRIC_IDLE_MS=4\*60\*1000/);
  assert.match(biometric,/setBiometricsEnabled/);
  assert.match(app,/requiresBiometricUnlock/);
  assert.match(app,/requiresBiometricUnlock\(true\)/);
  assert.match(app,/state==='background'\)void markBackgrounded\(\)/);
  assert.match(app,/Desbloquear com biometria/);
  assert.doesNotMatch(app,/Entrar com e-mail e senha/);
  assert.match(biometric,/disableDeviceFallback:true/);
  assert.match(biometric,/biometricsSecurityLevel:'strong'/);
  assert.match(account,/rb_site_credentials_v2/);
  assert.match(account,/refreshAccountSession/);
  assert.doesNotMatch(account,/now-lastActivity>=idleTimeoutSeconds\*1000\)\{await accountLogout/);
});
