const { app, BrowserWindow } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appRoot = path.join(root, 'app');
const temp = path.join(root, 'tmp', 'icon-platform-smoke');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function serveFile(response, relativePath) {
  const target = path.resolve(appRoot, relativePath);
  if (!target.startsWith(appRoot + path.sep) && target !== path.join(appRoot, 'index.html')) {
    response.writeHead(403); response.end(); return;
  }
  const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json' };
  response.writeHead(200, { 'Content-Type':types[path.extname(target)] || 'application/octet-stream', 'Cache-Control':'no-store' });
  fs.createReadStream(target).on('error', () => { if (!response.headersSent) response.writeHead(404); response.end(); }).pipe(response);
}

async function unlockAndOpenInstitutions(win) {
  await wait(250);
  await win.webContents.executeJavaScript(`(() => { const profile=document.querySelector('[data-action="switch-profile"]'); if(profile)profile.click(); })()`);
  await wait(100);
  const opened = await win.webContents.executeJavaScript(`(() => { const button=document.querySelector('[data-screen="institutions"]'); if(!button)return false; button.click(); return true; })()`);
  if (!opened) throw new Error('A aba Instituicoes nao abriu.');
  await wait(250);
}

async function assertBankIcon(win, context) {
  const result = await win.webContents.executeJavaScript(`(() => {
    const image=document.querySelector('.institution-row .bank-logo img');
    const nav=Array.from(document.querySelectorAll('#nav [data-screen]')).map(item=>item.getAttribute('data-screen'));
    return { loaded:Boolean(image&&image.complete&&image.naturalWidth>0), src:image&&image.src, order:nav.indexOf('institutions')===nav.indexOf('categories')+1 };
  })()`);
  if (!result.loaded) throw new Error(`Icone bancario nao carregou em ${context}: ${result.src || 'sem imagem'}`);
  if (!result.order) throw new Error(`Ordem da aba incorreta em ${context}.`);
}

async function assertScrollableSidebar(win, context, openMobileMenu) {
  if (openMobileMenu) {
    await win.webContents.executeJavaScript(`document.querySelector('[data-action="mobile-sidebar"]').click()`);
    await wait(100);
  }
  const metrics = await win.webContents.executeJavaScript(`(() => {
    const sidebar=document.querySelector('.sidebar');
    const navigation=document.querySelector('.sidebar-navigation');
    const nav=document.querySelector('#nav');
    return {viewportHeight:innerHeight,sidebarHeight:sidebar.getBoundingClientRect().height,navigationHeight:navigation.getBoundingClientRect().height,navClientHeight:nav.clientHeight,navScrollHeight:nav.scrollHeight,navOverflowY:getComputedStyle(nav).overflowY};
  })()`);
  if (metrics.sidebarHeight > metrics.viewportHeight + 1) throw new Error(`Menu ultrapassou a tela em ${context}.`);
  if (metrics.navigationHeight <= 0 || metrics.navOverflowY !== 'auto') throw new Error(`Rolagem interna não habilitada em ${context}.`);
  if (metrics.navScrollHeight <= metrics.navClientHeight) throw new Error(`Tela curta não ativou a rolagem em ${context}.`);
}

app.setPath('userData', path.join(temp, 'user-data'));
app.whenReady().then(async () => {
  await fsp.rm(temp, { recursive:true, force:true });
  await fsp.mkdir(temp, { recursive:true });

  const desktop = new BrowserWindow({ width:1360, height:900, show:false });
  await desktop.loadFile(path.join(appRoot, 'index.html'));
  await unlockAndOpenInstitutions(desktop);
  await assertBankIcon(desktop, 'aplicativo Windows');
  desktop.setSize(1024, 560);
  await wait(150);
  await assertScrollableSidebar(desktop, 'aplicativo Windows', false);

  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/v1/sync') { response.writeHead(200, { 'Content-Type':'application/json' }); response.end('{}'); return; }
    if (url.pathname === '/v1/profile-store') { response.writeHead(200, { 'Content-Type':'application/json' }); response.end(JSON.stringify({ ok:true, exportedAt:new Date().toISOString() })); return; }
    if (url.pathname === '/' || url.pathname === '/mobile') return serveFile(response, 'index.html');
    return serveFile(response, url.pathname.replace(/^\//, ''));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const site = new BrowserWindow({ width:1360, height:900, show:false });
  await site.loadURL(`http://127.0.0.1:${port}/`);
  await unlockAndOpenInstitutions(site);
  await assertBankIcon(site, 'site');
  site.destroy();

  const mobile = new BrowserWindow({ width:390, height:844, show:false });
  await mobile.loadURL(`http://127.0.0.1:${port}/mobile`);
  await unlockAndOpenInstitutions(mobile);
  await assertBankIcon(mobile, 'aplicativo mobile');
  const mobileLayout = await mobile.webContents.executeJavaScript(`matchMedia('(max-width:760px)').matches`);
  if (!mobileLayout) throw new Error('Layout mobile nao foi ativado.');
  mobile.setSize(390, 560);
  await wait(150);
  await assertScrollableSidebar(mobile, 'aplicativo mobile', true);
  mobile.destroy();
  desktop.destroy();

  await new Promise(resolve => server.close(resolve));
  await fsp.rm(temp, { recursive:true, force:true });
  console.log('Icones validados no Windows, site e mobile.');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
