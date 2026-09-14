const { app, BrowserWindow, Menu, Tray, shell, ipcMain, dialog } = require('electron');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { autoUpdater } = require('electron-updater');
function updateErrorLog(event, error, extra) { try { const dir=app.getPath('userData'); fs.mkdirSync(dir,{recursive:true}); fs.appendFileSync(path.join(dir,'atualizador-erros.log'), JSON.stringify({date:new Date().toISOString(),event,error:String(error&&error.message||error||''),details:extra||null})+'\n'); } catch (_) {} }

const APP_ID = 'br.com.rbgestao.financeira';
app.setName('RB Gestão Financeira');
app.setAppUserModelId(APP_ID);

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

let mainWindow = null;
let backupSnapshot = null;
let backupTimer = null;
let startupBackupCreated = false;
let syncServer = null;
let tray = null;
let isQuitting = false;
let closeBackupRunning = false;
// 41731 é usada pelo NetBird em algumas instalações do Windows.
// Mantemos o serviço do RB Gestão em uma porta própria para evitar conflitos.
const SYNC_PORT = Number(process.env.RB_SYNC_PORT || 41732);
const syncConfigFile = () => path.join(app.getPath('userData'), 'mobile-sync.json');
function loadSyncConfiguration() {
  let saved={};
  try { saved=JSON.parse(fs.readFileSync(syncConfigFile(), 'utf8'))||{}; } catch (_) {}
  const accessToken=typeof saved.accessToken==='string'&&saved.accessToken.length>=24?saved.accessToken:crypto.randomBytes(24).toString('base64url');
  const configuration={accessToken,publicUrl:String(saved.publicUrl||process.env.RB_SYNC_PUBLIC_URL||'').replace(/\/$/,'')};
  fs.mkdirSync(path.dirname(syncConfigFile()), { recursive:true });
  fs.writeFileSync(syncConfigFile(), JSON.stringify(configuration, null, 2), 'utf8');
  return configuration;
}
function saveSyncConfiguration(){fs.writeFileSync(syncConfigFile(),JSON.stringify(syncConfiguration,null,2),'utf8');}
const syncConfiguration = loadSyncConfiguration();
const SYNC_ACCESS_TOKEN = syncConfiguration.accessToken;
const WEB_ROOT = path.join(__dirname, 'app');

function syncAuthorized(request, url) {
  const bearer = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const cookie = String(request.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('rb_sync='));
  const cookieToken = cookie ? decodeURIComponent(cookie.slice('rb_sync='.length)) : '';
  return bearer === SYNC_ACCESS_TOKEN || cookieToken === SYNC_ACCESS_TOKEN || url.searchParams.get('key') === SYNC_ACCESS_TOKEN;
}
function sendWebFile(response, relativePath, setCookie) {
  const target = path.resolve(WEB_ROOT, relativePath);
  if (!target.startsWith(path.resolve(WEB_ROOT) + path.sep) && target !== path.resolve(WEB_ROOT, 'index.html')) return writeSyncResponse(response, 403, { ok:false });
  const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json' };
  try {
    const headers = { 'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store' };
    if (setCookie) headers['Set-Cookie'] = `rb_sync=${encodeURIComponent(SYNC_ACCESS_TOKEN)}; Path=/; HttpOnly; Secure; SameSite=Strict`;
    response.writeHead(200, headers); fs.createReadStream(target).pipe(response);
  } catch (_) { writeSyncResponse(response, 404, { ok:false, message:'Arquivo não encontrado.' }); }
}
const backupConfigFile = () => path.join(app.getPath('userData'), 'backup-config.json');
const defaultBackupFolder = () => path.join(app.getPath('documents'), 'RB Gestão Financeira', 'Backups');
let backupConfig = { mode:'on-close', time:'20:00', folder:'', retention:30, lastBackupAt:'', lastBackupPath:'', lastError:'', lastDailyDate:'' };

