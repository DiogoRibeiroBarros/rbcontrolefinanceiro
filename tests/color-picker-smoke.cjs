const { app, BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const temp = path.join(root, 'tmp', 'color-picker-smoke');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

app.setPath('userData', path.join(temp, 'user-data'));

app.whenReady().then(async () => {
  await fs.rm(temp, { recursive:true, force:true });
  await fs.mkdir(temp, { recursive:true });
  const win = new BrowserWindow({ width:1280, height:850, show:false, webPreferences:{ contextIsolation:true } });
  await win.loadFile(path.join(root, 'app', 'index.html'));
  await win.webContents.executeJavaScript(`document.querySelector('[data-screen="cards"]').click(); document.querySelector('[data-action="new-card"]').click(); document.querySelector('#name').value='Cartão colorido'; document.querySelector('#limit').value='1500'; document.querySelector('#cardColor').value='#123456'; document.querySelector('#modal-form').requestSubmit();`);
  await wait(100);
  const cardOk = await win.webContents.executeJavaScript(`(() => { const store=JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1')); const card=store.profiles[0].data.cards.find(item => item.name==='Cartão colorido'); const visual=Array.from(document.querySelectorAll('.card')).find(item => item.textContent.includes('Cartão colorido'))?.querySelector('.card-visual'); const icon=visual?.querySelector('.card-brand-icon img'); return card && card.color==='#123456' && visual && visual.style.getPropertyValue('--card-color')==='#123456' && icon && icon.getAttribute('src').includes('visa.svg'); })()`);
  if (!cardOk) throw new Error('A cor personalizada do cartão não foi salva ou exibida.');
  await win.webContents.executeJavaScript(`document.querySelector('#profile-switcher').click(); document.querySelector('[data-action="new-profile"]').click(); document.querySelector('#profileName').value='Perfil azul'; document.querySelector('#profileColor').value='#2468AC'; document.querySelector('#modal-form').requestSubmit();`);
  await wait(100);
  const profileOk = await win.webContents.executeJavaScript(`(() => { const store=JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1')); const profile=store.profiles.find(item => item.name==='Perfil azul'); return profile && profile.color==='#2468AC'; })()`);
  if (!profileOk) throw new Error('A cor personalizada do perfil não foi salva.');
  win.destroy();
  await fs.rm(temp, { recursive:true, force:true });
  console.log('Seletores de cores de cartões e perfis validados.');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
