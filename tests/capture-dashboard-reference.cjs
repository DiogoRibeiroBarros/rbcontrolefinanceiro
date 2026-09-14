const { app, BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const temp = path.join(root, 'tmp', 'dashboard-reference');
const output = path.join(temp, 'visao-geral-atual.png');
const collapsedOutput = path.join(temp, 'visao-geral-menu-recolhido.png');

app.setPath('userData', path.join(temp, 'user-data'));

app.whenReady().then(async () => {
  await fs.rm(temp, { recursive:true, force:true });
  await fs.mkdir(temp, { recursive:true });
  const win = new BrowserWindow({ width:1440, height:900, show:false, webPreferences:{ contextIsolation:true } });
  await win.loadFile(path.join(root, 'app', 'index.html'));
  await new Promise(resolve => setTimeout(resolve, 250));
  const image = await win.webContents.capturePage();
  await fs.writeFile(output, image.toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('#sidebar-toggle').click();`);
  await new Promise(resolve => setTimeout(resolve, 250));
  console.log(await win.webContents.executeJavaScript(`JSON.stringify({collapsed:document.querySelector('#app-shell').classList.contains('sidebar-collapsed'),icon:getComputedStyle(document.querySelector('.brand-collapsed-icon')).display})`));
  const collapsedImage = await win.webContents.capturePage();
  await fs.writeFile(collapsedOutput, collapsedImage.toPNG());
  win.destroy();
  console.log(`${output}\n${collapsedOutput}`);
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
