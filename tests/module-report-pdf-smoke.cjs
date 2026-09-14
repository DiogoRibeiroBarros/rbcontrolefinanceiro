const { app, BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'output', 'pdf');
const tempRoot = path.join(projectRoot, 'tmp', 'module-report-pdfs');
const userData = path.join(tempRoot, 'electron-user-data');
const outputs = {
  dashboard: path.join(outputDir, 'RB_Gestao_Relatorio_Painel_Validacao.pdf'),
  entries: path.join(outputDir, 'RB_Gestao_Relatorio_Transacoes_Validacao.pdf')
};

if (!userData.startsWith(projectRoot + path.sep)) throw new Error('Diretório temporário fora do projeto.');
app.setPath('userData', userData);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function createPdf(win, moduleId, output) {
  await win.webContents.executeJavaScript(`document.querySelector('[data-action="open-module-report"][data-report-module="${moduleId}"]').click();`);
  await wait(220);
  const ready = await win.webContents.executeJavaScript(`Boolean(document.querySelector('#module-report-sheet .report-app-name'))`);
  if (!ready) throw new Error(`Relatório do módulo ${moduleId} não foi renderizado.`);
  await win.webContents.executeJavaScript(`window.scrollTo(0, 0); document.querySelector('.report-modal').scrollTop = 0; document.body.classList.add('printing-loan-report', 'printing-report-dark');`);
  const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4', preferCSSPageSize: true });
  await fs.writeFile(output, pdf);
  await win.webContents.executeJavaScript(`document.body.classList.remove('printing-loan-report', 'printing-report-dark'); document.querySelector('[data-action="close-modal"]').click();`);
}

app.whenReady().then(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  const win = new BrowserWindow({ width: 1280, height: 900, show: false, webPreferences: { contextIsolation: true } });
  await win.loadFile(path.join(projectRoot, 'app', 'index.html'));
  await wait(250);
  await createPdf(win, 'dashboard', outputs.dashboard);
  await win.webContents.executeJavaScript(`document.querySelector('[data-screen="entries"]').click();`);
  await wait(100);
  await createPdf(win, 'entries', outputs.entries);
  win.destroy();
  await fs.rm(tempRoot, { recursive: true, force: true });
  console.log(Object.values(outputs).join('\n'));
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
