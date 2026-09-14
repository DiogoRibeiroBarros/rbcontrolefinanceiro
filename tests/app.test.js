const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Core = require('../app/app.js');

assert.strictEqual(Core.parseMoney('1.234,56'), 1234.56);
assert.strictEqual(Core.parseMoney('R$ 89,90'), 89.90);
assert.strictEqual(Core.monthFromBR('15/07/2026'), '2026-07');
assert.strictEqual(Core.addMonthsKey('2026-12', 1), '2027-01');

const commercialEmptyStore = Core.createProfileStoreFromLegacy(null);
assert.strictEqual(commercialEmptyStore.profiles.length, 1);
['entries','cards','cardTransactions','invoicePayments','loans','subscriptions','salaryRecords','householdMembers','householdBills'].forEach((field) => {
  assert.deepStrictEqual(commercialEmptyStore.sharedData[field] || [], []);
});

const migratedProfiles = Core.createProfileStoreFromLegacy({entries:[{id:'legacy',title:'Dado antigo',amount:10,type:'Receita',category:'Vendas',date:'01/07/2026',status:'Pago'}]});
assert.strictEqual(migratedProfiles.profiles.length, 1);
assert.strictEqual(migratedProfiles.profiles[0].name, 'Perfil Principal');
assert.strictEqual(migratedProfiles.profiles[0].data.entries[0].id, 'legacy');
assert.strictEqual(migratedProfiles.sharedData.entries[0].id, 'legacy');
const sharedProfiles = Core.normalizeProfileStore({activeProfileId:'p1',profiles:[
  {id:'p1',name:'Rafael',data:{entries:[{id:'only-p1',title:'Perfil 1',amount:20,type:'Receita',category:'Vendas',date:'01/07/2026',status:'Pago'}]}},
  {id:'p2',name:'Maria',data:{entries:[{id:'only-p2',title:'Perfil 2',amount:30,type:'Receita',category:'Vendas',date:'02/07/2026',status:'Pago'}]}}
]});
assert.strictEqual(sharedProfiles.sharedData.entries.length, 2);
assert.strictEqual(Core.dashboard(sharedProfiles.sharedData, '2026-07').expectedIncome, 50);
const photoStore = Core.normalizeProfileStore({activeProfileId:'photo-profile',profiles:[{id:'photo-profile',name:'Foto',photo:'data:image/jpeg;base64,QUJD',data:Core.defaultState()}]});
assert.strictEqual(photoStore.profiles[0].photo,'data:image/jpeg;base64,QUJD');
const invalidPhotoStore = Core.normalizeProfileStore({activeProfileId:'invalid-photo',profiles:[{id:'invalid-photo',name:'Sem foto',photo:'javascript:alert(1)',data:Core.defaultState()}]});
assert.strictEqual(invalidPhotoStore.profiles[0].photo,'');
const protectedStore = Core.normalizeProfileStore({activeProfileId:'protected',profiles:[{id:'protected',name:'Protegido',passwordHash:'abc123',data:Core.defaultState()}]});
assert.strictEqual(protectedStore.profiles[0].passwordHash,'abc123');
assert.strictEqual(protectedStore.profiles[0].role,'administrator');
assert.strictEqual(protectedStore.profiles[0].permissions.cards.view,true);
const restrictedStore = Core.normalizeProfileStore({activeProfileId:'user',profiles:[{id:'admin',name:'Admin',data:Core.defaultState()},{id:'user',name:'Usuário',permissions:{cards:{view:false,create:false,edit:false}},data:Core.defaultState()}]});
assert.strictEqual(restrictedStore.profiles[1].role,'user');
assert.deepStrictEqual(restrictedStore.profiles[1].permissions.cards,{view:false,create:false,edit:false});

