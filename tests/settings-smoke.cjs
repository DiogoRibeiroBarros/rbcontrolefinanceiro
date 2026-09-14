const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const temp = path.join(root, 'tmp', 'settings-smoke');
if (!temp.startsWith(root + path.sep)) throw new Error('Diretório temporário fora do projeto.');
app.setPath('userData', path.join(temp, 'user-data'));
let snapshot = null;
let configured = null;
const folder = path.join(temp, 'backups');
let mockStatus = { folder, mode:'on-close', time:'20:00', retention:30, lastBackupAt:'', lastBackupPath:'', lastError:'' };

ipcMain.on('backup:snapshot', (_event, payload) => { snapshot = payload; });
ipcMain.handle('backup:configure', (_event, value) => { configured = value; mockStatus=Object.assign({},mockStatus,value); return mockStatus; });
ipcMain.handle('backup:status', () => mockStatus);
ipcMain.handle('backup:choose-folder', () => ({ folder, mode:'daily-and-close', time:'21:30', retention:15, lastBackupAt:'', lastBackupPath:'', lastError:'' }));
ipcMain.handle('backup:run-now', (_event, payload) => { snapshot=payload; mockStatus=Object.assign({},mockStatus,{lastBackupAt:'2026-08-25T21:30:00.000Z',lastBackupPath:path.join(folder,'RB_Gestao_Backup_teste_manual.json')}); return { ok:true, path:mockStatus.lastBackupPath, at:mockStatus.lastBackupAt, reason:'manual' }; });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function assert(win, expression, message) { if (!await win.webContents.executeJavaScript(`Boolean(${expression})`)) throw new Error(message); }

app.whenReady().then(async () => {
  await fs.rm(temp, { recursive:true, force:true });
  await fs.mkdir(temp, { recursive:true });
  const win = new BrowserWindow({ width:1440, height:900, show:false, webPreferences:{ preload:path.join(root,'app','preload.cjs'), contextIsolation:true, sandbox:true } });
  await win.loadFile(path.join(root,'app','index.html'));
  await wait(250);
  await win.webContents.executeJavaScript(`document.querySelector('[data-screen="settings"]').click()`);
  await assert(win, `document.querySelector('#settings-backup-mode') && !document.querySelector('[data-screen="backup"]')`, 'A aba Configurações não substituiu Backup.');
  await assert(win, `document.body.textContent.includes('Sempre que o aplicativo fechar') && document.body.textContent.includes('Gerar backup agora')`, 'As opções automáticas não foram exibidas.');
  await win.webContents.executeJavaScript(`
    const mode=document.querySelector('#settings-backup-mode'); mode.value='daily-and-close'; mode.dispatchEvent(new Event('change',{bubbles:true}));
  `);
  await wait(150);
  await win.webContents.executeJavaScript(`
    const time=document.querySelector('#settings-backup-time'); time.value='21:30'; time.dispatchEvent(new Event('change',{bubbles:true}));
  `);
  await wait(120);
  await win.webContents.executeJavaScript(`const retention=document.querySelector('#settings-backup-retention'); retention.value='15'; retention.dispatchEvent(new Event('change',{bubbles:true}));`);
  await wait(180);
  await assert(win, `(() => { const s=JSON.parse(localStorage.getItem('rb_gestao_financeira_app_settings_v1')); return s.autoBackupMode === 'daily-and-close' && s.backupTime === '21:30' && s.backupRetention === 15; })()`, 'As preferências automáticas não foram salvas.');
  await assert(win, `document.querySelector('#settings-backup-time').value === '21:30' && document.querySelector('#settings-backup-retention').value === '15'`, 'A tela não refletiu o horário e a retenção salvos.');
  if (!configured || configured.mode !== 'daily-and-close' || configured.time !== '21:30' || configured.retention !== 15) throw new Error('A configuração não chegou ao processo do Windows.');
  await win.webContents.executeJavaScript(`document.querySelector('[data-action="run-auto-backup"]').click()`);
  await wait(180);
  await assert(win, `document.querySelector('.backup-status').textContent.includes('25/08/2026')`, 'O status do backup manual não foi atualizado.');
  if (!snapshot || snapshot.format !== 'rb-gestao-profiles-v1' || !snapshot.profileStore) throw new Error('O backup não recebeu todos os perfis.');
  await win.webContents.capturePage().then(image => fs.writeFile(path.join(temp,'configuracoes.png'),image.toPNG()));
  await win.webContents.executeJavaScript(`const theme=document.querySelector('#settings-theme'); theme.value='light'; theme.dispatchEvent(new Event('change',{bubbles:true}));`);
  await wait(200);
  await assert(win, `document.body.dataset.theme === 'light' && getComputedStyle(document.querySelector('.settings-section')).backgroundColor === 'rgb(255, 255, 255)'`, 'O tema claro não foi aplicado pela aba Configurações.');
  await win.webContents.capturePage().then(image => fs.writeFile(path.join(temp,'configuracoes-claro.png'),image.toPNG()));
  console.log('Configurações, backup manual e preferências automáticas validados.');
  win.destroy(); app.quit();
}).catch(error => { console.error(error); app.exit(1); });