function normalizeBackupConfig(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    mode: ['off','daily','on-close','daily-and-close'].includes(source.mode) ? source.mode : 'on-close',
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(source.time || '') ? source.time : '20:00',
    folder: typeof source.folder === 'string' ? source.folder : '',
    retention: [7,15,30,60,90].includes(Number(source.retention)) ? Number(source.retention) : 30,
    lastBackupAt: String(source.lastBackupAt || ''), lastBackupPath: String(source.lastBackupPath || ''),
    lastError: String(source.lastError || ''), lastDailyDate: String(source.lastDailyDate || '')
  };
}
function loadBackupConfig() {
  try { backupConfig = normalizeBackupConfig(JSON.parse(fs.readFileSync(backupConfigFile(), 'utf8'))); } catch (_) { backupConfig = normalizeBackupConfig(backupConfig); }
}
function saveBackupConfig() {
  fs.mkdirSync(path.dirname(backupConfigFile()), { recursive:true });
  fs.writeFileSync(backupConfigFile(), JSON.stringify(backupConfig, null, 2), 'utf8');
}
function backupFolder() { return backupConfig.folder || defaultBackupFolder(); }
function timestampName(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${String(date.getMilliseconds()).padStart(3,'0')}`;
}
async function pruneBackups(folder) {
  const names = (await fs.promises.readdir(folder)).filter(name => /^RB_Gestao_Backup_.*\.json$/i.test(name)).sort().reverse();
  await Promise.all(names.slice(backupConfig.retention).map(name => fs.promises.unlink(path.join(folder, name)).catch(() => {})));
}
async function createAutomaticBackup(reason) {
  if (!backupSnapshot) throw new Error('Os dados ainda não estão disponíveis para backup.');
  const folder = backupFolder();
  await fs.promises.mkdir(folder, { recursive:true });
  const target = path.join(folder, `RB_Gestao_Backup_${timestampName(new Date())}_${reason}.json`);
  const temporary = `${target}.tmp`;
  const packageToWrite = Object.assign({}, backupSnapshot, { exportedAt:new Date().toISOString(), automaticReason:reason });
  await fs.promises.writeFile(temporary, JSON.stringify(packageToWrite, null, 2), 'utf8');
  await fs.promises.rename(temporary, target);
  backupConfig.lastBackupAt = new Date().toISOString();
  backupConfig.lastBackupPath = target;
  backupConfig.lastError = '';
  saveBackupConfig();
  await pruneBackups(folder);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('backup:completed', { ok:true, path:target, at:backupConfig.lastBackupAt, reason });
  return { ok:true, path:target, at:backupConfig.lastBackupAt, reason };
}
function scheduleDailyBackup() {
  if (backupTimer) clearInterval(backupTimer);
  backupTimer = setInterval(() => {
    if (!['daily','daily-and-close'].includes(backupConfig.mode)) return;
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');
    const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const currentDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    if (currentTime < backupConfig.time || backupConfig.lastDailyDate === currentDate) return;
    backupConfig.lastDailyDate = currentDate;
    saveBackupConfig();
    createAutomaticBackup('diario').catch(error => { backupConfig.lastError=error.message; saveBackupConfig(); });
  }, 30000);
}

function writeSyncResponse(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}
function readSyncBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
      request.on('data', chunk => { body += chunk; if (body.length > 5 * 1024 * 1024) reject(new Error('Solicitação muito grande.')); });
    request.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (_) { reject(new Error('JSON inválido.')); } });
    request.on('error', reject);
  });
}
function startSyncServer() {
  if (syncServer) return;
  syncServer = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://127.0.0.1:${SYNC_PORT}`);
    if (!syncAuthorized(request, url)) return writeSyncResponse(response, 401, { ok:false, message:'Chave de acesso inválida.' });
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/mobile')) return sendWebFile(response, 'index.html', true);
    if (request.method === 'GET' && /^\/(app\.js|remote-bridge\.js|styles\.css|app\.webmanifest|assets\/[-\w./]+)$/.test(url.pathname)) return sendWebFile(response, url.pathname.slice(1), false);
    if (request.method === 'GET' && url.pathname === '/health') return writeSyncResponse(response, 200, { ok: true, product: 'RB Gestão Financeira', ready: Boolean(backupSnapshot), transport: 'tailscale-local' });
    if (request.method === 'GET' && url.pathname === '/v1/sync') {
      if (!backupSnapshot) return writeSyncResponse(response, 503, { ok: false, message: 'O desktop ainda está preparando os dados.' });
      return writeSyncResponse(response, 200, { ok: true, message: 'Dados do desktop enviados.', snapshot: backupSnapshot });
    }
    if (request.method === 'POST' && url.pathname === '/v1/sync') {
      try {
        const payload = await readSyncBody(request);
        const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];
        if (transactions.length && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('sync:incoming', { transactions });
        return writeSyncResponse(response, 200, { ok: true, accepted: transactions.length, message: transactions.length ? 'Lançamentos recebidos pelo desktop.' : 'Nenhum lançamento pendente.' });
      } catch (error) { return writeSyncResponse(response, 400, { ok: false, message: error.message }); }
    }
    if (request.method === 'POST' && url.pathname === '/v1/profile-store') {
      try {
        const payload = await readSyncBody(request);
        if (!payload || payload.format !== 'rb-gestao-profiles-v1' || !payload.profileStore) return writeSyncResponse(response, 400, { ok:false, message:'Perfil inválido.' });
        const exportedAt = new Date().toISOString();
        const incomingStore = payload.profileStore;
        const desktopActiveId = backupSnapshot && backupSnapshot.profileStore && backupSnapshot.profileStore.activeProfileId;
        const profiles = Array.isArray(incomingStore.profiles) ? incomingStore.profiles : [];
        const sharedStore = Object.assign({}, incomingStore, { activeProfileId:profiles.some(profile => profile.id === desktopActiveId) ? desktopActiveId : incomingStore.activeProfileId });
        backupSnapshot = Object.assign({}, payload, { profileStore:sharedStore, exportedAt });
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('sync:incoming', { profileStore:sharedStore });
        return writeSyncResponse(response, 200, { ok:true, exportedAt, message:'Perfil atualizado no desktop.' });
      } catch (error) { return writeSyncResponse(response, 400, { ok:false, message:error.message }); }
    }
    return writeSyncResponse(response, 404, { ok: false, message: 'Rota não encontrada.' });
  });
  syncServer.listen(SYNC_PORT, '127.0.0.1');
  syncServer.on('clientError', (error, socket) => { updateErrorLog('sync-client', error); if (socket && !socket.destroyed) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); });
  syncServer.on('error', error => { console.error('RB sync server:', error.message); });
}

