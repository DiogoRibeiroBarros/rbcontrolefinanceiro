const { app, BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const temp = path.join(root, 'tmp', 'all-module-reports-smoke');
if (!temp.startsWith(root + path.sep)) throw new Error('Diretório temporário fora do projeto.');
app.setPath('userData', path.join(temp, 'user-data'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function clickOrFail(win, selector, label) {
  const ok = await win.webContents.executeJavaScript(`
    (() => {
      const el=document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.click();
      return true;
    })()
  `);
  if (!ok) throw new Error(`${label} não foi encontrado: ${selector}`);
}

app.whenReady().then(async () => {
  await fs.rm(temp, { recursive:true, force:true });
  await fs.mkdir(temp, { recursive:true });
  const win = new BrowserWindow({ width:1280, height:850, show:false, webPreferences:{ contextIsolation:true } });
  await win.loadFile(path.join(root, 'app', 'index.html'));
  await wait(250);
  await win.webContents.executeJavaScript(`
    const profileButton=document.querySelector('[data-action="switch-profile"]');
    if (profileButton) profileButton.click();
  `);
  await wait(120);
  for (const moduleId of ['dashboard','accounts','entries','cards','invoices','salary','subscriptions','home-expenses','categories','reports','help']) {
    if (moduleId !== 'dashboard') {
      await clickOrFail(win, `[data-screen="${moduleId}"]`, `Menu ${moduleId}`);
      await wait(70);
    }
    await clickOrFail(win, `[data-action="open-module-report"][data-report-module="${moduleId}"]`, `Relatório ${moduleId}`);
    await wait(80);
    const report = await win.webContents.executeJavaScript(`document.querySelector('#module-report-sheet') && document.querySelector('#module-report-sheet .report-app-name').textContent`);
    if (report !== 'RB Gestão Financeira') throw new Error(`Relatório do módulo ${moduleId} não abriu corretamente.`);
    if (moduleId === 'help' && !await win.webContents.executeJavaScript(`document.querySelector('#module-report-sheet').textContent.includes('Primeiros passos') && document.querySelector('#module-report-sheet').textContent.includes('Configurações e backup')`)) throw new Error('O relatório Help não contém o tutorial completo.');
    await clickOrFail(win, '[data-action="close-modal"]', `Fechar relatório ${moduleId}`);
  }
  await clickOrFail(win, '[data-screen="reports"]', 'Menu reports');
  if (!await win.webContents.executeJavaScript(`Boolean(document.querySelector('[data-report-module="accounts"]')) && Boolean(document.querySelector('[data-report-module="invoices"]'))`)) throw new Error('Central de relatórios não exibiu os módulos financeiros.');
  await clickOrFail(win, '[data-action="open-module-report"][data-report-module="settings"]', 'Relatório settings');
  await wait(80);
  if (!await win.webContents.executeJavaScript(`Boolean(document.querySelector('#module-report-sheet')) && document.querySelector('#module-report-sheet').textContent.includes('Preferências do aplicativo')`)) throw new Error('Relatório de configurações não abriu pela Central de Relatórios.');
  await clickOrFail(win, '[data-action="close-modal"]', 'Fechar relatório settings');
  await clickOrFail(win, '[data-screen="loans"]', 'Menu loans');
  await clickOrFail(win, '[data-action="open-loan-report"][data-kind="sintetico"]', 'Relatório sintético de empréstimos');
  await wait(80);
  if (!await win.webContents.executeJavaScript(`Boolean(document.querySelector('#loan-report-sheet'))`)) throw new Error('Relatório de empréstimos não abriu corretamente.');
  win.destroy();
  await fs.rm(temp, { recursive:true, force:true });
  console.log('Relatórios de todos os módulos validados.');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
