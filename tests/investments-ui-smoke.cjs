const { app, BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const temp = path.join(root, 'tmp', 'investments-ui-smoke');
if (!temp.startsWith(root + path.sep)) throw new Error('Diretório temporário fora do projeto.');
app.setPath('userData', path.join(temp, 'user-data'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const run = async (win, label, script) => {
  try { return await win.webContents.executeJavaScript(script); }
  catch (error) { throw new Error(`${label}: ${error.message}`); }
};

app.whenReady().then(async () => {
  await fs.rm(temp, { recursive:true, force:true });
  const win = new BrowserWindow({ width:1440, height:1000, show:false, webPreferences:{ contextIsolation:true } });
  await win.loadFile(path.join(root, 'app', 'index.html'));
  await wait(250);
  await run(win, 'login', `document.querySelector('#profile-login-form').requestSubmit()`);
  await wait(150);
  await run(win, 'conta', `document.querySelector('[data-screen="accounts"]').click(); document.querySelector('[data-action="new-bank-account"]').click(); document.querySelector('#name').value='Conta Principal'; document.querySelector('#initialBalance').value='10000'; document.querySelector('#modal-form').requestSubmit();`);
  await wait(250);
  await run(win, 'caixinha', `document.querySelector('[data-action="new-saving-box"]').click(); document.querySelector('#name').value='Reserva de emergência'; document.querySelector('#initialBalance').value='3000'; document.querySelector('#target').value='5000'; document.querySelector('#modal-form').requestSubmit();`);
  await wait(250);
  await run(win, 'investimento', `document.querySelector('[data-screen="investments"]').click(); document.querySelector('[data-action="new-investment"]').click(); document.querySelector('#name').value='CDB Teste'; document.querySelector('#investedValue').value='5000'; document.querySelector('#currentValue').value='5500'; document.querySelector('#modal-form').requestSubmit();`);
  await wait(350);
  const investmentId = await run(win, 'ler investimento', `JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1')).sharedData.investments[0].id`);
  await run(win, 'dividendo', `document.querySelector('[data-action="new-investment-movement"][data-id="${investmentId}"]').click(); document.querySelector('#type').value='Dividendo'; document.querySelector('#amount').value='100'; document.querySelector('#modal-form').requestSubmit();`);
  await wait(350);
  const result = await run(win, 'validar dados', `(() => { try { const data=JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1')).sharedData; const account=data.bankAccounts[0]||null; const box=data.savingsBoxes[0]||null; const balance=account?account.initialBalanceCents+data.bankTransactions.filter(item=>item.bankAccountId===account.id).reduce((sum,item)=>sum+(item.direction==='credit'?1:-1)*item.amountCents,0):null; const reserved=box?box.initialBalanceCents:null; return {accounts:data.bankAccounts.length,boxes:data.savingsBoxes.length,investments:data.investments.length,movements:data.investmentMovements.length,income:data.entries.filter(item=>item.category==='Receita de Investimentos').reduce((sum,item)=>sum+item.amount,0),balance,reserved,available:balance!=null&&reserved!=null?balance-reserved:null,screen:document.querySelector('#screen-title').textContent,hasDistribution:!!document.querySelector('.investment-distribution'),body:document.body.innerText.slice(-500)}; } catch(error) { return {scriptError:String(error&&error.stack||error),url:location.href,body:document.body.innerText.slice(-500)}; } })()`);
  if (result.scriptError) throw new Error(result.scriptError);
  if (result.accounts !== 1 || result.boxes !== 1) throw new Error(`Conta ou caixinha não foi salva: ${JSON.stringify(result)}`);
  if (result.investments !== 1 || result.movements !== 2) throw new Error('Cadastro ou histórico do investimento não foi preservado.');
  if (result.income !== 100) throw new Error('Somente o dividendo realizado deveria ter virado receita.');
  if (result.balance !== 510000 || result.reserved !== 300000 || result.available !== 210000) throw new Error('Saldo, reserva e disponível foram calculados incorretamente.');
  if (result.screen !== 'Investimentos' || !result.hasDistribution) throw new Error('A tela de investimentos não foi renderizada corretamente.');
  await fs.writeFile(path.join(temp, 'investments-desktop.png'), (await win.webContents.capturePage()).toPNG());
  await run(win, 'abrir contas', `document.querySelector('[data-screen="accounts"]').click()`);
  await wait(200);
  await fs.writeFile(path.join(temp, 'accounts-with-savings.png'), (await win.webContents.capturePage()).toPNG());
  await run(win, 'voltar aos investimentos', `document.querySelector('[data-screen="investments"]').click()`);
  await wait(200);
  await win.setSize(430, 900);
  await wait(500);
  const viewport = await run(win, 'validar viewport mobile', `(() => { const content=document.querySelector('#content').getBoundingClientRect(), card=document.querySelector('.metric-card').getBoundingClientRect(); return {width:innerWidth,height:innerHeight,columns:getComputedStyle(document.querySelector('#app-shell')).gridTemplateColumns,contentLeft:content.left,contentWidth:content.width,cardLeft:card.left,cardRight:card.right}; })()`);
  if (viewport.width > 760 || !String(viewport.columns).startsWith('0px') || viewport.cardLeft > 100 || viewport.cardRight > viewport.width + 1) throw new Error(`Layout mobile não foi ativado: ${JSON.stringify(viewport)}`);
  await fs.writeFile(path.join(temp, 'investments-mobile.png'), (await win.webContents.capturePage()).toPNG());
  await run(win, 'abrir relatório', `document.querySelector('[data-action="open-module-report"][data-report-module="investments"]').click()`);
  await wait(200);
  if (!await run(win, 'validar relatório', `Boolean(document.querySelector('#module-report-sheet'))`)) throw new Error('Relatório de investimentos não abriu.');
  await fs.writeFile(path.join(temp, 'SUCCESS.txt'), 'Caixinha, investimento, dividendo, patrimônio, layout e relatório validados.', 'utf8');
  win.destroy();
  console.log('Caixinhas e investimentos: fluxo, cálculos, relatório e layout responsivo validados.');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