loadBackupConfig();
scheduleDailyBackup();

ipcMain.on('backup:snapshot', (_event, payload) => {
  if (!payload || payload.format !== 'rb-gestao-profiles-v1') return;
  backupSnapshot = payload;
  if (!startupBackupCreated) {
    startupBackupCreated = true;
    createAutomaticBackup('inicializacao').catch(error => { backupConfig.lastError=error.message; saveBackupConfig(); });
  }
});
ipcMain.handle('backup:configure', (_event, value) => { backupConfig = Object.assign(normalizeBackupConfig(Object.assign({}, backupConfig, value)), { lastBackupAt:backupConfig.lastBackupAt, lastBackupPath:backupConfig.lastBackupPath, lastError:backupConfig.lastError, lastDailyDate:backupConfig.lastDailyDate }); saveBackupConfig(); scheduleDailyBackup(); return Object.assign({}, backupConfig, { folder:backupFolder() }); });
ipcMain.handle('backup:status', () => Object.assign({}, backupConfig, { folder:backupFolder() }));
ipcMain.handle('backup:choose-folder', async () => { const result=await dialog.showOpenDialog(mainWindow,{title:'Escolha a pasta dos backups',properties:['openDirectory','createDirectory']}); if(result.canceled || !result.filePaths[0]) return null; backupConfig.folder=result.filePaths[0]; saveBackupConfig(); return Object.assign({},backupConfig,{folder:backupFolder()}); });
ipcMain.handle('backup:run-now', async (_event, payload) => { if(payload && payload.format==='rb-gestao-profiles-v1') backupSnapshot=payload; try{return await createAutomaticBackup('manual');}catch(error){backupConfig.lastError=error.message;saveBackupConfig();return {ok:false,error:error.message};} });
ipcMain.handle('sync:status', () => ({ port:SYNC_PORT, accessToken:SYNC_ACCESS_TOKEN, publicUrl:syncConfiguration.publicUrl, accessUrl:syncConfiguration.publicUrl ? syncConfiguration.publicUrl + '/mobile?key=' + encodeURIComponent(SYNC_ACCESS_TOKEN) : '' }));
ipcMain.handle('sync:configure', (_event,value) => { syncConfiguration.publicUrl=String(value&&value.publicUrl||'').trim().replace(/\/$/,''); saveSyncConfiguration(); return {port:SYNC_PORT,accessToken:SYNC_ACCESS_TOKEN,publicUrl:syncConfiguration.publicUrl,accessUrl:syncConfiguration.publicUrl?syncConfiguration.publicUrl+'/mobile?key='+encodeURIComponent(SYNC_ACCESS_TOKEN):''}; });
ipcMain.handle('updates:check', async () => { if (!app.isPackaged) return {ok:false,message:'A verificação fica disponível no aplicativo Windows instalado.'}; try { const result=await autoUpdater.checkForUpdates(); return {ok:true,available:Boolean(result&&result.updateInfo&&result.updateInfo.version),version:result&&result.updateInfo&&result.updateInfo.version||''}; } catch(error) { updateErrorLog('check',error); return {ok:false,message:error.message}; } });
ipcMain.handle('updates:force', async () => { if (!app.isPackaged) return {ok:false,message:'A atualização fica disponível no aplicativo Windows instalado.'}; try { autoUpdater.autoDownload=true; const result=await autoUpdater.checkForUpdates(); if(!result||!result.updateInfo)return {ok:true,available:false}; await autoUpdater.downloadUpdate(); return {ok:true,available:true,downloaded:true,version:result.updateInfo.version}; } catch(error) { updateErrorLog('download',error); return {ok:false,message:error.message}; } });

