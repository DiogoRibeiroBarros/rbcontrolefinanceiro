const { app, BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const temp = path.join(root, 'tmp', 'banking-ui-smoke');
if (!temp.startsWith(root + path.sep)) throw new Error('Diretorio temporario fora do projeto.');
app.setPath('userData', path.join(temp, 'user-data'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function click(win, selector, label) {
  const ok = await win.webContents.executeJavaScript(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) return false; el.click(); return true; })()`);
  if (!ok) throw new Error(`${label} nao encontrado: ${selector}`);
}

async function setValue(win, selector, value) {
  const ok = await win.webContents.executeJavaScript(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) return false; el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
  if (!ok) throw new Error(`Campo nao encontrado: ${selector}`);
}

async function submitModal(win) {
  await win.webContents.executeJavaScript(`document.querySelector('#modal-form').requestSubmit();`);
  await wait(160);
}

async function assertText(win, text, label) {
  const ok = await win.webContents.executeJavaScript(`document.body.textContent.replace(/\\u00a0/g,' ').includes(${JSON.stringify(text)})`);
  if (!ok) {
    const snippet = await win.webContents.executeJavaScript(`document.body.textContent.replace(/\\s+/g,' ').slice(0,900)`);
    const state = await win.webContents.executeJavaScript(`(() => { const s=JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1')); return JSON.stringify({accounts:s.sharedData.bankAccounts,transactions:s.sharedData.bankTransactions}); })()`);
    throw new Error(`${label}\nTela: ${snippet}\nEstado: ${state}`);
  }
}

app.whenReady().then(async () => {
  await fs.rm(temp, { recursive:true, force:true });
  await fs.mkdir(temp, { recursive:true });
  const win = new BrowserWindow({ width:1360, height:900, show:false, webPreferences:{ contextIsolation:true } });
  await win.loadFile(path.join(root, 'app', 'index.html'));
  await wait(250);
  await win.webContents.executeJavaScript(`const profileButton=document.querySelector('[data-action="switch-profile"]'); if(profileButton) profileButton.click();`);
  await wait(120);

  const institutionMenuPosition = await win.webContents.executeJavaScript(`(() => {
    const ids=Array.from(document.querySelectorAll('#nav [data-screen]')).map(item=>item.getAttribute('data-screen'));
    return ids.indexOf('institutions') === ids.indexOf('categories') + 1;
  })()`);
  if (!institutionMenuPosition) throw new Error('A aba Instituicoes nao ficou logo abaixo de Categorias.');
  await click(win, '[data-screen="institutions"]', 'Menu Instituicoes');
  await click(win, '[data-action="new-institution"]', 'Nova instituicao');
  await setValue(win, '#name', 'Banco Teste Manual');
  await setValue(win, '#shortName', 'Teste Manual');
  await setValue(win, '#bankCode', '999');
  await setValue(win, '#color', '#123456');
  const manualIconSelected = await win.webContents.executeJavaScript(`(() => {
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="12" fill="#123456"/><text x="32" y="40" fill="white" text-anchor="middle" font-size="24">TM</text></svg>';
    const file=new File([svg],'banco-teste.svg',{type:'image/svg+xml'});
    const transfer=new DataTransfer(); transfer.items.add(file);
    const input=document.querySelector('#institutionIconFile'); if(!input)return false;
    input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true})); return true;
  })()`);
  if (!manualIconSelected) throw new Error('Campo de icone manual nao foi encontrado.');
  await wait(180);
  await submitModal(win);
  await assertText(win, 'Banco Teste Manual', 'Instituicao manual nao apareceu na aba propria.');
  const manualInstitutionOk = await win.webContents.executeJavaScript(`(() => {
    const store=JSON.parse(localStorage.getItem('rb_gestao_financeira_profiles_v1'));
    const item=store.sharedData.financialInstitutions.find(value=>value.name==='Banco Teste Manual');
    const image=Array.from(document.querySelectorAll('.institution-row img')).find(img=>img.alt==='Teste Manual');
    return Boolean(item && item.color==='#123456' && String(item.icon||'').startsWith('data:image/svg+xml;base64,') && image && image.complete && image.naturalWidth>0);
  })()`);
  if (!manualInstitutionOk) throw new Error('Cor, persistencia ou exibicao do icone manual falhou.');

  await click(win, '[data-screen="accounts"]', 'Menu Contas');
  await click(win, '[data-action="new-bank-account"]', 'Nova conta');
  await setValue(win, '#financialInstitutionId', 'bank-nubank');
  await setValue(win, '#name', 'Nubank principal');
  await setValue(win, '#initialBalance', '1000,00');
  await setValue(win, '#overdraftLimit', '500,00');
  await submitModal(win);

  await click(win, '[data-action="new-bank-account"]', 'Nova conta');
  await setValue(win, '#financialInstitutionId', 'bank-inter');
  await setValue(win, '#name', 'Inter reserva');
  await setValue(win, '#initialBalance', '500,00');
  await submitModal(win);

  await click(win, '[data-action="new-bank-transfer"]', 'Transferencia');
  await setValue(win, '#amount', '250,00');
  await submitModal(win);
  await assertText(win, 'R$ 1.500,00', 'Transferencia alterou o patrimonio total.');

  await click(win, '[data-action="new-bank-transaction"]', 'Movimentacao bancaria');
  await setValue(win, '#type', 'Receita');
  await setValue(win, '#description', 'PIX teste');
  await setValue(win, '#amount', '100,00');
  await submitModal(win);
  await assertText(win, 'R$ 1.600,00', 'Receita bancaria nao atualizou o saldo.');

  await click(win, '[data-screen="cards"]', 'Menu Cartoes');
  await click(win, '[data-action="new-card"]', 'Novo cartao');
  await setValue(win, '#name', 'Nubank Ultravioleta');
  await setValue(win, '#financialInstitutionId', 'bank-nubank');
  await win.webContents.executeJavaScript(`const account=document.querySelector('#bankAccountId'); account.selectedIndex=1; account.dispatchEvent(new Event('change',{bubbles:true}));`);
  await setValue(win, '#lastDigits', '1234');
  await setValue(win, '#limit', '2000,00');
  await setValue(win, '#closingDay', '20');
  await setValue(win, '#dueDay', '10');
  await submitModal(win);
  await assertText(win, 'Nubank Ultravioleta', 'Nome completo do cartao nao apareceu na frente do cartao.');
  await assertText(win, 'melhor compra dia 21', 'Melhor dia de compra nao apareceu no cartao.');
  await wait(200);
  const iconsLoaded = await win.webContents.executeJavaScript(`(() => {
    const bank=document.querySelector('.card-bank-symbol img');
    const brand=document.querySelector('.card-brand-icon img');
    return Boolean(bank && bank.complete && bank.naturalWidth > 0 && brand && brand.complete && brand.naturalWidth > 0 && !document.querySelector('.card-visual .icon-missing'));
  })()`);
  if (!iconsLoaded) throw new Error('SVGs de banco ou bandeira nao carregaram no cartao.');

  await click(win, '[data-action="new-card-transaction"]', 'Nova compra no cartao');
  await setValue(win, '#title', 'Compra teste');
  await setValue(win, '#amount', '120,00');
  await submitModal(win);
  await click(win, '[data-action="pay-invoice"]', 'Pagar fatura');
  await setValue(win, '#paidAmount', '120,00');
  await submitModal(win);
  await click(win, '[data-screen="accounts"]', 'Menu Contas');
  await assertText(win, 'R$ 1.480,00', 'Pagamento da fatura nao debitou a conta vinculada.');

  await click(win, '[data-action="new-bank-transaction"]', 'Nova movimentacao para validar data');
  const currentDateSuggested = await win.webContents.executeJavaScript(`(() => { const now=new Date(),pad=n=>String(n).padStart(2,'0'); return document.querySelector('#transactionDate').value===now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate()); })()`);
  if (!currentDateSuggested) throw new Error('A nova movimentacao nao sugeriu a data atual.');
  await click(win, '[data-action="close-modal"]', 'Fechar movimentacao');

  const accountToDisable = await win.webContents.executeJavaScript(`document.querySelector('[data-action="inactivate-account"]').getAttribute('data-id')`);
  await click(win, `[data-action="inactivate-account"][data-id="${accountToDisable}"]`, 'Inativar conta');
  await click(win, '#confirm-yes', 'Confirmar inativacao da conta');
  await click(win, '[data-action="open-inactive-accounts"]', 'Consultar contas inativas');
  await assertText(win, 'Contas inativas', 'Area de contas inativas nao abriu.');
  await click(win, `[data-action="reactivate-account"][data-id="${accountToDisable}"]`, 'Reativar conta');

  await click(win, '[data-screen="cards"]', 'Menu Cartoes');
  const cardToDisable = await win.webContents.executeJavaScript(`document.querySelector('[data-action="inactivate-card"]').getAttribute('data-id')`);
  await click(win, `[data-action="inactivate-card"][data-id="${cardToDisable}"]`, 'Inativar cartao');
  await click(win, '#confirm-yes', 'Confirmar inativacao do cartao');
  await click(win, '[data-action="open-inactive-cards"]', 'Consultar cartoes inativos');
  await assertText(win, 'Cartões inativos', 'Area de cartoes inativos nao abriu.');
  await click(win, `[data-action="reactivate-card"][data-id="${cardToDisable}"]`, 'Reativar cartao');

  win.destroy();
  await fs.rm(temp, { recursive:true, force:true });
  console.log('Fluxo bancario visual validado.');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
