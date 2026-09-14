const { app, BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const temp = path.join(root, 'tmp', 'login-session-smoke');
if (!temp.startsWith(root + path.sep)) throw new Error('Diretório temporário fora do projeto.');
app.setPath('userData', path.join(temp, 'user-data'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  await fs.rm(temp, { recursive:true, force:true });
  const win = new BrowserWindow({ width:430, height:820, show:false, webPreferences:{ contextIsolation:true } });
  await win.loadFile(path.join(root, 'app', 'index.html'));
  await wait(250);
  const loginReady = await win.webContents.executeJavaScript(`(() => {
    const input=document.querySelector('#profileLoginPassword');
    return Boolean(document.querySelector('#profile-login-form') && document.querySelector('.login-profile-card.selected') && input && input.inputMode==='numeric' && input.pattern==='[0-9]*');
  })()`);
  if (!loginReady) throw new Error('A tela de login numérico não abriu corretamente.');
  const loginImage = await win.webContents.capturePage();
  await fs.writeFile(path.join(temp, 'login-mobile.png'), loginImage.toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('#profile-login-form').requestSubmit()`);
  await wait(150);
  if (await win.webContents.executeJavaScript(`Boolean(document.querySelector('#profile-login-form'))`)) throw new Error('O login sem senha não foi concluído.');
  const authenticatedId = await win.webContents.executeJavaScript(`sessionStorage.getItem('rb_gestao_financeira_authenticated_profile_v1')`);
  if (!authenticatedId) throw new Error('A sessão autenticada não foi registrada.');
  await win.reload();
  await wait(250);
  if (await win.webContents.executeJavaScript(`Boolean(document.querySelector('#profile-login-form'))`)) throw new Error('A atualização da página voltou indevidamente para a seleção de usuário.');
  const liveUpdateKeptPage = await win.webContents.executeJavaScript(`(() => {
    window.__rbPageMarker='same-page';
    const store=JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1'));
    store.sharedData.updatedAt=new Date().toISOString();
    window.dispatchEvent(new CustomEvent('rb-profile-store-updated',{detail:store}));
    return window.__rbPageMarker==='same-page' && !document.querySelector('#profile-login-form');
  })()`);
  if (!liveUpdateKeptPage) throw new Error('A atualização remota recarregou ou bloqueou a tela.');
  await win.webContents.executeJavaScript(`document.querySelector('#profile-switcher').click(); document.querySelector('[data-action="new-profile"]').click(); document.querySelector('#profileName').value='Perfil PIN'; document.querySelector('#profilePassword').value='1234'; document.querySelector('#profilePasswordConfirm').value='1234'; document.querySelector('#modal-form').requestSubmit();`);
  await wait(300);
  const pinStored = await win.webContents.executeJavaScript(`(() => { const store=JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1')); const profile=store.profiles.find(item=>item.name==='Perfil PIN'); return Boolean(profile && profile.passwordHash && profile.passwordType==='pin'); })()`);
  if (!pinStored) throw new Error('O PIN numérico não foi salvo corretamente.');
  await win.webContents.executeJavaScript(`sessionStorage.removeItem('rb_gestao_financeira_authenticated_profile_v1')`);
  await win.reload();
  await wait(250);
  await win.webContents.executeJavaScript(`document.querySelector('#profileLoginPassword').value='1234'; document.querySelector('#profile-login-form').requestSubmit();`);
  await wait(250);
  if (await win.webContents.executeJavaScript(`Boolean(document.querySelector('#profile-login-form'))`)) throw new Error('O perfil protegido não abriu com o PIN correto.');
  await win.webContents.executeJavaScript(`(async () => { const key='rb_gestao_financeira_profiles_v1'; const store=JSON.parse(localStorage.getItem(key)); const profile=store.profiles.find(item=>item.name==='Perfil PIN'); const bytes=new TextEncoder().encode(profile.id+'|RB-GESTAO|'+'abc1'); const digest=await crypto.subtle.digest('SHA-256',bytes); profile.passwordHash=Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join(''); delete profile.passwordType; localStorage.setItem(key,JSON.stringify(store)); sessionStorage.removeItem('rb_gestao_financeira_authenticated_profile_v1'); })()`);
  await win.reload();
  await wait(250);
  const legacyReady=await win.webContents.executeJavaScript(`document.querySelector('#profileLoginPassword').inputMode==='text'`);
  if(!legacyReady) throw new Error('O campo não reconheceu a senha antiga.');
  await win.webContents.executeJavaScript(`document.querySelector('#profileLoginPassword').value='abc1'; document.querySelector('#profile-login-form').requestSubmit();`);
  await wait(250);
  if (await win.webContents.executeJavaScript(`Boolean(document.querySelector('#profile-login-form'))`)) {
    const debug=await win.webContents.executeJavaScript(`(() => {const store=JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1'));const profile=store.profiles.find(item=>item.name==='Perfil PIN');return {profile,errorHidden:document.querySelector('#profile-login-error').hidden,inputMode:document.querySelector('#profileLoginPassword').inputMode,session:sessionStorage.getItem('rb_gestao_financeira_authenticated_profile_v1')};})()`);
    await fs.writeFile(path.join(temp,'legacy-debug.json'),JSON.stringify(debug,null,2),'utf8');
    throw new Error('O perfil não abriu com a senha antiga correta.');
  }
  await fs.writeFile(path.join(temp, 'SUCCESS.txt'), 'Login numérico e permanência da sessão validados.', 'utf8');
  win.destroy();
  console.log('Login numérico e permanência da sessão validados.');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
