import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const account=readFileSync(new URL('../src/platform/commercialAccount.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
const biometric=readFileSync(new URL('../src/platform/biometricLock.ts',import.meta.url),'utf8');
const vault=readFileSync(new URL('../src/platform/accountVault.ts',import.meta.url),'utf8');
const panel=readFileSync(new URL('../src/CommercialPanel.tsx',import.meta.url),'utf8');

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
  assert.match(app,/Preparando seu acesso/);
  assert.match(app,/Não foi possível conectar/);
  assert.match(app,/splash-icon\.png/);
  assert.doesNotMatch(app,/Servidor temporariamente indisponível/);
  assert.doesNotMatch(app,/Conectar ao desktop/);
});

test('biometria bloqueia processo novo e só bloqueia retorno após quatro minutos fora do aplicativo',()=>{
  assert.match(biometric,/BIOMETRIC_IDLE_MS=4\*60\*1000/);
  assert.match(biometric,/hasHardwareAsync/);
  assert.match(biometric,/isEnrolledAsync/);
  assert.match(app,/requiresBiometricUnlock/);
  assert.match(app,/requiresBiometricUnlock\(true\)/);
  assert.match(app,/state==='background'\)void markBackgrounded\(\)/);
  assert.match(app,/Desbloquear com a digital/);
  assert.match(app,/function FingerprintIcon/);
  assert.match(app,/useEffect\(\(\)=>\{unlock\(\);\},\[\]\)/);
  assert.match(app,/Desbloqueie com a digital do telefone/);
  assert.match(app,/splash-icon\.png.*lockedBrandLogo/s);
  assert.match(app,/function UpdatePrompt/);
  assert.match(app,/Locked unlock=.*UpdatePrompt updates=/s);
  assert.doesNotMatch(app,/Entrar com e-mail e senha/);
  assert.match(biometric,/disableDeviceFallback:true/);
  assert.match(biometric,/biometricsSecurityLevel:'strong'/);
  assert.match(vault,/rb_mobile_account_v3/);
  assert.match(vault,/LEGACY_CREDENTIALS/);
  assert.match(panel,/biometria obrigatória/);
  assert.doesNotMatch(panel,/Desativar proteção/);
  assert.match(account,/refreshAccountSession/);
  assert.doesNotMatch(account,/now-lastActivity>=idleTimeoutSeconds\*1000\)\{await accountLogout/);
});
