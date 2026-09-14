const { app, BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'output', 'pdf');
const tempRoot = path.join(projectRoot, 'tmp', 'pdfs');
const isolatedUserData = path.join(tempRoot, 'electron-user-data');
const outputs = {
  light: path.join(outputDir, 'RB_Gestao_Relatorio_Emprestimos_Claro_Validacao.pdf'),
  dark: path.join(outputDir, 'RB_Gestao_Relatorio_Emprestimos_Escuro_Validacao.pdf')
};

if (!isolatedUserData.startsWith(projectRoot + path.sep)) throw new Error('Diretório temporário fora do projeto.');
app.setPath('userData', isolatedUserData);

async function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

app.whenReady().then(async () => {
  await fs.rm(isolatedUserData, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  const win = new BrowserWindow({ width: 1280, height: 900, show: false, webPreferences: { contextIsolation: true } });
  await win.loadFile(path.join(projectRoot, 'app', 'index.html'));
  await wait(300);
  await win.webContents.executeJavaScript(`
    document.querySelector('[data-screen="loans"]').click();
    document.querySelector('[data-action="new-loan"]').click();
    document.querySelector('#name').value = 'Contrato de validação do PDF';
    document.querySelector('#loanValue').value = '1200';
    document.querySelector('#installments').value = '6';
    document.querySelector('#modal-form').requestSubmit();
  `);
  await wait(250);
  await win.webContents.executeJavaScript(`document.querySelector('[data-action="open-loan-report"][data-kind="detalhado"]').click();`);
  await wait(500);
  const reportReady = await win.webContents.executeJavaScript(`Boolean(document.querySelector('#loan-report-sheet .report-app-name'))`);
  if (!reportReady) throw new Error('Cabeçalho do relatório não foi renderizado.');
  for (const theme of ['light', 'dark']) {
    await win.webContents.executeJavaScript(`document.querySelector('[data-action="close-modal"]').click(); localStorage.setItem('rb_gestao_financeira_theme_v1', '${theme}'); location.reload();`);
    await wait(200);
    await win.webContents.executeJavaScript(`document.querySelector('[data-screen="loans"]').click(); document.querySelector('[data-action="open-loan-report"][data-kind="detalhado"]').click();`);
    await wait(200);
    const selectedTheme = await win.webContents.executeJavaScript(`document.querySelector('#loan-report-sheet').dataset.reportTheme`);
    if (selectedTheme !== theme) throw new Error(`O relatório não acompanhou o tema ${theme}.`);
    await win.webContents.executeJavaScript(`document.body.classList.add('printing-loan-report'); document.body.classList.toggle('printing-report-dark', '${theme}' === 'dark');`);
    const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4', preferCSSPageSize: true });
    await fs.writeFile(outputs[theme], pdf);
    await win.webContents.executeJavaScript(`document.body.classList.remove('printing-loan-report', 'printing-report-dark');`);
  }
  win.destroy();
  await fs.rm(isolatedUserData, { recursive: true, force: true });
  console.log(Object.values(outputs).join('\n'));
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