function createWindow() {
  const backgroundStart = process.argv.includes('--background');
  const iconPath = path.join(__dirname, 'app', 'assets', 'rb_gestao.ico');
  mainWindow = new BrowserWindow({
    title: 'RB Gestão Financeira',
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#0b0f14',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'app', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false
    }
  });
  Menu.setApplicationMenu(null);
  mainWindow.once('ready-to-show', () => {
    if (!backgroundStart) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));
  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    if (closeBackupRunning) return;
    const hideWindow = () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide(); };
    if (!['on-close','daily-and-close'].includes(backupConfig.mode) || !backupSnapshot) return hideWindow();
    closeBackupRunning = true;
    createAutomaticBackup('segundo-plano').catch(error => { backupConfig.lastError=error.message; saveBackupConfig(); }).finally(() => { closeBackupRunning=false; hideWindow(); });
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}
function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, 'app', 'assets', 'rb_gestao.ico');
  tray = new Tray(iconPath);
  tray.setToolTip('RB Gestão Financeira - serviço ativo');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label:'Abrir RB Gestão', click:showMainWindow },
    { label:'Serviço de sincronização ativo', enabled:false },
    { type:'separator' },
    { label:'Gerar backup agora', click:() => createAutomaticBackup('bandeja').catch(error => { backupConfig.lastError=error.message; saveBackupConfig(); }) },
    { label:'Encerrar completamente', click:() => {
      isQuitting=true;
      const finish=() => app.quit();
      if (backupSnapshot && ['on-close','daily-and-close'].includes(backupConfig.mode)) createAutomaticBackup('fechamento').catch(() => {}).finally(finish);
      else finish();
    } }
  ]));
  tray.on('click', showMainWindow);
  tray.on('double-click', showMainWindow);
}

function configureAutomaticUpdates() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.on('update-available', info => console.log('Atualização disponível:', info.version));
  autoUpdater.on('update-downloaded', info => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    dialog.showMessageBox(mainWindow, { type:'info', title:'Atualização pronta', message:`A versão ${info.version} foi baixada.`, detail:'Ela será instalada quando o RB Gestão Financeira for reiniciado.', buttons:['Reiniciar agora','Depois'], defaultId:0, cancelId:1 }).then(result => { if (result.response === 0) autoUpdater.quitAndInstall(); });
  });
  autoUpdater.on('error', error => { updateErrorLog('automatic',error); console.error('Atualização automática:', error.message); });
  autoUpdater.checkForUpdatesAndNotify().catch(error => console.error('Verificação de atualização:', error.message));
}

app.whenReady().then(() => {
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin:true, path:process.execPath, args:['--background'] });
  startSyncServer();
  createWindow();
  createTray();
  configureAutomaticUpdates();
});
app.on('second-instance', () => {
  showMainWindow();
});
app.on('activate', showMainWindow);
app.on('window-all-closed', () => {});
app.on('before-quit', () => { isQuitting=true; if (syncServer) syncServer.close(); if(tray){tray.destroy();tray=null;} });
