const { app, BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const temp = path.join(root, 'tmp', 'transaction-series-smoke');
if (!temp.startsWith(root + path.sep)) throw new Error('Diretório temporário fora do projeto.');
app.setPath('userData', path.join(temp, 'user-data'));

async function value(win, expression) { return win.webContents.executeJavaScript(expression); }
async function assert(win, expression, message) { if (!await value(win, `Boolean(${expression})`)) throw new Error(message); }
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  await fs.rm(temp, { recursive:true, force:true });
  await fs.mkdir(temp, { recursive:true });
  const win = new BrowserWindow({ width:1280, height:850, show:false, webPreferences:{ contextIsolation:true } });
  await win.loadFile(path.join(root, 'app', 'index.html'));
  await value(win, `
    document.querySelector('[data-screen="entries"]').click();
    document.querySelector('[data-action="new-entry"]').click();
    document.querySelector('#title').value='Teste parcelas';
    document.querySelector('#amount').value='100';
    document.querySelector('#date').value='2026-09-10';
    document.querySelector('#recurrenceMode').value='Mensal fixa';
    document.querySelector('#recurrenceMode').dispatchEvent(new Event('change'));
    document.querySelector('#recurrenceMonths').value='3';
    document.querySelector('#modal-form').requestSubmit();
  `);
  const creationState = await value(win, `(() => { const s=JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1')); const entries=s.profiles[0].data.entries.filter(item=>item.title==='Teste parcelas'); return {entries, button:Boolean(entries[0] && document.querySelector('[data-action="edit-entry"][data-id="'+entries[0].id+'"]'))}; })()`);
  if (creationState.entries.length !== 3 || !creationState.button) throw new Error('A série não foi criada corretamente: ' + JSON.stringify(creationState));
  const firstId = creationState.entries[0].id;
  await value(win, `
    document.querySelector('[data-action="edit-entry"][data-id="${firstId}"]').click();
    document.querySelector('#amount').value='777';
    document.querySelector('#title').value='Parcelas atualizadas';
    document.querySelector('#modal-form').requestSubmit();
  `);
  await assert(win, `document.querySelector('#edit-whole-series') && document.querySelector('#edit-current-only')`, 'O pop-up Sim/Não não apareceu.');
  await win.webContents.capturePage().then(image => fs.writeFile(path.join(temp, 'confirmacao-edicao.png'), image.toPNG()));
  await value(win, `document.body.setAttribute('data-theme', 'light')`);
  await wait(200);
  await assert(win, `document.body.dataset.theme === 'light' && document.querySelector('#edit-whole-series') && getComputedStyle(document.querySelector('.series-edit-dialog')).backgroundColor === 'rgb(248, 250, 246)'`, 'O pop-up não permaneceu válido no modo claro.');
  await win.webContents.capturePage().then(image => fs.writeFile(path.join(temp, 'confirmacao-edicao-claro.png'), image.toPNG()));
  await value(win, `document.querySelector('#edit-whole-series').click()`);
  let series = await value(win, `(() => { const s=JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1')); return s.profiles[0].data.entries.filter(item=>item.recurringGroupId && item.id==='${firstId}' || item.title==='Parcelas atualizadas'); })()`);
  if (series.length !== 3 || !series.every(item => item.amount === 777 && item.title === 'Parcelas atualizadas')) throw new Error('A edição não foi aplicada a todas as parcelas.');
  if (series.map(item => item.date).join('|') !== '10/09/2026|10/10/2026|10/11/2026') throw new Error('As datas das parcelas não foram preservadas.');
  await value(win, `
    document.querySelector('[data-action="edit-entry"][data-id="${firstId}"]').click();
    document.querySelector('#amount').value='888';
    document.querySelector('#modal-form').requestSubmit();
    document.querySelector('#edit-current-only').click();
  `);
  series = await value(win, `(() => { const s=JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1')); return s.profiles[0].data.entries.filter(item=>item.title==='Parcelas atualizadas'); })()`);
  if (series.filter(item => item.amount === 888).length !== 1 || series.filter(item => item.amount === 777).length !== 2) throw new Error('A opção Não alterou outras parcelas.');
  console.log('Edição individual e edição de todas as parcelas validadas.');
  win.destroy();
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