const state = Core.defaultState();
assert.deepStrictEqual(state.homeExpenses, { residents: [], bills: [], residentDebts: [], currentResidentId: '' });
const categoryColorValues = Object.values(state.categoryColors).flatMap((group) => Object.values(group));
const categoryCount = Object.values(state.categories).reduce((total, group) => total + group.length, 0);
assert.strictEqual(categoryColorValues.length, categoryCount);
assert.strictEqual(new Set(categoryColorValues).size, categoryColorValues.length);
assert.ok(categoryColorValues.every((color) => /^#[0-9A-F]{6}$/.test(color)));
state.entries.push({id:'1', title:'Venda', amount:1000, type:'Receita', category:'Vendas', date:'10/07/2026', status:'Pago', notes:''});
state.entries.push({id:'2', title:'Mercado', amount:250, type:'Despesa', category:'Mercado', date:'12/07/2026', status:'Previsto', notes:''});
state.cards.push({id:'card1', name:'Nubank', firstDigits:'', lastDigits:'1234', limit:2000, closingDay:20, dueDay:10, colorName:'Roxo', brandName:'Mastercard'});
state.cardTransactions.push({id:'ct1', cardId:'card1', title:'Notebook', amount:1200, category:'Compras', date:'01/07/2026', billingMonthOffset:0, installments:3, recurrenceMonths:0, consumeTotalLimit:false, notes:''});
state.salaryRecords.push({month:'2026-07', grossSalary:3000, notes:'', items:[{id:'s1', name:'INSS', type:'Desconto', valueMode:'Percentual', value:10, fixedMonthly:true, notes:''}]});

const dash = Core.dashboard(state, '2026-07');
assert.strictEqual(dash.expectedIncome, 1000);
assert.strictEqual(dash.expectedExpense, 250);
assert.strictEqual(dash.openInvoice, 0);
assert.strictEqual(dash.salaryNet, 2700);
assert.strictEqual(dash.totalIncome, 3700);
assert.strictEqual(dash.expectedBalance, 3450);

state.loans.push({id:'loan-month',name:'Parcela mensal',direction:'Peguei emprestado',principalAmount:600,installmentAmount:200,installments:3,firstDueDate:'10/07/2026',payments:[]});
state.subscriptions.push({id:'sub-month',name:'Internet',kind:'Serviço',amount:90,billingCycle:'Mensal',dueDay:15,startDate:'15/07/2026',active:true});
const integratedDash = Core.dashboard(state, '2026-07');
assert.strictEqual(integratedDash.expectedExpense, 540);
assert.strictEqual(integratedDash.expectedBalance, 3160);
assert.strictEqual(integratedDash.openInvoice, 0);
const movements = Core.monthlyMovements(state, '2026-07');
assert.ok(movements.some((item) => item.module === 'Salário'));
assert.ok(movements.some((item) => item.module === 'Empréstimos'));
assert.ok(movements.some((item) => item.module.indexOf('Assinaturas') === 0));

const migratedHome = Core.normalizeState({ homeExpenses:{ residents:[{id:'r1',name:'Ana'}], bills:[{id:'b1',amount:100}], currentResidentId:'r1' } });
assert.strictEqual(migratedHome.homeExpenses.residents.length, 1);
assert.strictEqual(migratedHome.homeExpenses.bills.length, 1);
assert.strictEqual(migratedHome.homeExpenses.currentResidentId, 'r1');

state.salaryRecords[0].items.push({id:'clt1', name:'Empréstimo 3722', type:'Empréstimo CLT', valueMode:'Valor', value:200, fixedMonthly:true, startMonth:'2026-07', endMonth:'2026-08', notes:''});
assert.strictEqual(Core.dashboard(state, '2026-07').salaryNet, 2500);
assert.strictEqual(Core.dashboard(state, '2026-08').salaryNet, 2500);
assert.strictEqual(Core.dashboard(state, '2026-09').salaryNet, 2700);

assert.strictEqual(Core.cardTransactionIsBilledIn(state.cardTransactions[0], '2026-07'), true);
assert.strictEqual(Core.cardTransactionIsBilledIn(state.cardTransactions[0], '2026-10'), false);
assert.strictEqual(Core.cardBilledAmount(state.cardTransactions[0]), 400);
state.invoicePayments.push({id:'pay1', cardId:'card1', month:'2026-07', paidAmount:100, paidDate:'15/07/2026'});
const cardSummary = Core.cardSummary(state, '2026-07');
assert.deepStrictEqual(cardSummary, {
  cardCount: 1,
  purchaseCount: 1,
  purchaseTotal: 400,
  totalLimit: 2000,
  committedLimit: 400,
  availableLimit: 1600,
  invoiceTotal: 400,
  paidTotal: 100,
  openTotal: 300
});

const schedule = Core.loanSchedule({firstDueDate:'10/07/2026', installments:3, installmentAmount:100, payments:[{number:2, paidDate:'11/08/2026'}]});
assert.strictEqual(schedule.length, 3);
assert.strictEqual(schedule[1].paid, true);
assert.strictEqual(schedule[2].dueDate, '10/09/2026');

const partialSchedule = Core.loanSchedule({firstDueDate:'10/07/2026', installments:2, installmentAmount:100, payments:[{number:1, amount:40, paidDate:'05/07/2026'}]});
assert.strictEqual(partialSchedule[0].paidAmount, 40);
assert.strictEqual(partialSchedule[0].remainingAmount, 60);
assert.strictEqual(partialSchedule[0].paid, false);
const completedPartialSchedule = Core.loanSchedule({firstDueDate:'10/07/2026', installments:2, installmentAmount:100, payments:[{number:1, amount:40, paidDate:'05/07/2026'},{number:1, amount:60, paidDate:'08/07/2026'}]});
assert.strictEqual(completedPartialSchedule[0].paid, true);

assert.deepStrictEqual(Core.calculateLoanValues('total', 1000, 4, false), {calculationMode:'total',principalAmount:1000,installmentAmount:250,installments:4});
assert.deepStrictEqual(Core.calculateLoanValues('installment', 250, 4, false), {calculationMode:'installment',principalAmount:1000,installmentAmount:250,installments:4});
assert.deepStrictEqual(Core.calculateLoanValues('total', 100, 12, true), {calculationMode:'total',principalAmount:100,installmentAmount:100,installments:1});
assert.deepStrictEqual(Core.calculateLoanValues('installment', 25, 12, true), {calculationMode:'installment',principalAmount:25,installmentAmount:25,installments:12});
assert.deepStrictEqual(Core.calculateLoanValues('balance', 300, 12, true), {calculationMode:'balance',principalAmount:300,installmentAmount:0,installments:0});
const balanceOnlyLoan = {id:'balance-only',calculationMode:'balance',principalAmount:300,installmentAmount:0,installments:0,openEnded:true,createdDate:'25/08/2026',firstDueDate:'25/08/2026',payments:[{id:'bp1',number:0,amount:75,paidDate:'25/08/2026'}],adjustments:[]};
assert.deepStrictEqual(Core.loanSchedule(balanceOnlyLoan), []);
assert.strictEqual(Core.loanTotalDebt(balanceOnlyLoan), 300);
assert.strictEqual(Core.loanTotalPaid(balanceOnlyLoan), 75);
assert.strictEqual(Core.loanReportRemaining(balanceOnlyLoan), 225);
const balanceState = Core.defaultState();
balanceState.loans.push(balanceOnlyLoan);
assert.ok(!Core.monthlyMovements(balanceState, '2026-08').some((item) => item.id.startsWith('balance-only-')));
const openTotalState = Core.defaultState();
openTotalState.loans.push({id:'open-total',name:'Cobrança única',direction:'Peguei emprestado',calculationMode:'total',principalAmount:300,installmentAmount:300,installments:1,openEnded:true,firstDueDate:'25/08/2026',payments:[]});
assert.strictEqual(Core.loanSchedule(openTotalState.loans[0]).length, 1);
assert.ok(Core.monthlyMovements(openTotalState, '2026-08').some((item) => item.id === 'open-total-1'));
assert.ok(!Core.monthlyMovements(openTotalState, '2026-09').some((item) => item.id.startsWith('open-total-')));
const roundedTotalSchedule = Core.loanSchedule({calculationMode:'total',principalAmount:100,firstDueDate:'10/07/2026',installments:3,installmentAmount:33.33,payments:[]});
assert.deepStrictEqual(roundedTotalSchedule.map((item) => item.amount), [33.33,33.33,33.34]);
const deletableLoan = {id:'delete-installments',calculationMode:'installment',principalAmount:400,firstDueDate:'10/07/2026',installments:4,installmentAmount:100,payments:[{id:'d1',number:2,amount:20,paidDate:'01/08/2026'},{id:'d2',number:4,amount:30,paidDate:'01/10/2026'}]};
assert.strictEqual(Core.applyLoanInstallmentDeletion(deletableLoan,[2,4]),2);
assert.deepStrictEqual(Core.loanSchedule(deletableLoan).map((item) => item.number),[1,3]);
assert.deepStrictEqual(deletableLoan.payments,[]);
assert.strictEqual(Core.loanTotalDebt(deletableLoan),200);

const reportLoan = {id:'report-loan',name:'Igor',direction:'Emprestei para alguém',principalAmount:210,installmentAmount:210,installments:1,createdDate:'01/07/2026',firstDueDate:'10/07/2026',adjustments:[{id:'add1',amount:150,date:'11/08/2026',notes:'Novo valor'}],payments:[{id:'rp1',number:1,amount:50,paidDate:'12/08/2026'}]};
assert.strictEqual(Core.loanTotalDebt(reportLoan), 360);
assert.strictEqual(Core.loanTotalPaid(reportLoan), 50);
assert.strictEqual(Core.loanReportRemaining(reportLoan), 310);
assert.strictEqual(Core.loanPortfolioStats([reportLoan]).recoveredPercent, 13.9);
assert.deepStrictEqual(Core.loanMovementHistory(reportLoan).map((item) => item.type), ['Pagamento','Aumento','Dívida inicial']);
assert.strictEqual(Core.loanEvolutionPoints([reportLoan]).length, 2);

const openEndedState = Core.defaultState();
openEndedState.loans.push({id:'continuous',name:'Sem limite',direction:'Peguei emprestado',principalAmount:100,installmentAmount:25,installments:1,openEnded:true,firstDueDate:'10/07/2026',payments:[]});
assert.ok(Core.monthlyMovements(openEndedState, '2027-12').some((item) => item.id === 'continuous-18'));

const cltInstallmentsState = Core.defaultState();
cltInstallmentsState.salaryRecords.push({month:'2026-07',grossSalary:1000,notes:'',items:[{id:'clt-count',name:'CLT por parcelas',type:'Empréstimo CLT',valueMode:'Valor',value:100,fixedMonthly:true,startMonth:'2026-07',installmentCount:3,paidMonths:['2026-07'],notes:''}]});
assert.strictEqual(Core.dashboard(cltInstallmentsState, '2026-07').salaryNet, 900);
assert.strictEqual(Core.dashboard(cltInstallmentsState, '2026-09').salaryNet, 900);
assert.strictEqual(Core.dashboard(cltInstallmentsState, '2026-10').salaryNet, 1000);

const due = Core.nextSubscriptionDue({name:'App', amount:120, billingCycle:'Anual', dueDay:15, startDate:'15/07/2026'}, new Date(2026, 6, 16));
assert.strictEqual(due, '15/07/2027');
assert.strictEqual(Core.subscriptionMonthlyEquivalent({amount:120, billingCycle:'Anual'}), 10);

const recurring = Core.buildRecurringEntries({
  id:'r1',
  title:'Financiamento',
  amount:500,
  type:'Despesa',
  category:'Casa',
  date:'31/01/2026',
  status:'Previsto',
  notes:''
}, 3);
assert.strictEqual(recurring.length, 3);
assert.strictEqual(recurring[0].date, '31/01/2026');
assert.strictEqual(recurring[1].date, '28/02/2026');
assert.strictEqual(recurring[2].date, '31/03/2026');
assert.strictEqual(recurring[2].recurringIndex, 3);
assert.strictEqual(recurring[2].recurringTotal, 3);
assert.strictEqual(recurring[2].recurringFrequency, 'Mensal');
const editedRecurring = Object.assign({}, recurring[1], {title:'Financiamento atualizado',amount:625,status:'Pago',notes:'Reajuste'});
const currentOnly = Core.applyRecurringEntryEdit(recurring, recurring[1], editedRecurring, false);
assert.strictEqual(currentOnly[0].amount, 500);
assert.strictEqual(currentOnly[1].amount, 625);
assert.strictEqual(currentOnly[2].amount, 500);
const wholeSeries = Core.applyRecurringEntryEdit(recurring, recurring[1], editedRecurring, true);
assert.ok(wholeSeries.every((item) => item.amount === 625 && item.title === 'Financiamento atualizado' && item.status === 'Pago'));
assert.deepStrictEqual(wholeSeries.map((item) => item.date), ['31/01/2026','28/02/2026','31/03/2026']);
assert.deepStrictEqual(wholeSeries.map((item) => item.recurringIndex), [1,2,3]);

[
  'app/index.html',
  'app/styles.css',
  'app/app.js',
  'app/preload.cjs',
  'app/app.webmanifest',
  'app/assets/rb_gestao.ico',
  'app/assets/rb_gestao_app_icon.png',
  'Abrir RB Gestão Financeira.bat',
  'Criar atalho na área de trabalho.bat'
].forEach((file) => {
  assert.ok(fs.existsSync(path.join(__dirname, '..', file)), `Arquivo obrigatório ausente: ${file}`);
});

const html = fs.readFileSync(path.join(__dirname, '..', 'app/index.html'), 'utf8');
assert.ok(html.includes('app.webmanifest'));
assert.ok(html.includes('RB Gestão Financeira'));
assert.ok(html.includes('id="sidebar-toggle"'));
assert.ok(html.includes('remote-bridge.js'));
assert.ok(!html.includes('id="theme-toggle"'));
assert.ok(html.includes('class="sidebar-navigation"'));

const css = fs.readFileSync(path.join(__dirname, '..', 'app/styles.css'), 'utf8');
assert.ok(css.includes('.sidebar-collapsed'));
assert.ok(css.includes('::-webkit-scrollbar-thumb'));
['.sidebar-navigation {','overflow-y:auto','height:100dvh','@media (max-height: 760px)'].forEach((feature) => assert.ok(css.includes(feature), `menu lateral responsivo ausente: ${feature}`));
assert.ok(css.includes('scrollbar-color:'));
assert.ok(css.includes('color-scheme: dark'));
assert.ok(css.includes('.select option'));
assert.ok(css.includes('.loan-portfolio-summary'));
assert.ok(css.includes('.loan-report-sheet'));
assert.ok(css.includes('printing-loan-report'));
assert.ok(css.includes('.report-app-name'));
assert.ok(css.includes('body[data-theme="light"]'));
['--lime:#4B7600','--green:#087A36','--red:#C9363E','.metric-label { color:#526158; }'].forEach((feature) => assert.ok(css.includes(feature)));
assert.ok(css.includes('.report-theme-light'));
assert.ok(css.includes('printing-report-dark'));

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app/app.js'), 'utf8');
assert.ok(appSource.includes("APP_VERSION = '2.3.10'"));
assert.ok(appSource.includes('data-biometric-profile-id'));
['configureBiometricButton','Entrar com biometria','rbgestao://biometric','ReactNativeWebView','rbHandleBiometricResult'].forEach((feature) => assert.ok(appSource.includes(feature)));
['lastAutoBiometricProfileId',"type:'biometric-auth'","billingMonthOffset:1","t.billingMonthOffset == null ? 1 : t.billingMonthOffset"].forEach((feature) => assert.ok(appSource.includes(feature)));
['residentDebts','Nova dívida entre moradores','toggle-home-debt','Acertos entre moradores','sem duplicar despesas'].forEach((feature) => assert.ok(appSource.includes(feature), `acerto entre moradores ausente: ${feature}`));
['monthlyRecords','Histórico mensal','home-bill-history','Saldo final','Valor nesta competência'].forEach((feature) => assert.ok(appSource.includes(feature), `controle mensal das contas da casa ausente: ${feature}`));
['scheduleType','Programada','homeDebtVisibleInMonth'].forEach((feature) => assert.ok(appSource.includes(feature), `agenda de dívidas ausente: ${feature}`));
['Dinheiro guardado / Caixinhas','TRANSFERENCIA_CAIXINHA','APLICACAO_INVESTIMENTO','RESGATE_INVESTIMENTO','TRANSFERENCIA_INVESTIMENTO','Receita de Investimentos','Patrimônio líquido','Evolução do patrimônio','Rendimentos recebidos'].forEach((feature) => assert.ok(appSource.includes(feature), `módulo patrimonial ausente: ${feature}`));
assert.ok(!appSource.includes("open('GET', 'legacy-data.json'"));
const packageConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
assert.ok(packageConfig.build.files.includes('!app/legacy-data.json'));

const installerSource = fs.readFileSync(path.join(__dirname, '..', 'build', 'installer.nsh'), 'utf8');
const updateInstallerSource = fs.readFileSync(path.join(__dirname, '..', 'build', 'installer-update.nsh'), 'utf8');
const tailscaleSetupSource = fs.readFileSync(path.join(__dirname, '..', 'build', 'setup-tailscale.ps1'), 'utf8');
assert.ok(installerSource.includes('setup-tailscale.ps1'));
assert.ok(updateInstallerSource.includes('Atualizando o RB Gestão Financeira'));
assert.ok(!updateInstallerSource.includes('setup-tailscale.ps1'));
assert.ok(packageConfig.scripts['build:full'].includes('Full_'));
assert.ok(packageConfig.scripts['build:update'].includes('Atualizacao_'));
assert.ok(tailscaleSetupSource.includes('tailscale-setup-latest-$architecture.msi'));
assert.ok(tailscaleSetupSource.includes('TS_UNATTENDEDMODE=always'));
assert.ok(tailscaleSetupSource.includes('ProgramW6432'));
assert.ok(tailscaleSetupSource.includes('Wait-TailscaleExecutable 90'));
assert.ok(tailscaleSetupSource.includes('aplicativo móvel'));
assert.ok(tailscaleSetupSource.includes('Configuração concluída com sucesso'));
assert.ok(tailscaleSetupSource.includes('Complete-TailscaleLogin'));
assert.ok(tailscaleSetupSource.includes('RedirectStandardOutput'));
assert.ok(tailscaleSetupSource.includes('Write-SetupLog'));
assert.ok(tailscaleSetupSource.includes('15 minutos'));
assert.ok(!tailscaleSetupSource.includes("Start-Process -FilePath $tailscaleGui"));
assert.ok(tailscaleSetupSource.includes('funnel --bg $Port'));
assert.ok(tailscaleSetupSource.includes('Enable-RBFunnel'));
assert.ok(tailscaleSetupSource.includes('authorizationUrl'));
assert.ok(tailscaleSetupSource.includes('Start-Process explorer.exe -ArgumentList $authorizationUrl'));
assert.ok(tailscaleSetupSource.includes('Set-Clipboard -Value $authorizationUrl'));
assert.ok(tailscaleSetupSource.includes('mobile-sync.json'));
assert.ok(tailscaleSetupSource.includes('Acesso RB Gestão.txt'));
assert.ok(tailscaleSetupSource.includes('/mobile?key='));
assert.ok(appSource.includes('SIDEBAR_STORE_KEY'));
assert.ok(appSource.includes("action === 'toggle-sidebar'"));
['THEME_STORE_KEY',"action === 'toggle-theme'",'O relatório acompanha o tema atual do aplicativo.','print-loan-report'].forEach((feature) => assert.ok(appSource.includes(feature)));
['dashboard-category-filter','entries-category-filter','cards-purchase-category-filter','categories-module-filter'].forEach((id) => assert.ok(appSource.includes(id)));
['installmentCount','salary-loan-details','paymentAmount','Sem data limite'].forEach((feature) => assert.ok(appSource.includes(feature)));
['open-loan-report','increase-loan','loanMovementHistory','Imprimir / Salvar PDF'].forEach((feature) => assert.ok(appSource.includes(feature)));
['openModuleReport','moduleReportHtml','open-module-report','Relatório completo'].forEach((feature) => assert.ok(appSource.includes(feature)));
['homeExpenses','renderHomeExpenses','openHomeResidentForm','openHomeBillForm','toggle-home-payment'].forEach((feature) => assert.ok(appSource.includes(feature)));
['report-brand-identity','report-app-name','RB Gestão Financeira','rb_gestao_app_icon.png'].forEach((feature) => assert.ok(appSource.includes(feature)));
['Transações da parcela','Baixa parcial','delete-loan-payment','data-payment-index'].forEach((feature) => assert.ok(appSource.includes(feature)));
['askRecurringEntryEdit','applyRecurringEntryEdit','Não, somente esta','Sim, todas','outras parcelas'].forEach((feature) => assert.ok(appSource.includes(feature)));
['calculationMode','loan-mode-picker','Valor total do empréstimo','Valor de cada parcela','Somente montante','Baixar montante','pay-loan-balance'].forEach((feature) => assert.ok(appSource.includes(feature)));
['toggle-all-loan-installments','delete-selected-loan-installments','delete-last-loan-installment','delete-all-loan-installments'].forEach((feature) => assert.ok(appSource.includes(feature)));
['categoryColors','edit-category-color','category-color-input','Esta cor já está sendo usada'].forEach((feature) => assert.ok(appSource.includes(feature)));
['institutions',"title: 'Instituições'",'institutionIconFile','Ícone pronto para salvar','institutionIconSource'].forEach((feature) => assert.ok(appSource.includes(feature)));
['resizeProfilePhoto','profilePhoto','profile-avatar-photo','Foto pronta para salvar'].forEach((feature) => assert.ok(appSource.includes(feature)));
['hashProfilePassword','requestProfileUnlock','profilePasswordConfirm','removeProfilePassword','lockActiveProfileOnStart','deleteProtectedProfile'].forEach((feature) => assert.ok(appSource.includes(feature)));
['mobile-sidebar-open','setMobileSidebar(false)','10000'].forEach((feature) => assert.ok(appSource.includes(feature)));
['defaultProfilePermissions','normalizeProfilePermissions','hasModulePermission','renderProfilePermissionsSettings','saveProfilePermissions','applyPermissionControls','permissions-profile-select'].forEach((feature) => assert.ok(appSource.includes(feature)));
['profileSelectionRequired','openLoginScreen','LOGIN_SESSION_KEY','inputmode="numeric"','Todos usam os mesmos dados.','profileStore.sharedData','mergeProfileFinancialData','Perfis de acesso'].forEach((feature) => assert.ok(appSource.includes(feature)));
['login-profile-cards','data-login-profile-id','renderAccountsManaged','renderCardsManaged','open-inactive-accounts','reactivate-card'].forEach((feature) => assert.ok(appSource.includes(feature)));
assert.ok(appSource.includes('if (!profileRaw) saveProfileStore();'));
assert.ok(css.includes('.profile-login-screen'));
assert.ok(css.includes('.profile-pin-input'));
['permission-view-other-profiles','data-shared-profile-id','renderSharedProfileModules','Todos os dados deste módulo foram compartilhados com você.'].forEach((feature) => assert.ok(!appSource.includes(feature)));
['renderRemoteAccessSettings','saveRemoteAccessSettings','copyRemoteAccessLink','remote-public-url','remote-access-link'].forEach((feature) => assert.ok(appSource.includes(feature)));
assert.ok(css.includes('.loan-installment-transaction'));
assert.ok(css.includes('.loan-mode-option.active'));
assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
assert.ok(css.includes('.loan-balance-only'));
assert.ok(css.includes('.loan-installment-check'));
assert.ok(css.includes('.category-color-swatch'));
assert.ok(css.includes('.category-inline'));
assert.ok(css.includes('.profile-photo-editor'));
assert.ok(css.includes('.profile-avatar-photo img'));
assert.ok(css.includes('#app-shell.mobile-sidebar-open .sidebar'));
assert.ok(css.includes('.profile-lock-modal'));
assert.ok(css.includes('grid-template-columns: 0 minmax(0, 1fr) !important'));
assert.ok(css.includes('padding: 18px 16px 18px 82px'));
assert.ok(css.includes('height: 64px'));
assert.ok(css.includes('grid-column: 2'));
assert.ok(css.includes('.permissions-grid'));
assert.ok(css.includes('.permission-module-card'));
['.permission-sharing-card','.shared-profile-options','.shared-profile-module'].forEach((feature) => assert.ok(!css.includes(feature)));
assert.ok(css.includes('.remote-access-fields'));
assert.ok(css.includes('.subscription-metrics .metric-card { min-width: 0; min-height: 92px; padding: 12px 10px;'));
assert.ok(css.includes('.subscription-metrics .metric-label { font-size: 9px;'));
assert.ok(css.includes('white-space: nowrap; overflow-wrap: normal;'));
['🏠','🧾','💳','💵','🏦','🔄','🏷️','⚙️','❓'].forEach((icon) => assert.ok(appSource.includes(icon)));
['APP_SETTINGS_STORE_KEY','renderSettings','settings-backup-mode','settings-backup-time','settings-backup-retention','choose-backup-folder','run-auto-backup'].forEach((feature) => assert.ok(appSource.includes(feature)));
const electronMain = fs.readFileSync(path.join(__dirname, '..', 'electron-main.cjs'), 'utf8');
['backup:run-now','backup:choose-folder','backup:configure','createAutomaticBackup','daily-and-close','fechamento','preload.cjs'].forEach((feature) => assert.ok(electronMain.includes(feature)));
['new Tray','serviço ativo','segundo-plano','Encerrar completamente','showMainWindow','isQuitting'].forEach((feature) => assert.ok(electronMain.includes(feature)));
['/mobile','remote-bridge\\.js','/v1/profile-store','syncAuthorized','Set-Cookie'].forEach((feature) => assert.ok(electronMain.includes(feature)));
['sync:status','sync:configure','publicUrl','accessUrl'].forEach((feature) => assert.ok(electronMain.includes(feature)));
['image/svg+xml','assets\\/[-\\w./]+','5 * 1024 * 1024'].forEach((feature) => assert.ok(electronMain.includes(feature)));
const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'app/preload.cjs'), 'utf8');
['sync:status','sync:configure'].forEach((feature) => assert.ok(preloadSource.includes(feature)));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app/app.webmanifest'), 'utf8'));
assert.strictEqual(manifest.start_url, '/mobile');
assert.strictEqual(manifest.scope, '/');
const remoteBridge = fs.readFileSync(path.join(__dirname, '..', 'app/remote-bridge.js'), 'utf8');
['/v1/sync','/v1/profile-store','rb_gestao_financeira_profiles_v1','Storage.prototype.setItem'].forEach((feature) => assert.ok(remoteBridge.includes(feature)));
['syncQueue','Falha ao sincronizar os dados.'].forEach((feature) => assert.ok(remoteBridge.includes(feature)));
['pullLatestProfileStore','setInterval(pullLatestProfileStore,3000)','visibilitychange','lastSnapshotExportedAt'].forEach((feature) => assert.ok(remoteBridge.includes(feature)));
['preserveLocalActiveProfile','LOGIN_SESSION_KEY','result.activeProfileId=localId'].forEach((feature) => assert.ok(remoteBridge.includes(feature)));
['applyRemoteProfileStore','rb-profile-store-updated','CustomEvent'].forEach((feature) => assert.ok(remoteBridge.includes(feature)));
['imageAsDataUrl','readAsDataURL','copies[index].setAttribute'].forEach((feature) => assert.ok(remoteBridge.includes(feature)));
assert.ok(!remoteBridge.includes('location.reload()'));
['response.status === 409','Os dados foram alterados no desktop.'].forEach((feature) => assert.ok(!remoteBridge.includes(feature)));
['ReactNativeWebView','profile-store-changed','apply-profile-store','print-pdf'].forEach((feature) => assert.ok(remoteBridge.includes(feature)));
assert.ok(!electronMain.includes('payload.baseExportedAt'));
['desktopActiveId','sharedStore','profileStore:sharedStore'].forEach((feature) => assert.ok(electronMain.includes(feature)));
assert.ok(appSource.includes('desktopActiveProfileId'));
['passwordType','legacyPassword','saveProfileStore(false)','rb-profile-store-updated'].forEach((feature) => assert.ok(appSource.includes(feature)));
assert.ok(css.includes('@page { size:A4; margin:0; }'));
assert.ok(css.includes('min-height:297mm; padding:10mm;'));

console.log('Todos os testes passaram.');
