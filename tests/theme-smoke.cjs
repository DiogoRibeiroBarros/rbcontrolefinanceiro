const { app, BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const temp = path.join(root, 'tmp', 'theme-smoke');
if (!temp.startsWith(root + path.sep)) throw new Error('Diretório temporário fora do projeto.');
app.setPath('userData', path.join(temp, 'user-data'));

async function assert(win, expression, message) {
  if (!await win.webContents.executeJavaScript(`Boolean(${expression})`)) throw new Error(message);
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function contrast(foreground, background) {
  const parse = value => (value.match(/\d+/g) || []).slice(0,3).map(Number);
  const luminance = value => { const c=parse(value).map(v=>v/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const a=luminance(foreground), b=luminance(background);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}

app.whenReady().then(async () => {
  await fs.rm(temp, { recursive: true, force: true });
  await fs.mkdir(temp, { recursive: true });
  const win = new BrowserWindow({ width: 1440, height: 900, show: false, webPreferences: { contextIsolation: true } });
  await win.loadFile(path.join(root, 'app', 'index.html'));
  await assert(win, `document.body.dataset.theme === 'dark'`, 'O modo escuro inicial não foi aplicado.');
  await win.webContents.capturePage().then(image => fs.writeFile(path.join(temp, 'app-dark.png'), image.toPNG()));
  await win.webContents.executeJavaScript(`document.querySelector('[data-screen="settings"]').click();`);
  await wait(100);
  await win.webContents.executeJavaScript(`document.querySelector('#settings-theme').value = 'light'; document.querySelector('#settings-theme').dispatchEvent(new Event('change', { bubbles:true }));`);
  await wait(200);
  await assert(win, `document.body.dataset.theme === 'light'`, 'O modo claro não foi aplicado.');
  await win.webContents.executeJavaScript(`document.querySelector('[data-screen="dashboard"]').click();`);
  await wait(100);
  await assert(win, `getComputedStyle(document.body).backgroundColor === 'rgb(238, 242, 236)'`, 'O fundo claro não corresponde ao tema.');
  await assert(win, `getComputedStyle(document.querySelector('.metric-value.green')).color === 'rgb(8, 122, 54)'`, 'O verde de leitura do modo claro está sem contraste.');
  const colorSamples = await win.webContents.executeJavaScript(`(() => { const panel=getComputedStyle(document.querySelector('.metric-card')).backgroundColor; return {panel,green:getComputedStyle(document.querySelector('.metric-value.green')).color,red:getComputedStyle(document.querySelector('.metric-value.red')).color,muted:getComputedStyle(document.querySelector('.metric-card .card-subtitle')).color}; })()`);
  if (contrast(colorSamples.green,colorSamples.panel)<4.5 || contrast(colorSamples.red,colorSamples.panel)<4.5 || contrast(colorSamples.muted,colorSamples.panel)<4.5) throw new Error('Contraste insuficiente: '+JSON.stringify(colorSamples));
  await win.webContents.capturePage().then(image => fs.writeFile(path.join(temp, 'app-light.png'), image.toPNG()));
  await win.reload();
  await assert(win, `document.body.dataset.theme === 'light'`, 'O modo claro não permaneceu após recarregar.');
  await win.webContents.executeJavaScript(`document.querySelector('[data-screen="loans"]').click(); document.querySelector('[data-action="open-loan-report"][data-kind="detalhado"]').click();`);
  await wait(250);
  await assert(win, `document.querySelector('#loan-report-sheet').dataset.reportTheme === 'light'`, 'O relatório não acompanhou o modo claro.');
  await win.webContents.executeJavaScript(`document.querySelector('[data-action="close-modal"]').click(); document.querySelector('[data-screen="settings"]').click();`);
  await wait(100);
  await win.webContents.executeJavaScript(`document.querySelector('#settings-theme').value = 'dark'; document.querySelector('#settings-theme').dispatchEvent(new Event('change', { bubbles:true })); document.querySelector('[data-screen="loans"]').click(); document.querySelector('[data-action="open-loan-report"][data-kind="detalhado"]').click();`);
  await wait(250);
  await assert(win, `document.querySelector('#loan-report-sheet').dataset.reportTheme === 'dark'`, 'O relatório não acompanhou o modo escuro.');
  await assert(win, `getComputedStyle(document.querySelector('#loan-report-sheet')).backgroundColor === 'rgb(23, 24, 27)'`, 'O fundo escuro do relatório está incorreto.');
  await win.webContents.capturePage().then(image => fs.writeFile(path.join(temp, 'report-dark.png'), image.toPNG()));
  win.destroy();
  console.log('Temas do aplicativo e do PDF validados, incluindo persistência.');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
