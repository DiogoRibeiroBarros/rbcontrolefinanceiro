(function (root) {
  'use strict';

  var STORE_KEY = 'rb_gestao_financeira_windows_v120';
  var PROFILE_STORE_KEY = 'rb_gestao_financeira_profiles_v1';
  var UI_STORE_KEY = 'rb_gestao_financeira_windows_ui_v120';
  var SIDEBAR_STORE_KEY = 'rb_gestao_financeira_sidebar_collapsed_v1';
  var THEME_STORE_KEY = 'rb_gestao_financeira_theme_v1';
  var APP_SETTINGS_STORE_KEY = 'rb_gestao_financeira_app_settings_v1';
  var LOGIN_SESSION_KEY = 'rb_gestao_financeira_authenticated_profile_v1';
  var APP_VERSION = '2.3.28';
  var BUILD_DATE = '__BUILD_DATE__';
  function compareVersions(a,b){return String(a||'0').split('.').map(Number).concat([0,0,0]).slice(0,3).reduce(function(result,value,index){return result||value-Number(String(b||'0').split('.')[index]||0);},0);}
  function registerAudit(module,action,description,recordId){if(!state)return;state.auditLog=Array.isArray(state.auditLog)?state.auditLog:[];state.auditLog.push({id:uid(),module:String(module||'geral'),action:String(action||'alteração'),description:String(description||''),recordId:String(recordId||''),profileId:(getActiveProfile()||{}).id||'',profileName:(getActiveProfile()||{}).name||'',date:new Date().toISOString()});if(state.auditLog.length>5000)state.auditLog=state.auditLog.slice(-5000);}
  var MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var screens = [
    { id: 'dashboard', title: 'Início', pageTitle:'Visão Geral', subtitle: 'Resumo financeiro do mês selecionado', icon: '🏠' },
    { id: 'entries', title: 'Transações', subtitle: 'Receitas, despesas e status de pagamento', icon: '🧾' },
    { id: 'accounts', title: 'Contas', subtitle: 'Contas bancárias, saldos e transferências', icon: '🏛️' },
    { id: 'investments', title: 'Investimentos', subtitle: 'Carteira, rentabilidade, aportes e resgates', icon: '📈' },
    { id: 'cards', title: 'Cartões', subtitle: 'Cartões, compras e faturas sem impacto no saldo financeiro', icon: '💳' },
    { id: 'invoices', title: 'Faturas', subtitle: 'Faturas abertas, pagamentos e vencimentos', icon: '📄' },
    { id: 'salary', title: 'Salário', subtitle: 'Salário bruto, proventos, descontos e líquido', icon: '💵' },
    { id: 'loans', title: 'Empréstimos', subtitle: 'Controle de parcelas a pagar e a receber', icon: '🏦' },
    { id: 'subscriptions', title: 'Assinaturas', subtitle: 'Aplicativos, jogos, streaming e recorrências', icon: '🔄' },
    { id: 'home-expenses', title: 'Gastos da casa', subtitle: 'Moradores, contas compartilhadas e confirmações', icon: '🏘️' },
    { id: 'categories', title: 'Categorias', subtitle: 'Cadastros usados nos lançamentos', icon: '🏷️' },
    { id: 'institutions', title: 'Instituições', subtitle: 'Bancos, cores, logotipos e identificação automática', icon: '🏛️' },
    { id: 'reports', title: 'Relatórios', subtitle: 'PDFs completos por módulo e competência', icon: '📊' },
    { id: 'settings', title: 'Configurações', subtitle: 'Preferências, aparência e backups', icon: '⚙️' },
    { id: 'help', title: 'Help', subtitle: 'Tutorial completo para utilizar o sistema', icon: '❓' }
  ];

  var defaultCategories = {
    income: ['Salário','Comissões','Vendas','Empréstimos recebidos','Receita de Investimentos','Outras receitas'],
    expense: ['Assinaturas','Compras avulsas','Casa','Mercado','Plano celular','Plano de saúde','Mecânico','Empréstimos','Outras despesas'],
    card: ['Assinaturas','Mercado','Alimentação','Transporte','Compras','Serviços','Saúde','Outros cartão'],
    salary: ['Salário fixo','Comissões','Bônus','Adiantamento','Descontos','Outros salário'],
    loan: ['Empréstimos recebidos','Empréstimos para terceiros','Parcelas recebidas','Parcelas pagas','Juros','Outros empréstimos']
  };
  var defaultInvestmentCategories = {
    'Renda Fixa':['CDB','RDB','LCI','LCA','Tesouro Selic','Tesouro Prefixado','Tesouro IPCA+','Debêntures','CRI','CRA','Poupança','Outros'],
    'Renda Variável':['Ações','ETFs','Fundos Imobiliários','BDRs','Fundos de ações','Outros'],
    'Fundos':['Fundo de Renda Fixa','Fundo Multimercado','Fundo Cambial','Fundo de Ações','Fundo Previdenciário','Outros'],
    'Criptoativos':['Bitcoin','Ethereum','Stablecoins','Altcoins','Outros criptoativos'],
    'Previdência':['PGBL','VGBL','Outros'],
    'Internacional':['Ações internacionais','ETFs internacionais','REITs','Bonds','Conta de investimento internacional','Outros'],
    'Outros Investimentos':['Ouro','Dólar','Euro','Consórcio','Investimento empresarial','Participação societária','Outros ativos']
  };
  var builtInInstitutions = [
    {id:'bank-nubank',name:'Nubank',shortName:'Nubank',bankCode:'260',color:'#820AD1',icon:'nubank.svg',keywords:['nubank','nu bank','ultravioleta']},
    {id:'bank-itau',name:'Itaú Unibanco',shortName:'Itaú',bankCode:'341',color:'#EC7000',icon:'itau.svg',keywords:['itau','itaú','click','uniclass','personnalite','personnalité']},
    {id:'bank-inter',name:'Banco Inter',shortName:'Inter',bankCode:'077',color:'#FF7A00',icon:'inter.svg',keywords:['banco inter','inter']},
    {id:'bank-bradesco',name:'Bradesco',shortName:'Bradesco',bankCode:'237',color:'#CC092F',icon:'bradesco.svg',keywords:['bradesco']},
    {id:'bank-bb',name:'Banco do Brasil',shortName:'Banco do Brasil',bankCode:'001',color:'#F8D117',icon:'banco-brasil.svg',keywords:['banco do brasil','bb ourocard','ourocard']},
    {id:'bank-caixa',name:'Caixa Econômica Federal',shortName:'Caixa',bankCode:'104',color:'#005CA9',icon:'caixa.svg',keywords:['caixa economica','caixa econômica','cartao caixa']},
    {id:'bank-santander',name:'Santander',shortName:'Santander',bankCode:'033',color:'#EC0000',icon:'santander.svg',keywords:['santander']},
    {id:'bank-sicoob',name:'Sicoob',shortName:'Sicoob',bankCode:'756',color:'#075E55',icon:'sicoob.svg',keywords:['sicoob']},
    {id:'bank-sicredi',name:'Sicredi',shortName:'Sicredi',bankCode:'748',color:'#64C832',icon:'sicredi.svg',keywords:['sicredi']},
    {id:'bank-banrisul',name:'Banrisul',shortName:'Banrisul',bankCode:'041',color:'#007A33',icon:'banrisul.svg',keywords:['banrisul']},
    {id:'bank-original',name:'Banco Original',shortName:'Original',bankCode:'212',color:'#68A51C',icon:'original.svg',keywords:['banco original','original']},
    {id:'bank-safra',name:'Banco Safra',shortName:'Safra',bankCode:'422',color:'#B89A5B',icon:'safra.svg',keywords:['banco safra','safra']}
  ];

  var state = null;
  var profileStore = null;
  var activeScreen = 'dashboard';
  var selectedMonth = addMonthsKey(monthKey(new Date()), 1);
  var searchText = '';
  var navSearchText = '';
  var sidebarCollapsed = false;
  var mobileSidebarTimer = null;
  var profileUnlockRequired = false;
  var profileSelectionRequired = false;
  var unlockedProfiles = {};
  var permissionsProfileId = '';
  var remoteAccessStatus = { publicUrl:'', accessToken:'', accessUrl:'', port:41732 };
  var appTheme = 'dark';
  var reportTheme = 'light';
  var appSettings = { startMonth:'next', autoBackupMode:'on-close', backupTime:'20:00', backupRetention:30 };
  var backupStatus = { folder:'', lastBackupAt:'', lastBackupPath:'', lastError:'' };
  var viewOptions = {
    cards: { status:'Todos', sort:'name-asc', purchaseCard:'Todos', purchaseCategory:'Todos', purchaseSort:'date-desc' },
    dashboard: { type:'Todos', category:'Todos', sort:'date-asc' },
    entries: { type:'Todos', status:'Todos', category:'Todos', sort:'date-asc' },
    salary: { type:'Todos', sort:'name-asc' },
    loans: { direction:'Todos', status:'Todos', sort:'name-asc' },
    subscriptions: { status:'Todos', cycle:'Todos', sort:'name-asc' },
    categories: { module:'Todos', sort:'name-asc' }
    ,investments: { category:'Todos', status:'Ativo', movementType:'Todos', patrimonyPeriod:'1 ano' }
  };

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function uid() { return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayBR() { return formatDateBR(new Date()); }
  function monthKey(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1); }
  function monthTitle(key) {
    var parts = String(key).split('-');
    var year = Number(parts[0]);
    var month = Number(parts[1]) - 1;
    return MONTHS[month] + ' de ' + year;
  }
  function addMonthsKey(key, delta) {
    var parts = key.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + delta, 1);
    return monthKey(d);
  }
  function parseDateBR(value) {
    if (!value) return new Date();
    var text = String(value).trim();
    var iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    var br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    var parsed = new Date(text);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  function formatDateBR(date) { return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear(); }
  function dateInputFromBR(value) {
    var d = parseDateBR(value);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dateBRFromInput(value) { return value ? formatDateBR(parseDateBR(value)) : todayBR(); }
  function monthFromBR(value) { return monthKey(parseDateBR(value)); }
  function recurrenceSummary(entry) {
    if (!entry || !entry.recurringGroupId || Number(entry.recurringTotal || 0) <= 1) return '';
    return ' · recorrente ' + Number(entry.recurringIndex || 1) + '/' + Number(entry.recurringTotal || 1);
  }
  function buildRecurringEntries(entry, months) {
    var total = Math.max(1, Math.min(360, Number(months || 1)));
    if (total === 1) return [entry];
    var baseDate = parseDateBR(entry.date);
    var groupId = entry.recurringGroupId || uid();
    var list = [];
    for (var i = 0; i < total; i++) {
      var next = clone(entry);
      next.id = i === 0 && entry.id ? entry.id : uid();
      next.date = formatDateBR(addMonthsDate(baseDate, i));
      next.recurringGroupId = groupId;
      next.recurringIndex = i + 1;
      next.recurringTotal = total;
      next.recurringFrequency = 'Mensal';
      list.push(next);
    }
    return list;
  }
  function applyRecurringEntryEdit(entries, existing, edited, applyToSeries) {
    var sharedFields = ['title','amount','type','category','status','notes'];
    return (entries || []).map(function(item){
      if (item.id === existing.id) return clone(edited);
      if (!applyToSeries || !existing.recurringGroupId || item.recurringGroupId !== existing.recurringGroupId) return item;
      var updated = Object.assign({}, item);
      sharedFields.forEach(function(field){ updated[field] = edited[field]; });
      return updated;
    });
  }
  function parseMoney(value) {
    if (typeof value === 'number') return isFinite(value) ? value : 0;
    var text = String(value || '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
    if (!text) return 0;
    if (text.indexOf(',') >= 0) text = text.replace(/\./g, '').replace(',', '.');
    var n = Number(text);
    return isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }
  function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function toCents(value) { return Math.round(parseMoney(value) * 100); }
  function moneyFromCents(value) { return money(Number(value || 0) / 100); }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function normalizeText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function normalizeInstitution(item,index) {
    item=item&&typeof item==='object'?item:{};
    var icon=String(item.icon||'');
    if(!/^data:image\/(?:png|jpe?g|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(icon)&&!/^[-\w.]+\.svg$/i.test(icon))icon='';
    return {id:String(item.id||uid()),name:String(item.name||('Instituição '+(index+1))),shortName:String(item.shortName||item.name||'Instituição'),bankCode:String(item.bankCode||''),color:normalizeHexColor(item.color,'#4B7600'),icon:icon,keywords:Array.isArray(item.keywords)?item.keywords.map(String).filter(Boolean):[],custom:item.custom===true};
  }
  function identifyFinancialInstitution(description,institutions) {
    var text=' '+normalizeText(description).replace(/[^a-z0-9]+/g,' ').trim()+' ';
    if(!text.trim())return null;
    var matches=[];
    (institutions||state&&state.financialInstitutions||[]).forEach(function(institution){
      (institution.keywords||[]).forEach(function(keyword){var normalized=normalizeText(keyword).replace(/[^a-z0-9]+/g,' ').trim();if(normalized&&text.indexOf(' '+normalized+' ')>=0)matches.push({institution:institution,length:normalized.length});});
    });
    matches.sort(function(a,b){return b.length-a.length;});
    return matches.length?matches[0].institution:null;
  }
  function categoryColorKey(name) { return encodeURIComponent(String(name || '')); }
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var rgb = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x] : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
    return '#' + rgb.map(function(value){ return Math.round((value + m) * 255).toString(16).padStart(2,'0'); }).join('').toUpperCase();
  }
  function categoryPaletteColor(index) {
    var hue = (Number(index || 0) * 137.508 + 24) % 360;
    var saturations = [82,72,88,66];
    var lightness = [58,66,50,72];
    return hslToHex(hue, saturations[index % saturations.length], lightness[index % lightness.length]);
  }
  function ensureCategoryColors(categories, existing) {
    var result = {}, used = {}, colorIndex = 0;
    Object.keys(defaultCategories).forEach(function(module){
      result[module] = {};
      (categories[module] || []).forEach(function(name){
        var key = categoryColorKey(name);
        var candidate = existing && existing[module] ? String(existing[module][key] || '').toUpperCase() : '';
        if (!/^#[0-9A-F]{6}$/.test(candidate) || used[candidate]) {
          do { candidate = categoryPaletteColor(colorIndex++); } while (used[candidate]);
        }
        used[candidate] = true;
        result[module][key] = candidate;
      });
    });
    return result;
  }
  function defaultState() {
    return {
      version: '2.1.0-financial-core',
      createdAt: new Date().toISOString(),
      entries: [],
      categories: clone(defaultCategories),
      categoryColors: ensureCategoryColors(defaultCategories, null),
      cards: [],
      cardTransactions: [],
      invoicePayments: [],
      financialInstitutions: builtInInstitutions.map(function(item,index){return normalizeInstitution(item,index);}),
      bankAccounts: [],
      bankTransactions: [],
      savingsBoxes: [],
      savingsMovements: [],
      investmentCategories: clone(defaultInvestmentCategories),
      investments: [],
      investmentMovements: [],
      patrimonySnapshots: [],
      loans: [],
      subscriptions: [],
      salaryRecords: [],
      homeExpenses: { residents: [], bills: [], residentDebts: [], currentResidentId: '' }
    };
  }
  function normalizeState(input) {
    var base = defaultState();
    var next = input && typeof input === 'object' ? input : {};
    Object.keys(base).forEach(function (k) {
      if (k !== 'categories' && next[k] !== undefined) base[k] = next[k];
    });
    base.categories = clone(defaultCategories);
    if (next.categories) {
      Object.keys(defaultCategories).forEach(function (k) {
        if (Array.isArray(next.categories[k]) && next.categories[k].length) {
          base.categories[k] = next.categories[k].map(String);
        }
      });
    }
    base.categoryColors = ensureCategoryColors(base.categories, next.categoryColors);
    ['entries','cards','cardTransactions','invoicePayments','financialInstitutions','bankAccounts','bankTransactions','savingsBoxes','savingsMovements','investments','investmentMovements','patrimonySnapshots','loans','subscriptions','salaryRecords'].forEach(function (k) {
      if (!Array.isArray(base[k])) base[k] = [];
    });
    base.investmentCategories={};
    Object.keys(defaultInvestmentCategories).forEach(function(group){base.investmentCategories[group]=next.investmentCategories&&Array.isArray(next.investmentCategories[group])?next.investmentCategories[group].map(String).filter(Boolean):clone(defaultInvestmentCategories[group]);});
    if(next.investmentCategories)Object.keys(next.investmentCategories).forEach(function(group){if(!base.investmentCategories[group]&&Array.isArray(next.investmentCategories[group]))base.investmentCategories[group]=next.investmentCategories[group].map(String).filter(Boolean);});
    var known={};
    base.financialInstitutions=base.financialInstitutions.map(normalizeInstitution).concat(builtInInstitutions).filter(function(item,index,list){if(known[item.id])return false;known[item.id]=true;return true;});
    base.bankAccounts=base.bankAccounts.map(function(account){return Object.assign({},account,{id:String(account.id||uid()),financialInstitutionId:String(account.financialInstitutionId||''),name:String(account.name||'Conta'),type:String(account.type||'Conta corrente'),initialBalanceCents:Number.isInteger(account.initialBalanceCents)?account.initialBalanceCents:toCents(account.initialBalance||0),overdraftLimitCents:Number.isInteger(account.overdraftLimitCents)?Math.max(0,account.overdraftLimitCents):Math.max(0,toCents(account.overdraftLimit||0)),isMain:account.isMain===true,active:account.active!==false,createdAt:account.createdAt||new Date().toISOString(),updatedAt:account.updatedAt||new Date().toISOString()});});
    base.bankTransactions=base.bankTransactions.map(function(transaction){return Object.assign({},transaction,{id:String(transaction.id||uid()),bankAccountId:String(transaction.bankAccountId||''),type:String(transaction.type||'Ajuste de saldo'),amountCents:Number.isInteger(transaction.amountCents)?Math.abs(transaction.amountCents):Math.abs(toCents(transaction.amount||0)),direction:transaction.direction==='credit'?'credit':'debit',transactionDate:String(transaction.transactionDate||transaction.date||todayBR()),createdAt:transaction.createdAt||new Date().toISOString(),updatedAt:transaction.updatedAt||new Date().toISOString()});});
    base.savingsBoxes=base.savingsBoxes.map(function(box){return Object.assign({},box,{id:String(box.id||uid()),name:String(box.name||'Caixinha'),bankAccountId:String(box.bankAccountId||''),initialBalanceCents:Math.max(0,Number.isInteger(box.initialBalanceCents)?box.initialBalanceCents:toCents(box.currentValue||0)),targetCents:Math.max(0,Number.isInteger(box.targetCents)?box.targetCents:toCents(box.target||0)),category:String(box.category||'Dinheiro reservado'),icon:String(box.icon||'🐷'),status:['Ativa','Concluída','Arquivada'].indexOf(box.status)>=0?box.status:'Ativa'});});
    base.savingsMovements=base.savingsMovements.map(function(item){return Object.assign({},item,{id:String(item.id||uid()),boxId:String(item.boxId||''),type:String(item.type||'Guardar'),direction:item.direction==='out'?'out':'in',amountCents:Math.abs(Number.isInteger(item.amountCents)?item.amountCents:toCents(item.amount||0)),date:String(item.date||todayBR())});});
    base.investments=base.investments.map(function(item){return Object.assign({},item,{id:String(item.id||uid()),name:String(item.name||'Investimento'),bankAccountId:String(item.bankAccountId||''),financialInstitutionId:String(item.financialInstitutionId||''),category:String(item.category||'Renda Fixa'),subcategory:String(item.subcategory||'Outros'),ticker:String(item.ticker||''),investedCents:Math.max(0,Number.isInteger(item.investedCents)?item.investedCents:toCents(item.investedValue||0)),currentValueCents:Math.max(0,Number.isInteger(item.currentValueCents)?item.currentValueCents:toCents(item.currentValue||item.investedValue||0)),quantity:Math.max(0,Number(item.quantity||0)),averagePriceCents:Math.max(0,Number.isInteger(item.averagePriceCents)?item.averagePriceCents:toCents(item.averagePrice||0)),status:String(item.status||'Ativo')});});
    base.investmentMovements=base.investmentMovements.map(function(item){return Object.assign({},item,{id:String(item.id||uid()),investmentId:String(item.investmentId||''),type:String(item.type||'Aporte'),amountCents:Math.abs(Number.isInteger(item.amountCents)?item.amountCents:toCents(item.amount||0)),feesCents:Math.abs(Number.isInteger(item.feesCents)?item.feesCents:toCents(item.fees||0)),taxCents:Math.abs(Number.isInteger(item.taxCents)?item.taxCents:toCents(item.tax||0)),quantity:Math.max(0,Number(item.quantity||0)),date:String(item.date||todayBR()),realizedProfitCents:Number(item.realizedProfitCents||0)});});
    base.cards=base.cards.map(function(card){var migrated=Object.assign({},card),linkedAccount=base.bankAccounts.find(function(account){return account.id===migrated.bankAccountId;});if(!migrated.financialInstitutionId||migrated.institutionSource!=='manual'){var detected=linkedAccount&&linkedAccount.financialInstitutionId?base.financialInstitutions.find(function(item){return item.id===linkedAccount.financialInstitutionId;}):identifyFinancialInstitution(migrated.name,base.financialInstitutions);migrated.financialInstitutionId=detected?detected.id:String(migrated.financialInstitutionId||'');migrated.institutionSource=detected?(linkedAccount?'account':'detected'):String(migrated.institutionSource||'');}migrated.bankAccountId=String(migrated.bankAccountId||'');migrated.cardBrand=String(migrated.cardBrand||migrated.brandName||'Outro');migrated.lastFourDigits=String(migrated.lastFourDigits||migrated.lastDigits||'');return migrated;});
    base.cards.forEach(function(card){card.active=card.active!==false;});
    if (!base.homeExpenses || typeof base.homeExpenses !== 'object') base.homeExpenses = { residents: [], bills: [], residentDebts: [], currentResidentId: '' };
    if (!Array.isArray(base.homeExpenses.residents)) base.homeExpenses.residents = [];
    if (!Array.isArray(base.homeExpenses.bills)) base.homeExpenses.bills = [];
    base.homeExpenses.bills=base.homeExpenses.bills.map(function(bill){var normalized=Object.assign({},bill),start=String(bill.startMonth||monthFromBR(bill.dueDate||todayBR())),records=bill.monthlyRecords&&typeof bill.monthlyRecords==='object'?clone(bill.monthlyRecords):{};if(Object.keys(records).length===0&&bill.confirmations&&Object.keys(bill.confirmations).length)records[start]={amount:Number(bill.amount||0),payerId:String(bill.payerId||''),confirmations:clone(bill.confirmations),paidDate:'',updatedAt:bill.updatedAt||new Date().toISOString()};Object.keys(records).forEach(function(key){var record=records[key]||{};records[key]={amount:Math.max(0,Number(record.amount==null?bill.amount:record.amount)||0),payerId:String(record.payerId==null?(bill.payerId||''):record.payerId),confirmations:record.confirmations&&typeof record.confirmations==='object'?record.confirmations:{},paidDate:String(record.paidDate||''),updatedAt:record.updatedAt||new Date().toISOString()};});normalized.startMonth=start;normalized.monthlyRecords=records;return normalized;});
    if (!Array.isArray(base.homeExpenses.residentDebts)) base.homeExpenses.residentDebts = [];
    base.homeExpenses.residentDebts=base.homeExpenses.residentDebts.map(function(debt){var scheduled=debt.scheduleType==='Programada';return Object.assign({},debt,{id:String(debt.id||uid()),debtorId:String(debt.debtorId||''),creditorId:String(debt.creditorId||''),description:String(debt.description||'Acerto entre moradores'),amount:Math.abs(Number(debt.amount||0)),date:String(debt.date||todayBR()),dueDate:scheduled?String(debt.dueDate||debt.date||todayBR()):'',scheduleType:scheduled?'Programada':'Fixa',status:scheduled&&debt.status==='Quitada'?'Quitada':'Pendente',paidDate:scheduled&&debt.status==='Quitada'?String(debt.paidDate||debt.dueDate||todayBR()):'',notes:String(debt.notes||''),createdAt:debt.createdAt||new Date().toISOString(),updatedAt:debt.updatedAt||debt.createdAt||new Date().toISOString()});}).filter(function(debt){return debt.debtorId&&debt.creditorId&&debt.debtorId!==debt.creditorId&&debt.amount>0;});
    if (!base.homeExpenses.currentResidentId) base.homeExpenses.currentResidentId = '';
    base.version = '2.1.0-financial-core';
    base.auditLog = Array.isArray(base.auditLog) ? base.auditLog : [];
    return base;
  }
  function categoryColor(module, name) {
    var map = state && state.categoryColors && state.categoryColors[module];
    return map && map[categoryColorKey(name)] ? map[categoryColorKey(name)] : '#B7FF3C';
  }
  function categoryColorByName(name, preferredModule) {
    if (preferredModule && state.categories[preferredModule] && state.categories[preferredModule].indexOf(name) >= 0) return categoryColor(preferredModule,name);
    var found = null;
    Object.keys(defaultCategories).some(function(module){ if(state.categories[module].indexOf(name)>=0){found=categoryColor(module,name);return true;} return false; });
    return found || '#B7FF3C';
  }
  function nextCategoryColor(excludeModule, excludeName) {
    var used = {};
    Object.keys(defaultCategories).forEach(function(module){ (state.categories[module] || []).forEach(function(name){ if(module!==excludeModule || name!==excludeName) used[categoryColor(module,name).toUpperCase()]=true; }); });
    var index = 0, candidate;
    do { candidate = categoryPaletteColor(index++); } while (used[candidate]);
    return candidate;
  }
  function categoryColorInUse(color, excludeModule, excludeName) {
    var wanted = String(color || '').toUpperCase(), found = false;
    Object.keys(defaultCategories).some(function(module){ return (state.categories[module] || []).some(function(name){ if(module===excludeModule && name===excludeName)return false; if(categoryColor(module,name).toUpperCase()===wanted){found=true;return true;} return false; }); });
    return found;
  }
  function setCategoryColor(module, name, color) {
    state.categoryColors[module] = state.categoryColors[module] || {};
    state.categoryColors[module][categoryColorKey(name)] = String(color || '').toUpperCase();
  }
  function profileInitials(name) {
    var parts = String(name || 'Perfil').trim().split(/\s+/).filter(Boolean);
    return ((parts[0] || 'P').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
  }
  function defaultProfilePermissions() {
    var result = {};
    screens.forEach(function(screen){ result[screen.id] = { view:true, create:true, edit:true }; });
    return result;
  }
  function normalizeProfilePermissions(value) {
    var source = value && typeof value === 'object' ? value : {}, result = defaultProfilePermissions();
    screens.forEach(function(screen){
      var item = source[screen.id] || {};
      result[screen.id] = { view:item.view !== false, create:item.create !== false, edit:item.edit !== false };
    });
    return result;
  }
  function hashProfilePassword(password, profileId) {
    var value = String(profileId || '') + '|RB-GESTAO|' + String(password || '');
    if (root.crypto && root.crypto.subtle && root.TextEncoder) {
      return root.crypto.subtle.digest('SHA-256', new root.TextEncoder().encode(value)).then(function(buffer){
        return Array.from(new Uint8Array(buffer)).map(function(byte){ return byte.toString(16).padStart(2, '0'); }).join('');
      });
    }
    var hash = 2166136261;
    for (var i=0;i<value.length;i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return Promise.resolve('legacy-' + (hash >>> 0).toString(16));
  }
  function normalizeProfile(profile, index) {
    profile = profile && typeof profile === 'object' ? profile : {};
    var photo = typeof profile.photo === 'string' && /^data:image\/(?:png|jpe?g|webp);base64,/i.test(profile.photo) ? profile.photo : '';
    return {
      id: profile.id || uid(),
      name: String(profile.name || ('Perfil ' + (Number(index || 0) + 1))).trim() || 'Perfil',
      avatar: String(profile.avatar || 'initials'),
      photo: photo,
      color: String(profile.color || ['#b7ff3c','#4dd6a7','#7c9cff','#ff8d6b','#c58cff'][Number(index || 0) % 5]),
      passwordHash: typeof profile.passwordHash === 'string' ? profile.passwordHash : '',
      passwordType: profile.passwordType === 'pin' ? 'pin' : (profile.passwordHash ? 'legacy' : ''),
      role: profile.role === 'administrator' || Number(index || 0) === 0 ? 'administrator' : 'user',
      permissions: normalizeProfilePermissions(profile.permissions),
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: profile.updatedAt || profile.createdAt || new Date().toISOString(),
      data: normalizeState(profile.data)
    };
  }
  function createProfileStoreFromLegacy(legacyState) {
    var profile = normalizeProfile({ name:'Perfil Principal', avatar:'initials', color:'#b7ff3c', data:normalizeState(legacyState) }, 0);
    return { version:'2.0-users', activeProfileId:profile.id, profiles:[profile], sharedData:profile.data, migratedAt:new Date().toISOString() };
  }
  function mergeProfileFinancialData(profiles) {
    var result=defaultState();
    function mergeList(name, items){
      var existing={}; result[name].forEach(function(item){existing[String(item.id||'')]=true;});
      (items||[]).forEach(function(item){var key=String(item.id||'');if(!key||!existing[key]){result[name].push(clone(item));if(key)existing[key]=true;}});
    }
    profiles.forEach(function(profile,index){
      var source=normalizeState(profile.data);
      ['entries','cards','cardTransactions','invoicePayments','financialInstitutions','bankAccounts','bankTransactions','savingsBoxes','savingsMovements','investments','investmentMovements','patrimonySnapshots','loans','subscriptions'].forEach(function(name){mergeList(name,source[name]);});
      source.salaryRecords.forEach(function(record){
        var current=result.salaryRecords.find(function(item){return item.month===record.month;});
        if(!current) result.salaryRecords.push(clone(record));
        else {
          if(!Array.isArray(current.items)) current.items=[];
          var itemIds={}; (current.items||[]).forEach(function(item){itemIds[String(item.id||'')]=true;});
          (record.items||[]).forEach(function(item){var key=String(item.id||'');if(!key||!itemIds[key])current.items.push(clone(item));});
          if(!current.grossSalary && record.grossSalary) current.grossSalary=record.grossSalary;
        }
      });
      var residentIds={}; result.homeExpenses.residents.forEach(function(item){residentIds[String(item.id||'')]=true;});
      source.homeExpenses.residents.forEach(function(item){var key=String(item.id||'');if(!key||!residentIds[key]){result.homeExpenses.residents.push(clone(item));if(key)residentIds[key]=true;}});
      var billIds={}; result.homeExpenses.bills.forEach(function(item){billIds[String(item.id||'')]=true;});
      source.homeExpenses.bills.forEach(function(item){var key=String(item.id||'');if(!key||!billIds[key]){result.homeExpenses.bills.push(clone(item));if(key)billIds[key]=true;}});
      var debtIds={}; result.homeExpenses.residentDebts.forEach(function(item){debtIds[String(item.id||'')]=true;});
      source.homeExpenses.residentDebts.forEach(function(item){var key=String(item.id||'');if(!key||!debtIds[key]){result.homeExpenses.residentDebts.push(clone(item));if(key)debtIds[key]=true;}});
      Object.keys(defaultCategories).forEach(function(module){
        source.categories[module].forEach(function(name){if(result.categories[module].indexOf(name)<0)result.categories[module].push(name);});
        result.categoryColors[module]=Object.assign(result.categoryColors[module]||{},source.categoryColors[module]||{});
      });
      Object.keys(source.investmentCategories||{}).forEach(function(group){result.investmentCategories[group]=result.investmentCategories[group]||[];source.investmentCategories[group].forEach(function(name){if(result.investmentCategories[group].indexOf(name)<0)result.investmentCategories[group].push(name);});});
      if(index===0) result.homeExpenses.currentResidentId=source.homeExpenses.currentResidentId||'';
    });
    result.categoryColors=ensureCategoryColors(result.categories,result.categoryColors);
    return normalizeState(result);
  }
  function normalizeProfileStore(input) {
    var source = input && typeof input === 'object' ? input : {};
    var profiles = Array.isArray(source.profiles) ? source.profiles.map(normalizeProfile) : [];
    if (!profiles.length) return createProfileStoreFromLegacy(null);
    var activeId = source.activeProfileId;
    if (!profiles.some(function(profile){ return profile.id === activeId; })) activeId = profiles[0].id;
    var sharedData=source.sharedData?normalizeState(source.sharedData):mergeProfileFinancialData(profiles);
    return { version:'2.0-users', activeProfileId:activeId, profiles:profiles, sharedData:sharedData, migratedAt:source.migratedAt || new Date().toISOString(), updatedAt:source.updatedAt || new Date().toISOString() };
  }
  function getActiveProfile() {
    if (!profileStore) return null;
    return profileStore.profiles.find(function(profile){ return profile.id === profileStore.activeProfileId; }) || profileStore.profiles[0] || null;
  }
  function isAdministrator(profile) { return !!(profile && profile.role === 'administrator'); }
  function hasModulePermission(moduleId, permission) {
    var profile = getActiveProfile();
    if (!profile || isAdministrator(profile)) return true;
    var modulePermissions = profile.permissions && profile.permissions[moduleId];
    return !!(modulePermissions && modulePermissions[permission] !== false);
  }
  function saveProfileStore(touchUpdatedAt) {
    if (!profileStore || !root.localStorage) return;
    if (touchUpdatedAt !== false) profileStore.updatedAt = new Date().toISOString();
    root.localStorage.setItem(PROFILE_STORE_KEY, JSON.stringify(profileStore));
    syncDesktopBackupSnapshot();
  }
  function createBackupPackage() { return { format:'rb-gestao-profiles-v1', exportedAt:new Date().toISOString(), profileStore:profileStore }; }
  function syncDesktopBackupSnapshot() {
    try { if (root.rbDesktop && root.rbDesktop.backup && profileStore) root.rbDesktop.backup.snapshot(createBackupPackage()); } catch (err) {}
  }

  function normalizeAppSettings(value) {
    var source = value && typeof value === 'object' ? value : {};
    return {
      startMonth: source.startMonth === 'current' ? 'current' : 'next',
      autoBackupMode: ['off','daily','on-close','daily-and-close'].indexOf(source.autoBackupMode) >= 0 ? source.autoBackupMode : 'on-close',
      backupTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(source.backupTime || '') ? source.backupTime : '20:00',
      backupRetention: [7,15,30,60,90].indexOf(Number(source.backupRetention)) >= 0 ? Number(source.backupRetention) : 30
    };
  }
  function loadAppSettings() {
    try { appSettings = normalizeAppSettings(JSON.parse(root.localStorage && root.localStorage.getItem(APP_SETTINGS_STORE_KEY) || '{}')); }
    catch (err) { appSettings = normalizeAppSettings(null); }
  }
  function saveAppSettings() {
    try { if (root.localStorage) root.localStorage.setItem(APP_SETTINGS_STORE_KEY, JSON.stringify(appSettings)); } catch (err) {}
    if (root.rbDesktop && root.rbDesktop.backup) {
      root.rbDesktop.backup.configure({ mode:appSettings.autoBackupMode, time:appSettings.backupTime, retention:appSettings.backupRetention }).then(function(status){ backupStatus=status || backupStatus; if(activeScreen==='settings')render(); }).catch(function(){});
    }
  }
  function refreshBackupStatus() {
    if (!root.rbDesktop || !root.rbDesktop.backup) return;
    root.rbDesktop.backup.status().then(function(status){ backupStatus=status || backupStatus; if(activeScreen==='settings')render(); }).catch(function(){});
  }
  function loadState() {
    try {
      var profileRaw = root.localStorage ? root.localStorage.getItem(PROFILE_STORE_KEY) : null;
      var raw = null;
      if (!profileRaw) raw = root.localStorage ? root.localStorage.getItem(STORE_KEY) : null;
      profileStore = profileRaw ? normalizeProfileStore(JSON.parse(profileRaw)) : createProfileStoreFromLegacy(raw ? JSON.parse(raw) : null);
      state = profileStore.sharedData;
      if (!profileRaw) saveProfileStore();
      else syncDesktopBackupSnapshot();
    } catch (err) {
      profileStore = createProfileStoreFromLegacy(null);
      state = profileStore.sharedData;
      saveProfileStore();
      toast('Não foi possível ler os dados locais. Iniciado com base zerada.');
    }
  }
  function saveState() {
    if (!state) return;
    updatePatrimonySnapshot();
    state.updatedAt = new Date().toISOString();
    profileStore.sharedData = state;
    var profile = getActiveProfile();
    if (profile) profile.updatedAt = state.updatedAt;
    saveProfileStore();
  }

  function loadUiState() {
    try {
      var raw = root.sessionStorage ? root.sessionStorage.getItem(UI_STORE_KEY) : null;
      var saved = raw ? JSON.parse(raw) : null;
      if (!saved) selectedMonth = appSettings.startMonth === 'current' ? monthKey(new Date()) : addMonthsKey(monthKey(new Date()), 1);
      if (saved && screens.some(function(screen){ return screen.id === saved.activeScreen; })) activeScreen = saved.activeScreen;
      if (saved && /^\d{4}-\d{2}$/.test(saved.selectedMonth || '')) selectedMonth = saved.selectedMonth;
      if (saved && saved.viewOptions && typeof saved.viewOptions === 'object') {
        Object.keys(viewOptions).forEach(function(key){
          if (saved.viewOptions[key]) viewOptions[key] = Object.assign({}, viewOptions[key], saved.viewOptions[key]);
        });
      }
    } catch (err) {
      activeScreen = 'dashboard';
      selectedMonth = addMonthsKey(monthKey(new Date()), 1);
    }
  }
  function saveUiState() {
    if (!root.sessionStorage) return;
    root.sessionStorage.setItem(UI_STORE_KEY, JSON.stringify({ activeScreen: activeScreen, selectedMonth: selectedMonth, viewOptions: viewOptions }));
  }

  function normalizeTheme(value, fallback) { return value === 'light' || value === 'dark' ? value : fallback; }
  function loadThemeState() {
    try {
      appTheme = normalizeTheme(root.localStorage && root.localStorage.getItem(THEME_STORE_KEY), 'dark');
      reportTheme = appTheme;
    } catch (err) { appTheme = 'dark'; reportTheme = 'dark'; }
    applyAppTheme();
  }
  function applyAppTheme() {
    if (!root.document) return;
    document.body.setAttribute('data-theme', appTheme);
    document.documentElement.style.colorScheme = appTheme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', appTheme === 'light' ? '#F3F5F1' : '#0B0F14');
    var toggle = $('theme-toggle');
    if (toggle) {
      var nextIsLight = appTheme === 'dark';
      toggle.setAttribute('aria-label', nextIsLight ? 'Ativar modo claro' : 'Ativar modo escuro');
      toggle.setAttribute('aria-pressed', String(appTheme === 'light'));
      toggle.querySelector('.theme-toggle-icon').textContent = nextIsLight ? '☀' : '☾';
      toggle.querySelector('.theme-toggle-label').textContent = nextIsLight ? 'Modo claro' : 'Modo escuro';
    }
  }
  function toggleAppTheme() {
    appTheme = appTheme === 'dark' ? 'light' : 'dark';
    reportTheme = appTheme;
    try { if (root.localStorage) root.localStorage.setItem(THEME_STORE_KEY, appTheme); } catch (err) {}
    applyAppTheme();
    toast(appTheme === 'light' ? 'Modo claro ativado.' : 'Modo escuro ativado.');
  }

  function loadSidebarState() {
    try {
      sidebarCollapsed = root.localStorage ? root.localStorage.getItem(SIDEBAR_STORE_KEY) === 'true' : false;
    } catch (err) {
      sidebarCollapsed = false;
    }
    applySidebarState();
  }
  function applySidebarState() {
    if (!root.document) return;
    var shell = $('app-shell');
    var toggle = $('sidebar-toggle');
    if (shell) shell.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(!sidebarCollapsed));
      toggle.setAttribute('title', sidebarCollapsed ? 'Expandir menu' : 'Recolher menu');
      toggle.innerHTML = '<span class="sidebar-toggle-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="sr-only">' + (sidebarCollapsed ? 'Expandir menu' : 'Recolher menu') + '</span>';
    }
  }
  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    try {
      if (root.localStorage) root.localStorage.setItem(SIDEBAR_STORE_KEY, String(sidebarCollapsed));
    } catch (err) {}
    applySidebarState();
  }
  function isMobileSidebar() { return !!(root.matchMedia && root.matchMedia('(max-width: 760px)').matches); }
  function setMobileSidebar(open) {
    var shell = $('app-shell');
    var brand = document.querySelector('.compact-brand');
    if (!shell || !isMobileSidebar()) return;
    shell.classList.toggle('mobile-sidebar-open', !!open);
    if (brand) {
      brand.setAttribute('aria-expanded', String(!!open));
      brand.setAttribute('title', open ? 'Fechar menu' : 'Abrir menu');
    }
    if (mobileSidebarTimer) root.clearTimeout(mobileSidebarTimer);
    mobileSidebarTimer = open ? root.setTimeout(function(){ setMobileSidebar(false); }, 10000) : null;
  }
  function toggleMobileSidebar() {
    if (!isMobileSidebar()) return;
    setMobileSidebar(!$('app-shell').classList.contains('mobile-sidebar-open'));
  }

  function compareText(a, b) { return String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity:'base' }); }
  function sortRecords(list, sort, selectors) {
    var copy = list.slice();
    var parts = String(sort || '').split('-');
    var direction = parts.pop() === 'desc' ? -1 : 1;
    var fieldName = parts.join('-');
    var selector = selectors[fieldName] || selectors.name;
    return copy.sort(function(a,b){
      var av = selector(a), bv = selector(b);
      if (typeof av === 'number' || typeof bv === 'number') return (Number(av || 0) - Number(bv || 0)) * direction;
      if (av instanceof Date || bv instanceof Date) return ((av ? av.getTime() : 0) - (bv ? bv.getTime() : 0)) * direction;
      return compareText(av, bv) * direction;
    });
  }
  function filterSelect(id, label, options, selected) {
    return '<label class="filter-field"><span>' + escapeHtml(label) + '</span><select id="' + id + '" class="select compact-select">' + options.map(function(option){ return '<option value="' + escapeHtml(option.value) + '" ' + (option.value === selected ? 'selected' : '') + '>' + escapeHtml(option.label) + '</option>'; }).join('') + '</select></label>';
  }
  function categoryFilterOptions(values, allLabel) {
    var unique = [];
    (values || []).forEach(function(value){
      value = String(value || '').trim();
      if (value && !unique.some(function(item){ return normalizeText(item) === normalizeText(value); })) unique.push(value);
    });
    unique.sort(compareText);
    return [{ value:'Todos', label:allLabel || 'Todas as categorias' }].concat(unique.map(function(value){ return { value:value, label:value }; }));
  }
  function filterBar(content) { return '<div class="filter-bar">' + content + '</div>'; }

  function entryMatchesMonth(e, key) { return monthFromBR(e.date) === key; }
  function entriesForMonth(key) { return state.entries.filter(function(e){ return entryMatchesMonth(e, key); }); }
  function sharedEntriesForMonth(key) {
    var active=getActiveProfile(), access=active && active.sharedAccess;
    if(!access || !access.enabled)return [];
    return profileStore.profiles.filter(function(profile){return profile.id!==active.id && access.profileIds.indexOf(profile.id)>=0;}).reduce(function(result,profile){
      return result.concat((profile.data.entries||[]).filter(function(entry){return entryMatchesMonth(entry,key);}).map(function(entry){var copy=clone(entry);copy.sharedProfileId=profile.id;copy.sharedProfileName=profile.name;return copy;}));
    },[]);
  }
  function sharedSourceProfiles() {
    var active=getActiveProfile(), access=active && active.sharedAccess;
    if(!access || !access.enabled || !access.profileIds.length) return [];
    return profileStore.profiles.filter(function(profile){ return profile.id!==active.id && access.profileIds.indexOf(profile.id)>=0; });
  }
  function sum(list, fn) { return list.reduce(function(acc, item){ return acc + fn(item); }, 0); }
  function roundMoney(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }

  function salaryRecordForMonth(key) {
    var exact = state.salaryRecords.find(function(r){ return r.month === key; });
    var prev = exact || state.salaryRecords
      .filter(function(r){ return r.month <= key; })
      .sort(function(a,b){ return a.month < b.month ? 1 : -1; })[0];
    var record = prev ? {
      month: key,
      grossSalary: Number(prev.grossSalary || 0),
      notes: prev.notes || '',
      items: (prev.items || []).filter(function(i){ return exact || i.fixedMonthly; }).filter(function(i){ return !salaryItemIsLoan(i); })
    } : { month: key, grossSalary: 0, notes: '', items: [] };
    var loanItems = {};
    state.salaryRecords.slice().sort(function(a,b){ return a.month < b.month ? -1 : 1; }).forEach(function(salaryRecord){
      (salaryRecord.items || []).forEach(function(item){ if (salaryItemIsLoan(item)) loanItems[item.id] = item; });
    });
    Object.keys(loanItems).forEach(function(id){
      if (salaryItemAppliesInMonth(loanItems[id], key)) record.items.push(loanItems[id]);
    });
    return record;
  }
  function upsertSalaryRecord(record) {
    var idx = state.salaryRecords.findIndex(function(r){ return r.month === record.month; });
    if (idx >= 0) state.salaryRecords[idx] = record; else state.salaryRecords.push(record);
  }
  function salaryItemAmount(item, gross) {
    if (item.valueMode === 'Percentual') return roundMoney(Number(gross || 0) * Number(item.value || 0) / 100);
    return roundMoney(item.value || 0);
  }
  function salaryItemIsLoan(item) { return item && (item.type === 'Empréstimo CLT' || item.type === 'Empréstimo'); }
  function monthDistanceBetween(startKey, endKey) {
    if (!/^\d{4}-\d{2}$/.test(startKey || '') || !/^\d{4}-\d{2}$/.test(endKey || '')) return 0;
    var start = startKey.split('-');
    var end = endKey.split('-');
    return (Number(end[0]) - Number(start[0])) * 12 + Number(end[1]) - Number(start[1]);
  }
  function salaryLoanInstallmentCount(item) {
    var explicit = Math.max(0, Number(item && item.installmentCount || 0));
    if (explicit) return explicit;
    if (item && item.startMonth && item.endMonth) return Math.max(1, monthDistanceBetween(item.startMonth, item.endMonth) + 1);
    return 1;
  }
  function salaryLoanEndMonth(item) {
    return addMonthsKey(item.startMonth || selectedMonth, salaryLoanInstallmentCount(item) - 1);
  }
  function salaryLoanInstallmentNumber(item, key) {
    if (!item || !item.startMonth) return 0;
    var number = monthDistanceBetween(item.startMonth, key) + 1;
    return number >= 1 && number <= salaryLoanInstallmentCount(item) ? number : 0;
  }
  function salaryItemAppliesInMonth(item, key) {
    if (!salaryItemIsLoan(item)) return true;
    var start = item.startMonth || '';
    var end = item.installmentCount ? salaryLoanEndMonth(item) : (item.endMonth || '');
    return (!start || key >= start) && (!end || key <= end);
  }
  function salaryTotals(key) {
    var r = salaryRecordForMonth(key);
    var earnings = sum(r.items || [], function(i){ return i.type === 'Recebimento' ? salaryItemAmount(i, r.grossSalary) : 0; });
    var deductions = sum(r.items || [], function(i){ return i.type === 'Desconto' ? salaryItemAmount(i, r.grossSalary) : 0; });
    var loanDeductions = sum(r.items || [], function(i){ return salaryItemIsLoan(i) && salaryItemAppliesInMonth(i,key) ? salaryItemAmount(i, r.grossSalary) : 0; });
    return { record: r, earnings: roundMoney(earnings), deductions: roundMoney(deductions), loanDeductions: roundMoney(loanDeductions), net: roundMoney(Number(r.grossSalary || 0) + earnings - deductions - loanDeductions) };
  }

  function addMonthsDate(date, months) {
    var d = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
    if (d.getDate() !== date.getDate()) d = new Date(date.getFullYear(), date.getMonth() + months + 1, 0);
    return d;
  }
  function cardTransactionIsBilledIn(t, key) {
    var start = parseDateBR(t.date);
    start = new Date(start.getFullYear(), start.getMonth() + Number(t.billingMonthOffset || 0), 1);
    var targetParts = key.split('-');
    var target = new Date(Number(targetParts[0]), Number(targetParts[1]) - 1, 1);
    var diff = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
    if (Number(t.installments || 1) > 1) return diff >= 0 && diff < Number(t.installments || 1);
    if (Number(t.recurrenceMonths || 0) > 0) return diff >= 0 && diff < Number(t.recurrenceMonths || 0);
    return diff === 0;
  }
  function cardBilledAmount(t) { return Number(t.installments || 1) > 1 ? roundMoney(Number(t.amount || 0) / Number(t.installments || 1)) : Number(t.amount || 0); }
  function cardInvoicePayment(cardId, key) { return state.invoicePayments.find(function(p){ return p.cardId === cardId && p.month === key; }); }
  function cardInvoiceTotal(cardId, key) {
    return roundMoney(sum(state.cardTransactions.filter(function(t){ return t.cardId === cardId && cardTransactionIsBilledIn(t, key); }), cardBilledAmount));
  }
  function cardAvailableLimit(card, key) {
    var used = sum(state.cardTransactions.filter(function(t){ return t.cardId === card.id && cardTransactionIsBilledIn(t, key); }), function(t){
      return t.consumeTotalLimit ? Number(t.amount || 0) : cardBilledAmount(t);
    });
    return roundMoney(Number(card.limit || 0) - used);
  }
  function cardBestPurchaseDay(card) {
    var closing=Math.max(1,Math.min(31,Number(card.closingDay||1)));
    return closing>=31?1:closing+1;
  }
  function cardSummary(cards, key, transactions) {
    cards = cards || [];
    transactions = transactions || [];
    var totalLimit = roundMoney(sum(cards, function(card){ return Number(card.limit || 0); }));
    var invoiceTotal = roundMoney(sum(cards, function(card){ return cardInvoiceTotal(card.id, key); }));
    var paidTotal = roundMoney(sum(cards, function(card){
      var payment = cardInvoicePayment(card.id, key);
      return payment ? Number(payment.paidAmount || 0) : 0;
    }));
    var openTotal = roundMoney(sum(cards, function(card){
      var payment = cardInvoicePayment(card.id, key);
      return Math.max(0, cardInvoiceTotal(card.id, key) - Number(payment ? payment.paidAmount || 0 : 0));
    }));
    var availableTotal = roundMoney(sum(cards, function(card){ return cardAvailableLimit(card, key); }));
    return {
      cardCount: cards.length,
      purchaseCount: transactions.length,
      purchaseTotal: roundMoney(sum(transactions, cardBilledAmount)),
      totalLimit: totalLimit,
      committedLimit: roundMoney(totalLimit - availableTotal),
      availableLimit: availableTotal,
      invoiceTotal: invoiceTotal,
      paidTotal: paidTotal,
      openTotal: openTotal
    };
  }
  function daysUntilDay(day, ref) {
    ref = ref || new Date();
    var safe = Math.max(1, Math.min(31, Number(day || 1)));
    var candidate = new Date(ref.getFullYear(), ref.getMonth(), Math.min(safe, new Date(ref.getFullYear(), ref.getMonth()+1, 0).getDate()));
    if (candidate < new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())) {
      var nextMonthLast = new Date(ref.getFullYear(), ref.getMonth()+2, 0).getDate();
      candidate = new Date(ref.getFullYear(), ref.getMonth()+1, Math.min(safe, nextMonthLast));
    }
    return Math.ceil((candidate - new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())) / 86400000);
  }

  function loanPaidAmount(loan, number, installmentAmount) {
    return roundMoney(sum((loan.payments || []).filter(function(payment){ return Number(payment.number) === Number(number); }), function(payment){
      return payment.amount === undefined || payment.amount === null ? Number(installmentAmount || 0) : Number(payment.amount || 0);
    }));
  }
  function loanIsBalanceOnly(loan) { return !!loan && loan.calculationMode === 'balance'; }
  function loanRepeatsIndefinitely(loan) { return !!loan && loan.openEnded && (loan.calculationMode || 'installment') === 'installment'; }
  function calculateLoanValues(mode, informedValue, installments, openEnded) {
    var value = roundMoney(Math.max(0, Number(informedValue || 0)));
    var count = Math.max(1, Number(installments || 1));
    var selectedMode = mode === 'balance' ? 'balance' : (mode === 'installment' ? 'installment' : 'total');
    if (selectedMode === 'balance') return { calculationMode:'balance', principalAmount:value, installmentAmount:0, installments:0 };
    return {
      calculationMode:selectedMode,
      principalAmount:selectedMode === 'total' ? value : (openEnded ? value : roundMoney(value * count)),
      installmentAmount:selectedMode === 'total' ? (openEnded ? value : roundMoney(value / count)) : value,
      installments:openEnded && selectedMode === 'total' ? 1 : count
    };
  }
  function loanInstallmentIsExcluded(loan, number) {
    return (loan.excludedInstallments || []).map(Number).indexOf(Number(number)) >= 0;
  }
  function applyLoanInstallmentDeletion(loan, numbers) {
    if (loanIsBalanceOnly(loan)) return 0;
    var targets = (numbers || []).map(Number).filter(function(number,index,list){ return number > 0 && list.indexOf(number) === index; });
    loan.excludedInstallments = (loan.excludedInstallments || []).map(Number).concat(targets).filter(function(number,index,list){ return list.indexOf(number) === index; }).sort(function(a,b){ return a-b; });
    loan.payments = (loan.payments || []).filter(function(payment){ return targets.indexOf(Number(payment.number)) < 0; });
    return loanSchedule(loan).length;
  }
  function loanInstallmentAt(loan, number) {
    var first = parseDateBR(loan.firstDueDate);
    var amount = Number(loan.installmentAmount || 0);
    var installmentCount = Math.max(1, Number(loan.installments || 1));
    if (!loan.openEnded && loan.calculationMode === 'total' && Number(number) === installmentCount) {
      amount = roundMoney(Math.max(0, Number(loan.principalAmount || 0) - Number(loan.installmentAmount || 0) * (installmentCount - 1)));
    }
    var due = addMonthsDate(first, Number(number) - 1);
    var paymentRows = (loan.payments || []).filter(function(payment){ return Number(payment.number) === Number(number); });
    var paidAmount = Math.min(amount, loanPaidAmount(loan, number, amount));
    return {
      number:Number(number),
      dueDate:formatDateBR(due),
      amount:amount,
      paidAmount:paidAmount,
      remainingAmount:roundMoney(Math.max(0, amount - paidAmount)),
      paid:paidAmount >= amount && amount > 0,
      paidDate:paymentRows.length ? paymentRows[paymentRows.length - 1].paidDate : '',
      paymentCount:paymentRows.length
    };
  }
  function loanInstallmentForMonth(loan, key) {
    if (loanIsBalanceOnly(loan)) return null;
    var firstKey = monthFromBR(loan.firstDueDate);
    var index = monthDistanceBetween(firstKey, key);
    if (index < 0) return null;
    if (!loanRepeatsIndefinitely(loan) && index >= Math.max(1, Number(loan.installments || 1))) return null;
    if (loanInstallmentIsExcluded(loan, index + 1)) return null;
    return loanInstallmentAt(loan, index + 1);
  }
  function loanSchedule(loan, throughKey) {
    if (loanIsBalanceOnly(loan)) return [];
    var installments = Math.max(1, Number(loan.installments || 1));
    if (loanRepeatsIndefinitely(loan)) {
      var maxPaid = (loan.payments || []).reduce(function(maximum, payment){ return Math.max(maximum, Number(payment.number || 0)); }, 0);
      var maxExcluded = (loan.excludedInstallments || []).reduce(function(maximum, number){ return Math.max(maximum, Number(number || 0)); }, 0);
      var horizon = throughKey ? monthDistanceBetween(monthFromBR(loan.firstDueDate), throughKey) + 1 : 0;
      installments = Math.max(12, maxPaid + 1, maxExcluded + 1, horizon);
    }
    var list = [];
    for (var i=1; i<=installments; i++) {
      if (!loanInstallmentIsExcluded(loan, i)) list.push(loanInstallmentAt(loan, i));
    }
    return list;
  }
  function nextLoanInstallment(loan) {
    if (loanIsBalanceOnly(loan)) return null;
    if (loanRepeatsIndefinitely(loan)) {
      var maxPaid = (loan.payments || []).reduce(function(maximum, payment){ return Math.max(maximum, Number(payment.number || 0)); }, 0);
      var maxExcluded = (loan.excludedInstallments || []).reduce(function(maximum, number){ return Math.max(maximum, Number(number || 0)); }, 0);
      for (var number=1; number<=Math.max(1, maxPaid + 1, maxExcluded + 1); number++) {
        if (loanInstallmentIsExcluded(loan, number)) continue;
        var openInstallment = loanInstallmentAt(loan, number);
        if (!openInstallment.paid) return openInstallment;
      }
    }
    return loanSchedule(loan).filter(function(i){ return !i.paid; }).sort(function(a,b){ return parseDateBR(a.dueDate) - parseDateBR(b.dueDate); })[0] || null;
  }
  function loanOpenAmount(loan, throughKey) {
    if (loanIsBalanceOnly(loan)) return loanReportRemaining(loan);
    if (loanRepeatsIndefinitely(loan) && throughKey) {
      var countThroughMonth = monthDistanceBetween(monthFromBR(loan.firstDueDate), throughKey) + 1;
      if (countThroughMonth <= 0) return 0;
      var openTotal = 0;
      for (var number=1; number<=countThroughMonth; number++) if (!loanInstallmentIsExcluded(loan, number)) openTotal += loanInstallmentAt(loan, number).remainingAmount;
      return roundMoney(openTotal);
    }
    return roundMoney(sum(loanSchedule(loan, throughKey), function(i){ return i.remainingAmount; }));
  }
  function loanBaseDebt(loan) {
    var principal = Number(loan.principalAmount || 0);
    if (loan.openEnded) return roundMoney(principal);
    return roundMoney(sum(loanSchedule(loan), function(installment){ return installment.amount; }));
  }
  function loanAdjustmentTotal(loan) {
    return roundMoney(sum(loan.adjustments || [], function(adjustment){ return Number(adjustment.amount || 0); }));
  }
  function loanTotalDebt(loan) { return roundMoney(loanBaseDebt(loan) + loanAdjustmentTotal(loan)); }
  function loanTotalPaid(loan) {
    if (loanIsBalanceOnly(loan)) return roundMoney(sum(loan.payments || [], function(payment){ return Number(payment.amount || 0); }));
    var numbers = [];
    (loan.payments || []).forEach(function(payment){
      var number = Number(payment.number || 0);
      if (number > 0 && !loanInstallmentIsExcluded(loan, number) && numbers.indexOf(number) < 0) numbers.push(number);
    });
    return roundMoney(sum(numbers, function(number){ return loanInstallmentAt(loan, number).paidAmount; }));
  }
  function loanReportRemaining(loan) { return roundMoney(Math.max(0, loanTotalDebt(loan) - loanTotalPaid(loan))); }
  function loanProgressPercent(loan) {
    var debt = loanTotalDebt(loan);
    return debt > 0 ? Math.min(100, Math.round(loanTotalPaid(loan) / debt * 1000) / 10) : 0;
  }
  function loanMovementHistory(loan) {
    var movements = [{ id:'initial-' + loan.id, kind:'initial', type:'Dívida inicial', amount:loanBaseDebt(loan), date:loan.createdDate || loan.firstDueDate, direction:'increase', notes:'Cadastro do contrato' }];
    (loan.adjustments || []).forEach(function(adjustment){ movements.push({ id:adjustment.id, kind:'adjustment', type:'Aumento', amount:Number(adjustment.amount || 0), date:adjustment.date, direction:'increase', notes:adjustment.notes || '' }); });
    (loan.payments || []).forEach(function(payment,index){ movements.push({ id:payment.id || ('payment-' + payment.number + '-' + payment.paidDate), kind:'payment', paymentIndex:index, type:'Pagamento', amount:payment.amount === undefined ? Number(loan.installmentAmount || 0) : Number(payment.amount || 0), date:payment.paidDate, direction:'payment', notes:loanIsBalanceOnly(loan) ? 'Baixa direta do montante' : 'Parcela ' + payment.number }); });
    return movements.sort(function(a,b){ return parseDateBR(b.date) - parseDateBR(a.date); });
  }
  function nextSubscriptionDue(sub, ref) {
    ref = ref || new Date();
    var months = sub.billingCycle === 'Anual' ? 12 : sub.billingCycle === 'Trimestral' ? 3 : 1;
    var start = parseDateBR(sub.startDate);
    var dueDay = Math.max(1, Math.min(31, Number(sub.dueDay || 1)));
    var candidate = new Date(Math.max(start.getFullYear(), ref.getFullYear()), Math.max(start.getMonth(), ref.getMonth()), 1);
    candidate = new Date(candidate.getFullYear(), candidate.getMonth(), Math.min(dueDay, new Date(candidate.getFullYear(), candidate.getMonth()+1, 0).getDate()));
    while (candidate < new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())) candidate = addMonthsDate(candidate, 1);
    while ((((candidate.getFullYear() - start.getFullYear()) * 12 + candidate.getMonth() - start.getMonth()) % months) !== 0) candidate = addMonthsDate(candidate, 1);
    return formatDateBR(candidate);
  }
  function subscriptionMonthlyEquivalent(sub) {
    var divisor = sub.billingCycle === 'Anual' ? 12 : sub.billingCycle === 'Trimestral' ? 3 : 1;
    return roundMoney(Number(sub.amount || 0) / divisor);
  }

  function subscriptionAmountForMonth(sub, key) {
    if (!sub || sub.active === false) return 0;
    var startKey = monthFromBR(sub.startDate);
    if (key < startKey) return 0;
    var startParts = startKey.split('-');
    var keyParts = key.split('-');
    var monthDistance = (Number(keyParts[0]) - Number(startParts[0])) * 12 + Number(keyParts[1]) - Number(startParts[1]);
    var interval = sub.billingCycle === 'Anual' ? 12 : sub.billingCycle === 'Trimestral' ? 3 : 1;
    return monthDistance % interval === 0 ? roundMoney(Number(sub.amount || 0)) : 0;
  }

  function loanInstallmentsForMonth(key) {
    var movements = [];
    state.loans.forEach(function(loan){
      var installment = loanInstallmentForMonth(loan, key);
      if (installment) movements.push({ loan: loan, installment: installment });
    });
    return movements;
  }

  function monthlyMovements(key) {
    var movements = [];
    var salary = salaryTotals(key);
    if (salary.net) movements.push({ id:'salary-' + key, title:'Salário líquido', module:'Salário', date:'01/' + key.slice(5,7) + '/' + key.slice(0,4), amount:salary.net, type:'Receita', status:'Calculado' });
    entriesForMonth(key).forEach(function(entry){
      movements.push({ id:entry.id, title:entry.title, module:'Transações · ' + entry.category, date:entry.date, amount:Number(entry.amount || 0), type:entry.type, status:entry.status });
    });
    loanInstallmentsForMonth(key).forEach(function(item){
      movements.push({ id:item.loan.id + '-' + item.installment.number, title:item.loan.name + ' · parcela ' + item.installment.number, module:'Empréstimos', date:item.installment.dueDate, amount:Number(item.installment.amount || 0), type:item.loan.direction === 'Emprestei para alguém' ? 'Receita' : 'Despesa', status:item.installment.paid ? 'Pago' : (item.installment.paidAmount > 0 ? 'Parcial' : 'Previsto') });
    });
    state.subscriptions.forEach(function(sub){
      var amount = subscriptionAmountForMonth(sub, key);
      if (!amount) return;
      movements.push({ id:'subscription-' + sub.id + '-' + key, title:sub.name, module:'Assinaturas · ' + sub.kind, date:pad(Math.max(1, Math.min(31, Number(sub.dueDay || 1)))) + '/' + key.slice(5,7) + '/' + key.slice(0,4), amount:amount, type:'Despesa', status:'Previsto' });
    });
    return movements.sort(function(a,b){ return parseDateBR(a.date) - parseDateBR(b.date); });
  }

  function dashboard(key) {
    var entries = entriesForMonth(key);
    var entryIncome = sum(entries, function(e){ return e.type === 'Receita' ? Number(e.amount || 0) : 0; });
    var entryExpense = sum(entries, function(e){ return e.type === 'Despesa' ? Number(e.amount || 0) : 0; });
    var paidIncome = sum(entries, function(e){ return e.type === 'Receita' && e.status === 'Pago' ? Number(e.amount || 0) : 0; });
    var paidExpense = sum(entries, function(e){ return e.type === 'Despesa' && e.status === 'Pago' ? Number(e.amount || 0) : 0; });
    var loanMonth = loanInstallmentsForMonth(key);
    var loanExpense = sum(loanMonth, function(item){ return item.loan.direction === 'Peguei emprestado' ? Number(item.installment.amount || 0) : 0; });
    var loanIncome = sum(loanMonth, function(item){ return item.loan.direction === 'Emprestei para alguém' ? Number(item.installment.amount || 0) : 0; });
    var paidLoanExpense = sum(loanMonth, function(item){ return item.loan.direction === 'Peguei emprestado' ? Number(item.installment.paidAmount || 0) : 0; });
    var paidLoanIncome = sum(loanMonth, function(item){ return item.loan.direction === 'Emprestei para alguém' ? Number(item.installment.paidAmount || 0) : 0; });
    var subscriptionsDue = sum(state.subscriptions, function(sub){
      return subscriptionAmountForMonth(sub, key);
    });
    var activeSubs = state.subscriptions.filter(function(s){ return s.active !== false; });
    var subMonthly = sum(activeSubs, subscriptionMonthlyEquivalent);
    var salary = salaryTotals(key);
    var expectedIncome = entryIncome + loanIncome;
    var expectedExpense = entryExpense + loanExpense + subscriptionsDue;
    return {
      expectedIncome: roundMoney(expectedIncome),
      totalIncome: roundMoney(salary.net + expectedIncome),
      expectedExpense: roundMoney(expectedExpense),
      paidIncome: roundMoney(paidIncome + paidLoanIncome),
      paidExpense: roundMoney(paidExpense + paidLoanExpense),
      expectedBalance: roundMoney(salary.net + expectedIncome - expectedExpense),
      currentBalance: roundMoney(salary.net + paidIncome + paidLoanIncome - paidExpense - paidLoanExpense),
      openInvoice: 0,
      loanBorrowedOpen: roundMoney(loanExpense),
      loanLentOpen: roundMoney(loanIncome),
      subscriptionsDue: roundMoney(subscriptionsDue),
      activeSubscriptions: activeSubs.length,
      subscriptionsMonthly: roundMoney(subMonthly),
      salaryNet: salary.net
    };
  }

  function $(id) { return document.getElementById(id); }
  function toast(message) {
    if (!root.document) return;
    var el = $('toast');
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ el.classList.add('hidden'); }, 2800);
  }
  function setScreen(id) {
    if (!hasModulePermission(id, 'view')) return toast('Este perfil não pode visualizar este módulo.');
    activeScreen = id;
    searchText = '';
    saveUiState();
    render();
    if ($('content')) $('content').scrollTop = 0;
  }
  function profileAvatarHtml(profile, className) {
    profile = profile || { name:'Perfil', avatar:'initials', color:'#b7ff3c' };
    if (profile.photo) return '<span class="profile-avatar profile-avatar-photo ' + (className || '') + '" style="--profile-color:' + escapeHtml(profile.color) + '"><img src="' + escapeHtml(profile.photo) + '" alt="Foto de ' + escapeHtml(profile.name) + '"></span>';
    var content = profile.avatar && profile.avatar !== 'initials' ? profile.avatar : profileInitials(profile.name);
    return '<span class="profile-avatar ' + (className || '') + '" style="--profile-color:' + escapeHtml(profile.color) + '">' + escapeHtml(content) + '</span>';
  }
  function resizeProfilePhoto(file, onComplete) {
    if (!file || !/^image\//i.test(file.type || '')) return onComplete(null,'Escolha um arquivo de imagem válido.');
    if (Number(file.size || 0) > 10 * 1024 * 1024) return onComplete(null,'A foto deve ter no máximo 10 MB.');
    var reader = new root.FileReader();
    reader.onerror = function(){ onComplete(null,'Não foi possível ler a imagem.'); };
    reader.onload = function(){
      var image = new root.Image();
      image.onerror = function(){ onComplete(null,'A imagem selecionada é inválida.'); };
      image.onload = function(){
        var size = 256;
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var context = canvas.getContext('2d');
        var sourceSize = Math.min(image.width,image.height);
        var sourceX = Math.max(0,(image.width-sourceSize)/2);
        var sourceY = Math.max(0,(image.height-sourceSize)/2);
        context.drawImage(image,sourceX,sourceY,sourceSize,sourceSize,0,0,size,size);
        onComplete(canvas.toDataURL('image/jpeg',0.84),null);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function renderProfileArea() {
    var profile = getActiveProfile();
    var el = $('profile-switcher');
    if (!el || !profile) return;
    el.innerHTML = profileAvatarHtml(profile, 'profile-avatar-main') + '<span class="profile-copy"><small>Olá!</small><strong>' + escapeHtml(profile.name) + '</strong></span><span class="profile-chevron">⌄</span>';
  }
  function completeProfileSwitch(id) {
    saveState();
    profileStore.activeProfileId = id;
    setAuthenticatedProfile(id);
    state = profileStore.sharedData;
    if (!hasModulePermission(activeScreen, 'view')) {
      var firstAllowed = screens.find(function(screen){ return hasModulePermission(screen.id, 'view'); });
      activeScreen = firstAllowed ? firstAllowed.id : 'dashboard';
    }
    searchText = '';
    saveProfileStore();
    profileSelectionRequired = false;
    closeModal();
    render();
    toast('Perfil alterado para ' + getActiveProfile().name + '.');
  }
  function setAuthenticatedProfile(id) {
    try { if (root.sessionStorage) root.sessionStorage.setItem(LOGIN_SESSION_KEY, String(id || '')); } catch (_) {}
    if (id) unlockedProfiles[id] = true;
  }
  function completeProfileLogin(id) {
    setAuthenticatedProfile(id);
    completeProfileSwitch(id);
  }
  function configureBiometricButton(profile, button, onSuccess, errorElement) {
    var nativeApp=!!(root.ReactNativeWebView&&typeof root.ReactNativeWebView.postMessage==='function');
    var available=!!(profile&&profile.passwordHash&&profile.passwordType!=='legacy'&&nativeApp);
    if(!button)return;
    var biometricBlock=button.closest?button.closest('.biometric-login-block'):null;
    if(biometricBlock)biometricBlock.hidden=!available;
    button.hidden=!available;
    if(!available)return;
    button.setAttribute('data-biometric-profile-id',String(profile.id));
    button.setAttribute('data-biometric-profile-name',String(profile.name||''));
    button.disabled=false;
    button.innerHTML='<span class="biometric-icon" aria-hidden="true">◎</span><span><strong>Entrar com biometria</strong><small>Use a impressão digital cadastrada no celular</small></span>';
    button.onclick=function(){
      button.disabled=true;
      button.classList.add('is-waiting');
      button.querySelector('strong').textContent='Aguardando sua digital…';
      if(errorElement)errorElement.hidden=true;
      root.rbHandleBiometricResult=function(result){
        if(!result||String(result.profileId)!==String(profile.id))return;
        button.disabled=false;
        button.classList.remove('is-waiting');
        button.querySelector('strong').textContent='Entrar com biometria';
        if(result.success){root.rbHandleBiometricResult=null;onSuccess();return;}
        if(result.error&&errorElement){errorElement.textContent=String(result.error);errorElement.hidden=false;}
      };
      var payload={type:'biometric-auth',profileId:String(profile.id),profileName:String(profile.name||'')};
      try{root.ReactNativeWebView.postMessage(JSON.stringify(payload));}
      catch(_){var request='rbgestao://biometric?profileId='+encodeURIComponent(payload.profileId)+'&profileName='+encodeURIComponent(payload.profileName);root.location.href=request;}
    };
  }
  function openLoginScreen() {
    profileSelectionRequired = true;
    profileUnlockRequired = true;
    var active=getActiveProfile() || profileStore.profiles[0];
    var options=profileStore.profiles.map(function(profile){return '<option value="'+profile.id+'" '+(active&&profile.id===active.id?'selected':'')+'>'+escapeHtml(profile.name)+'</option>';}).join('');
    $('modal-root').innerHTML='<div class="modal-backdrop profile-login-backdrop"><main class="profile-login-screen"><section class="profile-login-brand"><img src="assets/rb_gestao_horizontal_sidebar_hd.png" alt="RB Gestão Financeira" class="profile-login-logo"><span class="login-security-pill">● Acesso seguro</span><div class="login-brand-copy"><p>CONTROLE FINANCEIRO PESSOAL</p><h1>Suas finanças.<br><em>No seu controle.</em></h1><span>Acesse seu perfil com segurança para acompanhar todos os seus lançamentos.</span></div><div class="login-brand-footer">🔒 Seus dados permanecem protegidos</div></section><section class="profile-login-panel"><div class="profile-login-heading"><span>Bem-vindo de volta</span><h2>Acesse sua conta</h2><p>Escolha o perfil e confirme sua identidade.</p></div><form id="profile-login-form"><div class="field login-user-field"><label for="profileLoginUser">Perfil de usuário</label><div class="login-profile-control"><div id="profile-login-avatar"></div><select class="select" id="profileLoginUser" name="profileLoginUser">'+options+'</select><span class="login-select-arrow">⌄</span></div></div><div class="biometric-login-block" hidden><button type="button" class="biometric-login-btn" id="profile-biometric-login"><span class="biometric-icon">◎</span><span><strong>Entrar com biometria</strong><small>Use a impressão digital cadastrada no celular</small></span></button><div class="auth-divider"><span>ou entre com seu PIN</span></div></div><div class="field"><label for="profileLoginPassword">PIN de acesso</label><div class="login-pin-wrap"><span>••</span><input class="input profile-pin-input" id="profileLoginPassword" name="profileLoginPassword" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="12" autocomplete="current-password" aria-describedby="profile-login-help" placeholder="Digite seu PIN"></div><small id="profile-login-help">Perfis sem senha podem entrar deixando o campo vazio.</small></div><p class="form-error" id="profile-login-error" hidden>Usuário ou senha incorretos.</p><button type="submit" class="primary-btn profile-login-submit">Entrar no RB Gestão <span>→</span></button></form><footer>RB Gestão Financeira · Ambiente protegido</footer></section></main></div>';
    var select=$('profileLoginUser'), input=$('profileLoginPassword'), avatar=$('profile-login-avatar'), biometricButton=$('profile-biometric-login'), loginError=$('profile-login-error');
    var profileChooser=document.createElement('div');profileChooser.className='login-profile-cards';profileChooser.setAttribute('role','listbox');
    profileChooser.innerHTML=profileStore.profiles.map(function(profile){var created=new Date(profile.createdAt),createdLabel=isNaN(created.getTime())?'':' · criado em '+created.toLocaleDateString('pt-BR');return '<button type="button" class="login-profile-card" data-login-profile-id="'+profile.id+'" role="option">'+profileAvatarHtml(profile,'profile-avatar-login')+'<span class="login-profile-card-copy"><strong>'+escapeHtml(profile.name)+(profile.passwordHash?' <b title="Perfil protegido">🔒</b>':'')+'</strong><small>'+profileRecordCount(profile)+' registro(s) disponíveis'+createdLabel+'</small></span><i>✓</i></button>';}).join('');
    select.closest('.login-profile-control').hidden=true;select.closest('.login-user-field').appendChild(profileChooser);
    function selectedProfile(){return profileStore.profiles.find(function(profile){return profile.id===select.value;});}
    function finishLogin(profile){profileUnlockRequired=false;profileSelectionRequired=false;completeProfileLogin(profile.id);}
    function refreshProfileCards(){Array.prototype.slice.call(profileChooser.querySelectorAll('[data-login-profile-id]')).forEach(function(button){var selected=button.getAttribute('data-login-profile-id')===select.value;button.classList.toggle('selected',selected);button.setAttribute('aria-selected',selected?'true':'false');});}
    var lastAutoBiometricProfileId='';
    function refreshLogin(){var profile=selectedProfile(),isLegacy=profile&&profile.passwordType==='legacy';avatar.innerHTML=profile?profileAvatarHtml(profile,'profile-avatar-login'):'';input.value='';input.inputMode=isLegacy?'text':'numeric';if(isLegacy)input.removeAttribute('pattern');else input.setAttribute('pattern','[0-9]*');input.maxLength=isLegacy?80:12;$('profile-login-help').textContent=isLegacy?'Este perfil usa uma senha antiga. Digite-a normalmente e depois altere para um PIN numérico.':'Perfis sem senha podem entrar deixando o campo vazio.';loginError.hidden=true;refreshProfileCards();configureBiometricButton(profile,biometricButton,function(){finishLogin(profile);},loginError);if(profile&&!biometricButton.hidden&&lastAutoBiometricProfileId!==String(profile.id)){lastAutoBiometricProfileId=String(profile.id);root.setTimeout(function(){if(selectedProfile()===profile&&!biometricButton.hidden&&!biometricButton.disabled)biometricButton.click();},250);}}
    select.onchange=refreshLogin;
    Array.prototype.slice.call(profileChooser.querySelectorAll('[data-login-profile-id]')).forEach(function(button){button.onclick=function(){select.value=this.getAttribute('data-login-profile-id');refreshLogin();input.focus();};});
    input.oninput=function(){var profile=selectedProfile();if(!profile||profile.passwordType!=='legacy')input.value=input.value.replace(/\D/g,'');};
    $('profile-login-form').onsubmit=function(ev){
      ev.preventDefault();
      var profile=selectedProfile();
      if(!profile)return;
      var finish=function(){finishLogin(profile);};
      if(!profile.passwordHash)return finish();
      hashProfilePassword(input.value,profile.id).then(function(hash){
        if(hash!==profile.passwordHash){$('profile-login-error').hidden=false;input.value='';input.focus();return;}
        finish();
      });
    };
    refreshLogin();
    root.setTimeout(function(){var selected=profileChooser.querySelector('.selected');if(selected)selected.focus();else input.focus();},30);
  }
  function requestProfileUnlock(profile, onSuccess, allowCancel) {
    if (!profile || !profile.passwordHash || unlockedProfiles[profile.id]) return onSuccess();
    profileUnlockRequired = !allowCancel;
    var cancel = allowCancel ? '<button type="button" class="secondary-btn" data-action="cancel-profile-unlock">Cancelar</button>' : '';
    var legacyPassword=profile.passwordType==='legacy';
    $('modal-root').innerHTML = '<div class="modal-backdrop profile-lock-backdrop"><div class="modal small profile-lock-modal"><div class="profile-lock-icon">🔒</div><h2>Perfil protegido</h2><p class="modal-desc">Confirme sua identidade para acessar o perfil <strong>' + escapeHtml(profile.name) + '</strong>.</p><form id="profile-unlock-form"><div class="biometric-login-block" hidden><button type="button" class="primary-btn biometric-login-btn" id="profile-biometric-unlock">◉ Usar impressão digital</button><div class="auth-divider"><span>ou use '+(legacyPassword?'a senha atual':'o PIN numérico')+'</span></div></div><div class="field"><label for="profileUnlockPassword">'+(legacyPassword?'Senha atual':'PIN numérico')+'</label><input class="input" id="profileUnlockPassword" name="profileUnlockPassword" type="password" inputmode="'+(legacyPassword?'text':'numeric')+'" '+(legacyPassword?'':'pattern="[0-9]*" maxlength="12"')+' required autocomplete="current-password" autofocus></div><p class="form-error" id="profile-unlock-error" hidden>Senha incorreta.</p><div class="actions">' + cancel + '<button type="submit" class="secondary-btn">Entrar com senha</button></div></form></div></div>';
    var input = $('profileUnlockPassword');
    var unlockError = $('profile-unlock-error');
    configureBiometricButton(profile,$('profile-biometric-unlock'),function(){unlockedProfiles[profile.id]=true;profileUnlockRequired=false;closeModal();onSuccess();},unlockError);
    input.oninput = function(){ if(!legacyPassword) input.value=input.value.replace(/\D/g,''); };
    if (input) root.setTimeout(function(){ input.focus(); }, 30);
    $('profile-unlock-form').onsubmit = function(ev){
      ev.preventDefault();
      hashProfilePassword(input.value, profile.id).then(function(hash){
        if (hash !== profile.passwordHash) {
          var error = $('profile-unlock-error');
          if (error) error.hidden = false;
          input.value = ''; input.focus();
          return;
        }
        unlockedProfiles[profile.id] = true;
        profileUnlockRequired = false;
        closeModal();
        onSuccess();
      });
    };
  }
  function switchProfile(id) {
    if (!profileStore) return;
    var profile = profileStore.profiles.find(function(item){ return item.id === id; });
    if (!profile) return;
    if (profile.id === profileStore.activeProfileId && !profileSelectionRequired) return closeModal();
    requestProfileUnlock(profile, function(){ completeProfileSwitch(id); }, !profileSelectionRequired);
  }
  function lockActiveProfileOnStart() {
    var sessionId='';
    try { sessionId=root.sessionStorage ? String(root.sessionStorage.getItem(LOGIN_SESSION_KEY)||'') : ''; } catch (_) {}
    var profile=profileStore && profileStore.profiles.find(function(item){return item.id===sessionId;});
    if(profile){
      profileStore.activeProfileId=profile.id;
      state=profileStore.sharedData;
      unlockedProfiles[profile.id]=true;
      profileSelectionRequired=false;
      profileUnlockRequired=false;
      render();
      return;
    }
    openLoginScreen();
  }
  function renderNav() {
    var query = normalizeText(navSearchText);
    var visibleScreens = screens.filter(function(screen){ return hasModulePermission(screen.id, 'view') && (!query || normalizeText(screen.title + ' ' + screen.subtitle).indexOf(query) >= 0); });
    $('nav').innerHTML = visibleScreens.map(function(s){
      return '<button class="nav-btn ' + (activeScreen === s.id ? 'active' : '') + '" data-screen="' + s.id + '" title="' + escapeHtml(s.title) + '" aria-label="' + escapeHtml(s.title) + '"><span class="nav-icon">' + s.icon + '</span><span class="nav-label">' + s.title + '</span></button>';
    }).join('') || '<div class="nav-empty">Nenhum módulo encontrado.</div>';
  }
  function render() {
    if (!state) loadState();
    renderProfileArea();
    renderNav();
    var screen = screens.find(function(s){ return s.id === activeScreen; }) || screens[0];
    $('screen-title').textContent = screen.pageTitle || screen.title;
    $('screen-subtitle').textContent = screen.subtitle;
    $('month-label').textContent = monthTitle(selectedMonth);
    var html = renderActiveScreenHtml();
    $('content').innerHTML = html;
    if(activeScreen==='settings'){var tabs=document.querySelectorAll('.settings-tab'),sections=document.querySelectorAll('.settings-section');tabs.forEach(function(tab,index){tab.onclick=function(){tabs.forEach(function(t){t.classList.remove('active');});tab.classList.add('active');document.querySelectorAll('.settings-section').forEach(function(section){section.style.display='none';});var groups=[[1],[3],[4],[0,2]][index]||[1];groups.forEach(function(i){if(sections[i])sections[i].style.display='block';});var update=document.querySelector('.update-settings-card');if(update)update.style.display=index===0?'block':'none';};});if(tabs[0])tabs[0].click();}
    if (activeScreen === 'settings') $('content').insertAdjacentHTML('afterbegin','<div class="card settings-section update-settings-card"><div class="settings-heading"><div><span class="settings-kicker">ATUALIZAÇÕES</span><div class="card-title">RB Gestão '+APP_VERSION+'</div><p class="card-subtitle">Verifique ou instale a versão mais recente.</p></div><span class="settings-icon">↻</span></div><div class="row wrap settings-actions"><button class="lime-btn" data-action="check-for-updates">Verificar atualizações</button><button class="secondary-btn" data-action="force-update">Forçar atualização</button></div></div>');
    applyPermissionControls();
    saveUiState();
  }
  function renderActiveScreenHtml() {
    var html = '';
    if (activeScreen === 'dashboard') html = renderDashboard();
    if (activeScreen === 'entries') html = renderEntries();
    if (activeScreen === 'accounts') html = renderAccountsManaged();
    if (activeScreen === 'investments') html = renderInvestments();
    if (activeScreen === 'cards') html = renderCardsManaged();
    if (activeScreen === 'invoices') html = renderInvoices();
    if (activeScreen === 'salary') html = renderSalary();
    if (activeScreen === 'loans') html = renderLoans();
    if (activeScreen === 'subscriptions') html = renderSubscriptions();
    if (activeScreen === 'home-expenses') html = renderHomeExpenses();
    if (activeScreen === 'categories') html = renderCategories();
    if (activeScreen === 'institutions') html = renderInstitutions();
    if (activeScreen === 'reports') html = renderReports();
    if (activeScreen === 'settings') html = '<nav class="settings-tabs"><button class="settings-tab active">Sistema</button><button class="settings-tab">Aparência</button><button class="settings-tab">Backup</button><button class="settings-tab">Cadastros</button></nav>'+renderSettings();
    if (activeScreen === 'help') html = renderHelp();
    return html;
  }
  function metricCard(label, value, cls, detail) {
    return '<div class="metric-card"><div class="metric-label">' + escapeHtml(label) + '</div><div class="metric-value ' + (cls || '') + '">' + escapeHtml(value) + '</div>' + (detail ? '<div class="card-subtitle">' + detail + '</div>' : '') + '</div>';
  }
  function empty(icon, title, text) {
    return '<div class="empty"><span class="empty-icon">' + icon + '</span><strong>' + escapeHtml(title) + '</strong><p>' + escapeHtml(text) + '</p></div>';
  }
  function dashboardHealth(d) {
    if (d.expectedBalance < 0) return { title: 'Atenção ao saldo previsto', text: 'O mês está projetado para fechar negativo. Revise despesas, assinaturas e parcelas antes do vencimento.', cls: 'red' };
    if (d.currentBalance < 0) return { title: 'Saldo atual no vermelho', text: 'Os itens já pagos deixam o mês negativo por enquanto. Confira receitas pendentes e vencimentos próximos.', cls: 'red' };
    return { title: 'Mês sob controle', text: 'O saldo previsto está positivo. Continue acompanhando transações, parcelas e assinaturas para evitar surpresas.', cls: 'green' };
  }
  function expenseCategoryName(item) {
    if (item.module.indexOf('Transações · ') === 0) return item.module.split(' · ')[1] || 'Outros';
    if (item.module.indexOf('Assinaturas') === 0) return 'Assinaturas';
    if (item.module.indexOf('Empréstimos') === 0) return 'Empréstimos';
    return 'Outros';
  }
  function movementCategoryName(item) {
    if (!item) return 'Outros';
    if (item.module.indexOf('Transações · ') === 0) return item.module.split(' · ')[1] || 'Outros';
    if (item.module.indexOf('Assinaturas · ') === 0) return item.module.split(' · ')[1] || 'Assinaturas';
    return item.module || 'Outros';
  }
  function movementCategoryColor(item) {
    var name = movementCategoryName(item);
    if (item.module.indexOf('Transações · ') === 0) return categoryColorByName(name, item.type === 'Receita' ? 'income' : 'expense');
    if (item.module.indexOf('Assinaturas') === 0) return categoryColorByName('Assinaturas','expense');
    if (item.module.indexOf('Empréstimos') === 0) return categoryColorByName(name,'loan');
    return categoryColorByName(name);
  }
  function categoryInline(module, name) {
    return '<span class="category-inline"><i style="background:' + categoryColor(module,name) + '"></i>' + escapeHtml(name) + '</span>';
  }
  function renderSpendingOverview(allMovements) {
    var grouped = {};
    allMovements.filter(function(item){ return item.type === 'Despesa'; }).forEach(function(item){
      var category = expenseCategoryName(item);
      if (!grouped[category]) grouped[category] = { amount:0, color:movementCategoryColor(item) };
      grouped[category].amount = roundMoney(Number(grouped[category].amount || 0) + Number(item.amount || 0));
    });
    var categories = Object.keys(grouped).map(function(name){ return {name:name,amount:grouped[name].amount,color:grouped[name].color}; }).sort(function(a,b){ return b.amount-a.amount; });
    if (categories.length > 6) {
      var other = sum(categories.slice(5), function(item){ return item.amount; });
      categories = categories.slice(0,5).concat([{name:'Outros',amount:roundMoney(other),color:categoryColorByName('Outras despesas','expense')}]);
    }
    var total = roundMoney(sum(categories,function(item){return item.amount;}));
    if (!total) return '<div class="empty spending-empty"><span class="empty-icon">◌</span><strong>Nenhuma despesa no mês</strong><p>Cadastre despesas, parcelas ou assinaturas para visualizar a distribuição.</p></div>';
    var cursor = 0;
    var segments = categories.map(function(item){
      var start = cursor;
      cursor += item.amount / total * 100;
      return item.color + ' ' + start.toFixed(2) + '% ' + cursor.toFixed(2) + '%';
    });
    var legend = categories.map(function(item){
      return '<div class="category-row"><span class="category-dot" style="background:' + item.color + '"></span><span>' + escapeHtml(item.name) + '</span><strong>' + money(item.amount) + '</strong></div>';
    }).join('');
    return '<div class="spending-layout"><div class="donut-wrap"><div class="donut-chart" style="background:conic-gradient(' + segments.join(',') + ')"></div><div class="donut-center"><small>Total de saídas</small><strong>' + money(total) + '</strong></div></div><div class="category-legend">' + legend + '</div></div>';
  }
  function renderRecentMovement(item) {
    var isIncome = item.type === 'Receita';
    return '<div class="recent-item"><span class="recent-icon" style="--movement-color:' + movementCategoryColor(item) + '">' + (isIncome ? '↗' : '↘') + '</span><div class="item-main"><div class="item-title">' + escapeHtml(item.title) + '</div><div class="item-subtitle">' + escapeHtml(item.module) + ' · ' + escapeHtml(item.date) + '</div></div><strong class="' + (isIncome ? 'green' : 'red') + '">' + (isIncome ? '+ ' : '− ') + money(item.amount) + '</strong></div>';
  }
  function institutionById(id) { return state.financialInstitutions.find(function(item){return item.id===id;})||null; }
  function institutionMarkText(institution) {
    if(!institution)return '🏛';
    var key=normalizeText(institution.shortName||institution.name),word=institution.shortName||institution.name;
    var marks={'nubank':'nu','itau':'Itaú','banco-do-brasil':'BB','bradesco':'B','banco-inter':'inter','inter':'inter','caixa':'CEF','santander':'S','sicoob':'Sicoob','sicredi':'Sicredi','banrisul':'Banrisul','original':'Original','safra':'Safra'};
    return marks[key]||word.slice(0,3).toUpperCase();
  }
  function institutionIconSource(institution) {
    var icon=String(institution&&institution.icon||'');
    if(!icon)return '';
    return icon.indexOf('data:image/')===0?icon:'assets/banks/'+icon;
  }
  function institutionIcon(institution,cls) {
    var label=institution?institution.shortName:'Instituição',mark=institutionMarkText(institution);
    var source=institutionIconSource(institution);
    if(source)return '<span class="bank-logo '+(cls||'')+'" style="--bank-color:'+escapeHtml(institution.color||'#B7FF3C')+'" aria-label="'+escapeHtml(label)+'"><img src="'+escapeHtml(source)+'" alt="'+escapeHtml(label)+'" onerror="this.parentNode.classList.add(\'icon-missing\')"><b>'+escapeHtml(mark)+'</b></span>';
    return '<span class="bank-logo bank-logo-text '+(cls||'')+'" style="--bank-color:'+escapeHtml(institution&&institution.color||'#B7FF3C')+'" aria-label="'+escapeHtml(label)+'">'+escapeHtml(mark)+'</span>';
  }
  function cardBrandAsset(brand) { var key=normalizeText(brand).replace(/\s+/g,'-'),map={'american-express':'amex','outro':'generic'};return 'assets/card-brands/'+(map[key]||key||'generic')+'.svg'; }
  function institutionCardMark(institution, cardName, cardBrand) {
    var fullName=String(cardName||'Cartão').trim()||'Cartão', brand=String(cardBrand||'Outro').toUpperCase();
    if(!institution)return '<div class="card-bank-mark"><span class="card-bank-symbol card-bank-symbol-text">RB</span><small>Crédito</small><strong>'+escapeHtml(fullName)+'</strong><em>'+escapeHtml(brand)+'</em></div>';
    var mark=institutionMarkText(institution);
    var source=institutionIconSource(institution);
    return '<div class="card-bank-mark" style="--bank-color:'+escapeHtml(institution.color)+'"><span class="card-bank-symbol">'+(source?'<img src="'+escapeHtml(source)+'" alt="'+escapeHtml(institution.shortName||institution.name)+'" onerror="this.parentNode.classList.add(\'icon-missing\')">':'')+'<b>'+escapeHtml(mark)+'</b></span><small>Crédito</small><strong>'+escapeHtml(fullName)+'</strong><em>'+escapeHtml(brand)+'</em></div>';
  }
  function accountTransactions(accountId) { return state.bankTransactions.filter(function(item){return item.bankAccountId===accountId;}); }
  function accountBalanceCents(account) { return Number(account.initialBalanceCents||0)+accountTransactions(account.id).reduce(function(total,item){return total+(item.direction==='credit'?1:-1)*Math.abs(Number(item.amountCents||0));},0); }
  function accountFinancials(account) { var balance=accountBalanceCents(account),limit=Math.max(0,Number(account.overdraftLimitCents||0)),used=Math.min(limit,Math.max(0,-balance)),available=Math.max(0,limit-used);return {balance:balance,limit:limit,used:used,available:available,total:Math.max(0,balance)+available}; }
  function savingsBoxBalanceCents(boxId) { var box=state.savingsBoxes.find(function(item){return item.id===boxId;});return Math.max(0,Number(box&&box.initialBalanceCents||0)+state.savingsMovements.filter(function(item){return item.boxId===boxId;}).reduce(function(total,item){return total+(item.direction==='out'?-1:1)*Math.abs(Number(item.amountCents||0));},0)); }
  function accountReservedCents(accountId) { return state.savingsBoxes.filter(function(box){return box.bankAccountId===accountId;}).reduce(function(total,box){return total+savingsBoxBalanceCents(box.id);},0); }
  function savingsSummary(){var total=state.savingsBoxes.reduce(function(sum,box){return sum+savingsBoxBalanceCents(box.id);},0),targets=state.savingsBoxes.reduce(function(sum,box){return sum+Number(box.targetCents||0);},0);return {total:total,targets:targets,active:state.savingsBoxes.filter(function(box){return box.status==='Ativa';}).length};}
  function investmentStats(){var items=state.investments.filter(function(item){return item.status!=='Encerrado';}),invested=items.reduce(function(sum,item){return sum+Number(item.investedCents||0);},0),current=items.reduce(function(sum,item){return sum+Number(item.currentValueCents||0);},0),received=state.investmentMovements.filter(function(item){return item.realized===true&&['Rendimento','Dividendo','Juros','Juros sobre capital','Amortização'].indexOf(item.type)>=0;}).reduce(function(sum,item){return sum+Number(item.amountCents||0);},0),month=state.investmentMovements.filter(function(item){return monthFromBR(item.date)===selectedMonth;}),contributions=month.filter(function(item){return ['Aplicação','Aporte','Compra'].indexOf(item.type)>=0;}).reduce(function(sum,item){return sum+Number(item.amountCents||0);},0),redemptions=month.filter(function(item){return ['Resgate parcial','Resgate total','Venda'].indexOf(item.type)>=0;}).reduce(function(sum,item){return sum+Number(item.amountCents||0);},0);return {items:items,invested:invested,current:current,result:current-invested,percent:invested?(current-invested)*100/invested:0,received:received,contributions:contributions,redemptions:redemptions};}
  function bankingSummary() { var active=state.bankAccounts.filter(function(item){return item.active!==false;}),balance=0,overdraft=0;active.forEach(function(account){var f=accountFinancials(account);balance+=f.balance;overdraft+=f.available;});return {accounts:active,balance:balance,overdraft:overdraft,investments:investmentStats().current,patrimony:balance}; }
  function patrimonySummary(){var banking=bankingSummary(),saved=savingsSummary(),investments=investmentStats(),debts=loanPortfolioStats(state.loans).pending*100,assets=banking.balance+investments.current;return {accounts:banking.balance,available:banking.balance-saved.total,reserved:saved.total,invested:investments.current,other:0,debts:debts,total:assets,net:assets-debts};}
  function updatePatrimonySnapshot(){if(!state||!Array.isArray(state.patrimonySnapshots))return;var date=todayBR(),summary=patrimonySummary(),existing=state.patrimonySnapshots.find(function(item){return item.date===date;});var snapshot={date:date,totalCents:summary.total,netCents:summary.net,accountsCents:summary.accounts,investmentsCents:summary.invested};if(existing)Object.assign(existing,snapshot);else state.patrimonySnapshots.push(snapshot);if(state.patrimonySnapshots.length>730)state.patrimonySnapshots=state.patrimonySnapshots.slice(-730);}
  function renderAccountCard(account) { var institution=institutionById(account.financialInstitutionId),f=accountFinancials(account),reserved=accountReservedCents(account.id),available=f.balance-reserved,linked=state.cards.filter(function(card){return card.bankAccountId===account.id;}).length,linkedInvestments=state.investments.filter(function(item){return item.bankAccountId===account.id&&item.status!=='Encerrado';}).reduce(function(sum,item){return sum+Number(item.currentValueCents||0);},0);return '<article class="bank-account-card" style="--institution-color:'+(institution?escapeHtml(institution.color):'#B7FF3C')+'"><header>'+institutionIcon(institution,'large')+'<div><span>'+(institution?escapeHtml(institution.shortName):'Instituição não definida')+'</span><h3>'+escapeHtml(account.name)+'</h3></div>'+(account.isMain?'<span class="pill green">Principal</span>':'')+'</header><div class="account-balance"><span>Saldo bancário</span><strong class="'+(f.balance<0?'red':'green')+'">'+moneyFromCents(f.balance)+'</strong></div><div class="account-credit-grid account-reserve-grid"><span>Dinheiro guardado<strong class="yellow">'+moneyFromCents(reserved)+'</strong></span><span>Disponível para uso<strong class="'+(available<0?'red':'green')+'">'+moneyFromCents(available)+'</strong></span><span>Investimentos vinculados<strong>'+moneyFromCents(linkedInvestments)+'</strong></span></div><footer><span>'+linked+' cartão(ões) · '+state.savingsBoxes.filter(function(box){return box.bankAccountId===account.id;}).length+' caixinha(s)</span><div class="row"><button class="secondary-btn" data-action="account-details" data-id="'+account.id+'">Abrir</button><button class="secondary-btn" data-action="edit-account" data-id="'+account.id+'">Editar</button></div></footer></article>'; }
  function renderSavingsBox(box){var account=state.bankAccounts.find(function(item){return item.id===box.bankAccountId;}),current=savingsBoxBalanceCents(box.id),target=Number(box.targetCents||0),percent=target?Math.min(100,current*100/target):0;return '<article class="saving-box-card"><header><span class="saving-box-icon">'+escapeHtml(box.icon||'🐷')+'</span><div class="item-main"><strong>'+escapeHtml(box.name)+'</strong><small>'+escapeHtml(box.category)+' · '+escapeHtml(account?account.name:'Conta removida')+'</small></div><span class="pill '+(box.status==='Ativa'?'green':'yellow')+'">'+escapeHtml(box.status)+'</span></header><div class="saving-box-value"><span>Guardado</span><strong>'+moneyFromCents(current)+'</strong></div>'+(target?'<div class="goal-progress"><span style="width:'+percent+'%"></span></div><small>'+percent.toLocaleString('pt-BR',{maximumFractionDigits:1})+'% de '+moneyFromCents(target)+(box.targetDate?' · meta '+escapeHtml(box.targetDate):'')+'</small>':'<small>Sem meta definida</small>')+'<footer class="row"><button class="primary-btn" data-action="new-saving-movement" data-id="'+box.id+'">Movimentar</button><button class="secondary-btn" data-action="saving-history" data-id="'+box.id+'">Histórico</button><button class="secondary-btn" data-action="edit-saving-box" data-id="'+box.id+'">Editar</button><button class="danger-btn" data-action="delete-saving-box" data-id="'+box.id+'">Excluir</button></footer></article>';}
  function renderAccounts() { var summary=bankingSummary(),accounts=summary.accounts,saved=savingsSummary(),available=summary.balance-saved.total;return '<div class="toolbar"><div class="toolbar-left"><button class="secondary-btn" data-action="open-module-report" data-report-module="accounts">Relatório PDF</button><button class="secondary-btn" data-action="new-bank-transfer">↔ Transferir</button><button class="secondary-btn" data-action="new-bank-transaction">+ Movimentação</button><button class="success-btn" data-action="new-saving-box">+ Caixinha</button></div><div class="toolbar-right"><button class="primary-btn" data-action="new-bank-account">+ Nova conta</button></div></div><section class="grid grid-4 banking-kpis">'+metricCard('Saldo bancário',moneyFromCents(summary.balance),summary.balance>=0?'green':'red','Inclui o valor reservado')+metricCard('Dinheiro guardado',moneyFromCents(saved.total),'yellow','Não é receita nem despesa')+metricCard('Disponível para uso',moneyFromCents(available),available>=0?'green':'red','Saldo − caixinhas')+metricCard('Contas ativas',String(accounts.length),'muted')+'</section><section class="accounts-grid">'+(accounts.length?accounts.map(renderAccountCard).join(''):empty('🏛️','Nenhuma conta bancária','Cadastre sua primeira conta para começar a calcular saldos e patrimônio.'))+'</section><section class="card savings-section"><div class="card-header"><div><div class="card-title">Dinheiro guardado / Caixinhas</div><div class="card-subtitle">Reservas dentro do saldo bancário, sem duplicar patrimônio</div></div><button class="primary-btn" data-action="new-saving-box">+ Nova caixinha</button></div><div class="savings-grid">'+(state.savingsBoxes.length?state.savingsBoxes.map(renderSavingsBox).join(''):empty('🐷','Nenhuma caixinha','Crie objetivos para separar o dinheiro reservado do saldo disponível.'))+'</div></section>';
  }
  function renderAccountsManaged(){
    var inactiveCount=state.bankAccounts.filter(function(item){return item.active===false;}).length;
    var html=renderAccounts().replace('<div class="toolbar-right">','<div class="toolbar-right"><button class="secondary-btn" data-action="open-inactive-accounts">Contas inativas ('+inactiveCount+')</button>');
    state.bankAccounts.filter(function(item){return item.active!==false;}).forEach(function(account){var edit='<button class="secondary-btn" data-action="edit-account" data-id="'+account.id+'">Editar</button>';html=html.replace(edit,edit+'<button class="danger-btn" data-action="inactivate-account" data-id="'+account.id+'">Inativar</button>');});
    return html;
  }
  function investmentCategoryOptions(){var list=[];Object.keys(state.investmentCategories||{}).forEach(function(group){(state.investmentCategories[group]||[]).forEach(function(name){list.push({value:group+'|'+name,label:group+' · '+name});});});return list;}
  function investmentDistribution(items){var totals={};items.forEach(function(item){totals[item.category]=(totals[item.category]||0)+Number(item.currentValueCents||0);});var names=Object.keys(totals).filter(function(name){return totals[name]>0;}),total=names.reduce(function(sum,name){return sum+totals[name];},0),offset=0,segments=[],legend='';names.forEach(function(name,index){var pct=total?totals[name]*100/total:0,start=offset,end=offset+pct,color=categoryPaletteColor(index+2);segments.push(color+' '+start+'% '+end+'%');offset=end;legend+='<div><i style="background:'+color+'"></i><span>'+escapeHtml(name)+'</span><strong>'+pct.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%</strong></div>';});return names.length?'<div class="investment-distribution"><div class="donut-wrap"><div class="donut-chart" style="background:conic-gradient('+segments.join(',')+')"></div><div class="donut-center"><small>Carteira atual</small><strong>'+moneyFromCents(total)+'</strong></div></div><div class="category-legend">'+legend+'</div></div>':empty('📊','Sem distribuição','Cadastre investimentos para visualizar a carteira.');}
  function patrimonyEvolutionSvg(period){var days={'30 dias':30,'3 meses':92,'6 meses':184,'1 ano':366}[period],cutoff=days?new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()-days):null,rows=state.patrimonySnapshots.filter(function(item){return !cutoff||parseDateBR(item.date)>=cutoff;}).sort(function(a,b){return parseDateBR(a.date)-parseDateBR(b.date);}).slice(-60);if(rows.length<2)return empty('📈','Histórico em formação','Os snapshots patrimoniais serão registrados automaticamente ao salvar alterações.');var width=720,height=220,padX=38,padY=32,values=rows.map(function(item){return Number(item.netCents||0);}),min=Math.min.apply(null,values),max=Math.max.apply(null,values);if(max===min)max=min+1;var points=rows.map(function(item,index){var x=padX+index*(width-padX*2)/Math.max(1,rows.length-1),y=height-padY-(Number(item.netCents||0)-min)*(height-padY*2)/(max-min);return x.toFixed(1)+','+y.toFixed(1);}).join(' ');var labels=rows.map(function(item,index){if(rows.length>12&&index%Math.ceil(rows.length/12))return '';var x=padX+index*(width-padX*2)/Math.max(1,rows.length-1);return '<text x="'+x+'" y="'+(height-8)+'" text-anchor="middle">'+escapeHtml(item.date.slice(0,5))+'</text>';}).join('');return '<svg class="loan-evolution-chart" viewBox="0 0 '+width+' '+height+'"><line x1="'+padX+'" y1="'+(height-padY)+'" x2="'+(width-padX)+'" y2="'+(height-padY)+'" class="chart-axis"></line><polyline points="'+points+'" class="chart-line"></polyline><g class="chart-labels">'+labels+'</g></svg>';}
  function renderInvestmentCard(item){var institution=institutionById(item.financialInstitutionId),result=Number(item.currentValueCents||0)-Number(item.investedCents||0),percent=item.investedCents?result*100/item.investedCents:0,goal=Number(item.goalCents||0),goalPct=goal?Math.min(100,Number(item.currentValueCents||0)*100/goal):0;return '<article class="investment-card"><header>'+institutionIcon(institution,'large')+'<div class="item-main"><span>'+escapeHtml(item.category)+' · '+escapeHtml(item.subcategory)+'</span><h3>'+escapeHtml(item.name)+(item.ticker?' · '+escapeHtml(item.ticker):'')+'</h3></div><span class="pill '+(item.status==='Ativo'?'green':'yellow')+'">'+escapeHtml(item.status)+'</span></header><div class="investment-values"><span>Capital investido<strong>'+moneyFromCents(item.investedCents)+'</strong></span><span>Valor atual<strong>'+moneyFromCents(item.currentValueCents)+'</strong></span><span>Resultado<strong class="'+(result>=0?'green':'red')+'">'+moneyFromCents(result)+'</strong></span><span>Rentabilidade<strong class="'+(percent>=0?'green':'red')+'">'+percent.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%</strong></span></div>'+(item.quantity?'<small>'+Number(item.quantity).toLocaleString('pt-BR')+' unidade(s) · preço médio '+moneyFromCents(item.averagePriceCents)+'</small>':'')+(goal?'<div class="goal-progress"><span style="width:'+goalPct+'%"></span></div><small>Meta '+moneyFromCents(goal)+' · '+goalPct.toLocaleString('pt-BR',{maximumFractionDigits:1})+'% · faltam '+moneyFromCents(Math.max(0,goal-item.currentValueCents))+'</small>':'')+'<footer class="row"><button class="primary-btn" data-action="new-investment-movement" data-id="'+item.id+'">+ Movimentação</button><button class="secondary-btn" data-action="investment-history" data-id="'+item.id+'">Histórico</button><button class="secondary-btn" data-action="edit-investment" data-id="'+item.id+'">Editar</button><button class="danger-btn" data-action="delete-investment" data-id="'+item.id+'">Excluir</button></footer></article>';}
  function renderInvestments(){var stats=investmentStats(),options=viewOptions.investments,items=state.investments.filter(function(item){return (options.status==='Todos'||item.status===options.status)&&(options.category==='Todos'||item.category===options.category);}),categoryChoices=[{value:'Todos',label:'Todas as categorias'}].concat(Object.keys(state.investmentCategories).map(function(name){return {value:name,label:name};}));return '<div class="toolbar"><div class="toolbar-left"><button class="secondary-btn" data-action="open-module-report" data-report-module="investments">Relatório PDF</button><button class="secondary-btn" data-action="manage-investment-categories">Categorias</button></div><div class="toolbar-right"><button class="primary-btn" data-action="new-investment">+ Novo investimento</button></div></div><section class="grid grid-4">'+metricCard('Total investido',moneyFromCents(stats.invested),'yellow','Capital originalmente aplicado')+metricCard('Valor atual',moneyFromCents(stats.current),'green')+metricCard('Resultado',moneyFromCents(stats.result),stats.result>=0?'green':'red','Sem confundir aportes com lucro')+metricCard('Rentabilidade',stats.percent.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%',stats.percent>=0?'green':'red')+'</section><section class="grid grid-3" style="margin-top:16px">'+metricCard('Rendimentos recebidos',moneyFromCents(stats.received),'green')+metricCard('Aportes do mês',moneyFromCents(stats.contributions),'yellow')+metricCard('Resgates do mês',moneyFromCents(stats.redemptions),'muted')+'</section><div class="card" style="margin-top:16px">'+filterBar(filterSelect('investment-category-filter','Categoria',categoryChoices,options.category)+filterSelect('investment-status-filter','Status',[{value:'Todos',label:'Todos'},{value:'Ativo',label:'Ativos'},{value:'Vencido',label:'Vencidos'},{value:'Resgatado',label:'Resgatados'},{value:'Encerrado',label:'Encerrados'}],options.status))+'</div><div class="investment-layout"><section class="investments-grid">'+(items.length?items.map(renderInvestmentCard).join(''):empty('📈','Nenhum investimento','Cadastre aplicações para acompanhar capital, resultado e renda realizada.'))+'</section><section class="card"><div class="card-title">Distribuição da carteira</div><div class="card-subtitle">Por categoria de investimento</div>'+investmentDistribution(stats.items)+'</section></div>'+renderInvestmentMovementsPanel()+'<section class="card patrimony-history"><div class="card-title">Evolução do patrimônio</div><div class="card-subtitle">Snapshots automáticos das últimas alterações</div>'+patrimonyEvolutionSvg()+'</section>';}
  function renderInvestmentMovementsPanel(){var options=viewOptions.investments,types=['Todos','Aplicação','Aporte','Resgate parcial','Resgate total','Rendimento','Dividendo','Juros','Juros sobre capital','Amortização','Bonificação','Venda','Compra','Taxa','Imposto','Transferência entre investimentos','Ajuste manual'],rows=state.investmentMovements.filter(function(item){return options.movementType==='Todos'||item.type===options.movementType;}).sort(function(a,b){return parseDateBR(b.date)-parseDateBR(a.date);}).slice(0,30);return '<section class="card patrimony-history"><div class="card-header"><div><div class="card-title">Movimentações da carteira</div><div class="card-subtitle">Movimentações internas, rendimentos, compras e vendas</div></div></div>'+filterBar(filterSelect('investment-movement-filter','Tipo',types.map(function(type){return {value:type,label:type};}),options.movementType))+'<div class="bank-statement">'+(rows.length?rows.map(function(movement){var item=state.investments.find(function(current){return current.id===movement.investmentId;});return '<div class="statement-row"><span class="recent-icon">📈</span><div class="item-main"><strong>'+escapeHtml(movement.type)+' · '+escapeHtml(item?item.name:'Investimento removido')+'</strong><small>'+escapeHtml(movement.date)+' · '+escapeHtml(movement.internalType||'MOVIMENTO_INVESTIMENTO')+'</small></div><strong>'+moneyFromCents(movement.amountCents)+'</strong></div>';}).join(''):empty('📈','Nenhuma movimentação','Use os filtros ou registre uma movimentação.'))+'</div></section>';}
  function inactiveManager(kind){
    var accounts=kind==='accounts',items=(accounts?state.bankAccounts:state.cards).filter(function(item){return item.active===false;}),title=accounts?'Contas inativas':'Cartões inativos';
    var rows=items.map(function(item){var institution=institutionById(item.financialInstitutionId);return '<div class="inactive-item">'+institutionIcon(institution)+'<div class="item-main"><strong>'+escapeHtml(item.name)+'</strong><small>'+(institution?escapeHtml(institution.name):'Instituição não definida')+'</small></div><button class="primary-btn" data-action="'+(accounts?'reactivate-account':'reactivate-card')+'" data-id="'+item.id+'">Reativar</button></div>';}).join('');
    $('modal-root').innerHTML='<div class="modal-backdrop"><div class="modal inactive-manager-modal"><div class="modal-title-row"><div><h2>'+title+'</h2><p class="modal-desc">Consulte os itens ocultos e reative quando precisar.</p></div><button class="modal-close" data-action="close-modal">×</button></div><div class="inactive-list">'+(rows||empty(accounts?'🏛️':'💳','Nenhum item inativo','Os itens inativados aparecerão aqui.'))+'</div></div></div>';
  }
  function renderInvoices() { var rows=state.cards.filter(function(card){return card.active!==false;}).map(function(card){var total=cardInvoiceTotal(card.id,selectedMonth),payment=cardInvoicePayment(card.id,selectedMonth),paid=Number(payment&&payment.paidAmount||0),open=Math.max(0,total-paid),institution=institutionById(card.financialInstitutionId);return {card:card,total:total,paid:paid,open:open,institution:institution};});var openTotal=rows.reduce(function(sum,item){return sum+item.open;},0);return '<div class="toolbar"><div class="toolbar-left"><button class="secondary-btn" data-action="open-module-report" data-report-module="invoices">Relatório PDF</button></div></div><div class="grid grid-3">'+metricCard('Faturas abertas',money(openTotal),openTotal?'red':'green',monthTitle(selectedMonth))+metricCard('Cartões com fatura',String(rows.filter(function(item){return item.total>0;}).length),'yellow')+metricCard('Faturas pagas',money(rows.reduce(function(sum,item){return sum+item.paid;},0)),'green')+'</div><div class="card invoices-panel"><div class="card-header"><div><div class="card-title">Faturas de '+monthTitle(selectedMonth)+'</div><div class="card-subtitle">Compras, pagamentos e conta utilizada</div></div></div><div class="list">'+(rows.length?rows.map(function(item){var account=state.bankAccounts.find(function(a){return a.id===(cardInvoicePayment(item.card.id,selectedMonth)||{}).bankAccountId;});return '<div class="invoice-card-row">'+institutionIcon(item.institution)+'<div class="item-main"><div class="item-title">'+escapeHtml(item.card.name)+'</div><div class="item-subtitle">Vence dia '+escapeHtml(item.card.dueDay)+(account?' · paga por '+escapeHtml(account.name):'')+'</div></div><div><small>Fatura</small><strong>'+money(item.total)+'</strong></div><div><small>Em aberto</small><strong class="'+(item.open?'red':'green')+'">'+money(item.open)+'</strong></div><button class="success-btn" data-action="pay-invoice" data-id="'+item.card.id+'">Pagar</button></div>';}).join(''):empty('📄','Nenhuma fatura','Cadastre cartões e compras para acompanhar as faturas.'))+'</div></div>'; }

  function renderReports() {
    var reportModules=['dashboard','accounts','investments','entries','cards','invoices','salary','loans','subscriptions','home-expenses','categories','institutions','reports','settings','help'];
    var cards=reportModules.map(function(moduleId){
      var screen=screens.find(function(item){return item.id===moduleId;});
      var title=screen?(screen.pageTitle||screen.title):'Relatório';
      var subtitle=screen?screen.subtitle:'PDF completo';
      return '<article class="report-module-card"><div><span class="nav-icon">'+(screen?screen.icon:'📄')+'</span><h3>'+escapeHtml(title)+'</h3><p>'+escapeHtml(subtitle)+'</p></div><button class="secondary-btn" data-action="open-module-report" data-report-module="'+moduleId+'">Gerar PDF</button></article>';
    }).join('');
    return '<div class="reports-header card"><div><span class="pill yellow">CENTRAL DE RELATÓRIOS</span><div class="card-title">PDFs por módulo</div><p class="card-subtitle">Gere relatórios completos da competência selecionada usando a mesma identidade visual do aplicativo.</p></div><button class="lime-btn" data-action="open-module-report" data-report-module="dashboard">Relatório completo</button></div><section class="reports-grid">'+cards+'</section>';
  }

  function renderDashboard() {
    var d = dashboard(selectedMonth);
    var banking=bankingSummary();
    var patrimony=patrimonySummary();
    var dashboardActiveCards=state.cards.filter(function(card){return card.active!==false;});
    var dashboardCardTransactions = state.cardTransactions.filter(function(t){ return dashboardActiveCards.some(function(card){return card.id===t.cardId;})&&cardTransactionIsBilledIn(t, selectedMonth); });
    var dashboardCardTotals = cardSummary(dashboardActiveCards, selectedMonth, dashboardCardTransactions);
    var health = dashboardHealth(d);
    var dashboardOptions = viewOptions.dashboard;
    var allMovements = monthlyMovements(selectedMonth);
    var dashboardCategoryChoices = categoryFilterOptions(allMovements.map(movementCategoryName));
    if (!dashboardCategoryChoices.some(function(option){ return option.value === dashboardOptions.category; })) dashboardOptions.category = 'Todos';
    var movements = allMovements.filter(function(item){
      return (dashboardOptions.type === 'Todos' || item.type === dashboardOptions.type) &&
        (dashboardOptions.category === 'Todos' || movementCategoryName(item) === dashboardOptions.category);
    });
    movements = sortRecords(movements, dashboardOptions.sort, {
      name:function(item){ return item.title; },
      date:function(item){ return parseDateBR(item.date); },
      amount:function(item){ return Number(item.amount || 0); }
    });
    var pending = movements.filter(function(item){ return item.status === 'Previsto'; }).slice(0, 6);
    var pendingHtml = pending.length ? pending.map(renderMovementItem).join('') : empty('✅', 'Nada pendente', 'Não há movimentações previstas em aberto neste mês.');
    var movementsHtml = movements.length ? movements.slice(0, 10).map(renderMovementItem).join('') : empty('🧾', 'Nenhuma movimentação', 'Cadastre salário, transações, empréstimos ou assinaturas para esta competência.');
    var dueLoans = state.loans.map(function(l){ return { loan: l, next: nextLoanInstallment(l) }; }).filter(function(x){ return x.next; }).slice(0, 5);
    var loanHtml = dueLoans.length ? dueLoans.map(function(x){
      return '<div class="item"><div class="item-main"><div class="item-title">' + escapeHtml(x.loan.name) + '</div><div class="item-subtitle">Parcela ' + x.next.number + ' vence em ' + x.next.dueDate + '</div></div><strong class="' + (x.loan.direction === 'Peguei emprestado' ? 'red' : 'green') + '">' + money(x.next.amount) + '</strong></div>';
    }).join('') : '<div class="item"><span class="muted">Nenhuma parcela em aberto cadastrada.</span></div>';
    var recent = sortRecords(allMovements, 'date-desc', { date:function(item){ return parseDateBR(item.date); }, name:function(item){ return item.title; } }).slice(0,5);
    var recentHtml = recent.length ? recent.map(renderRecentMovement).join('') : empty('↔','Nenhuma movimentação recente','Os lançamentos aparecerão aqui.');
    var sharedDashboardHtml = '';
    return ''+
      '<section class="financial-vision card"><div class="card-header"><div><div class="card-title">Resumo patrimonial</div><div class="card-subtitle">Contas, reservas e investimentos sem duplicidade</div></div><div class="row"><button class="secondary-btn" data-screen="accounts">Ver contas</button><button class="secondary-btn" data-screen="investments">Ver investimentos</button></div></div><div class="financial-vision-grid patrimony-grid"><div><span>Patrimônio total</span><strong class="'+(patrimony.total<0?'red':'green')+'">'+moneyFromCents(patrimony.total)+'</strong><small>Contas + investimentos + outros ativos</small></div><div><span>Disponível</span><strong>'+moneyFromCents(patrimony.available)+'</strong><small>Saldo bancário menos reservas</small></div><div><span>Reservado</span><strong class="yellow">'+moneyFromCents(patrimony.reserved)+'</strong><small>Já incluído no saldo das contas</small></div><div><span>Investido</span><strong class="green">'+moneyFromCents(patrimony.invested)+'</strong><small>Valor atual da carteira</small></div><div><span>Outros ativos</span><strong>'+moneyFromCents(patrimony.other)+'</strong><small>Ativos fora de contas e investimentos</small></div><div><span>Dívidas</span><strong class="red">'+moneyFromCents(patrimony.debts)+'</strong><small>Passivos em aberto</small></div><div><span>Patrimônio líquido</span><strong class="'+(patrimony.net>=0?'green':'red')+'">'+moneyFromCents(patrimony.net)+'</strong><small>Ativos − passivos</small></div></div></section>'+
      '<div class="grid grid-5">' +
        metricCard('Saldo previsto', money(d.expectedBalance), d.expectedBalance >= 0 ? 'green' : 'red', 'Salário + receitas − despesas do mês') +
        metricCard('Salário líquido', money(d.salaryNet), d.salaryNet >= 0 ? 'green' : 'red', 'Proventos e descontos incluídos') +
        metricCard('Entradas previstas', money(d.expectedIncome), 'green', 'Além do salário') +
        metricCard('Receitas + salário', money(d.totalIncome), d.totalIncome >= 0 ? 'green' : 'red', 'Total previsto de entradas') +
        metricCard('Saídas previstas', money(d.expectedExpense), 'red', 'Transações, parcelas e assinaturas') +
      '</div>'+
      '<div class="dashboard-health"><span><strong>' + escapeHtml(health.title) + '</strong> · ' + escapeHtml(health.text) + '</span><span class="pill ' + (health.cls === 'green' ? 'green' : 'red') + '">' + monthTitle(selectedMonth) + '</span></div>' +
      '<div class="dashboard-primary-grid">' +
        '<div class="card"><div class="card-header"><div><div class="card-title">Movimento do mês</div><div class="card-subtitle">Distribuição real das despesas por categoria</div></div><div class="row"><span class="pill green">Entradas ' + money(d.expectedIncome + d.salaryNet) + '</span><span class="pill red">Saídas ' + money(d.expectedExpense) + '</span></div></div>' + renderSpendingOverview(allMovements) + '</div>' +
        '<div class="card"><div class="card-header"><div><div class="card-title">Movimentações recentes</div><div class="card-subtitle">Atividade do perfil ' + escapeHtml(getActiveProfile().name) + '</div></div><button class="secondary-btn compact-btn" data-screen="entries">Ver todas</button></div><div class="recent-list">' + recentHtml + '</div></div>' +
      '</div>'+
      '<div class="quick-actions-card card"><div><div class="card-title">Atalhos rápidos</div><div class="card-subtitle">Cadastre uma nova movimentação ou gere o relatório consolidado.</div></div><div class="row"><button class="lime-btn" data-action="new-entry">+ Nova transação</button><button class="secondary-btn" data-action="new-loan">Novo empréstimo</button><button class="secondary-btn" data-action="new-subscription">Assinatura</button><button class="secondary-btn" data-screen="salary">Salário</button><button class="secondary-btn" data-action="open-module-report" data-report-module="dashboard">Relatório completo</button></div></div>' +
      sharedDashboardHtml+
      '<div class="grid grid-3" style="margin-top:16px">' +
        metricCard('Parcelas a pagar', money(d.loanBorrowedOpen), 'red') +
        metricCard('Parcelas a receber', money(d.loanLentOpen), 'green') +
        metricCard('Assinaturas do mês', money(d.subscriptionsDue), 'yellow', d.activeSubscriptions + ' ativa(s)') +
      '</div>'+
      '<div class="grid grid-3" style="margin-top:16px">' +
        metricCard('Limite total dos cartões', money(dashboardCardTotals.totalLimit), 'yellow') +
        metricCard('Disponível nos cartões', money(dashboardCardTotals.availableLimit), dashboardCardTotals.availableLimit >= 0 ? 'green' : 'red') +
        metricCard('Faturas dos cartões', money(dashboardCardTotals.invoiceTotal), 'yellow') +
      '</div>'+
      '<div class="card" style="margin-top:16px"><div class="card-header"><div><div class="card-title">Movimentações consolidadas</div><div class="card-subtitle">Tudo o que foi lançado nos módulos desta competência, exceto cartões</div></div></div>' + filterBar(
        filterSelect('dashboard-type-filter','Mostrar',[{value:'Todos',label:'Todas as movimentações'},{value:'Receita',label:'Somente entradas'},{value:'Despesa',label:'Somente saídas'}],dashboardOptions.type) +
        filterSelect('dashboard-category-filter','Categoria',dashboardCategoryChoices,dashboardOptions.category) +
        filterSelect('dashboard-sort','Ordenar por',[{value:'date-asc',label:'Data: mais antiga'},{value:'date-desc',label:'Data: mais recente'},{value:'amount-desc',label:'Maior valor'},{value:'amount-asc',label:'Menor valor'},{value:'name-asc',label:'Nome: A–Z'},{value:'name-desc',label:'Nome: Z–A'}],dashboardOptions.sort)
      ) + '<div class="list">' + movementsHtml + '</div></div>' +
      '<div class="grid grid-2" style="margin-top:16px">' +
        '<div class="card"><div class="card-header"><div><div class="card-title">Pendências do período</div><div class="card-subtitle">Movimentações previstas ainda não pagas</div></div><button class="secondary-btn" data-screen="entries">Ver transações</button></div><div class="list">' + pendingHtml + '</div></div>' +
        '<div class="card"><div class="card-header"><div><div class="card-title">Próximas parcelas</div><div class="card-subtitle">Empréstimos cadastrados</div></div><button class="secondary-btn" data-screen="loans">Ver</button></div><div class="list">' + loanHtml + '</div></div>' +
      '</div>';
  }

  function renderMovementItem(item) {
    var amountCls = item.type === 'Receita' ? 'green' : 'red';
    var statusCls = item.status === 'Pago' || item.status === 'Calculado' ? 'green' : 'yellow';
    var signal = item.type === 'Receita' ? '+ ' : '− ';
    return '<div class="item"><div class="item-main"><div class="item-title">' + escapeHtml(item.title) + '</div><div class="item-subtitle">' + escapeHtml(item.module) + ' · ' + escapeHtml(item.date) + ' · <span class="' + statusCls + '">' + escapeHtml(item.status) + '</span></div></div><strong class="' + amountCls + '">' + signal + money(item.amount) + '</strong></div>';
  }

  function renderEntryItem(e) {
    var amountCls = e.type === 'Receita' ? 'green' : 'red';
    var statusCls = e.status === 'Pago' ? 'green' : 'yellow';
    return '<div class="item"><div class="item-main"><div class="item-title">' + escapeHtml(e.title) + '</div><div class="item-subtitle">' + categoryInline(e.type === 'Receita' ? 'income' : 'expense',e.category) + ' · ' + escapeHtml(e.date) + ' · <span class="' + statusCls + '">' + escapeHtml(e.status) + '</span>' + escapeHtml(recurrenceSummary(e)) + '</div></div><div class="row"><strong class="' + amountCls + '">' + money(e.amount) + '</strong><button class="secondary-btn" data-action="toggle-entry" data-id="' + e.id + '">' + (e.status === 'Pago' ? 'Estornar' : 'Baixar') + '</button><button class="secondary-btn" data-action="edit-entry" data-id="' + e.id + '">Editar</button><button class="danger-btn" data-action="delete-entry" data-id="' + e.id + '">Excluir</button></div></div>';
  }
  function renderSharedEntryItem(e) {
    var amountCls=e.type==='Receita'?'green':'red', signal=e.type==='Receita'?'+ ':'− ', statusCls=e.status==='Pago'?'green':'yellow';
    return '<div class="item shared-entry-item"><div class="item-main"><div class="item-title">'+escapeHtml(e.title)+'</div><div class="item-subtitle"><span class="pill muted">Perfil '+escapeHtml(e.sharedProfileName)+'</span> · '+escapeHtml(e.category)+' · '+escapeHtml(e.date)+' · <span class="'+statusCls+'">'+escapeHtml(e.status)+'</span></div></div><strong class="'+amountCls+'">'+signal+money(e.amount)+'</strong></div>';
  }
  function renderEntries() {
    var options = viewOptions.entries;
    var entryCategoryChoices = categoryFilterOptions(
      state.categories.income.concat(state.categories.expense).concat(entriesForMonth(selectedMonth).map(function(entry){ return entry.category; }))
    );
    if (!entryCategoryChoices.some(function(option){ return option.value === options.category; })) options.category = 'Todos';
    var list = entriesForMonth(selectedMonth).filter(function(e){
      var q = normalizeText(searchText);
      return (!q || normalizeText(e.title + ' ' + e.category + ' ' + e.notes).indexOf(q) >= 0) &&
        (options.type === 'Todos' || e.type === options.type) &&
        (options.status === 'Todos' || e.status === options.status) &&
        (options.category === 'Todos' || e.category === options.category);
    });
    list = sortRecords(list, options.sort, {
      name:function(entry){ return entry.title; },
      date:function(entry){ return parseDateBR(entry.date); },
      amount:function(entry){ return Number(entry.amount || 0); },
      category:function(entry){ return entry.category; }
    });
    var sharedList=[];
    return '<div class="toolbar"><div class="toolbar-left"><input class="search" id="search-box" placeholder="Pesquisar transação..." value="' + escapeHtml(searchText) + '"></div><div class="toolbar-right"><button class="secondary-btn" data-action="open-module-report" data-report-module="entries">Relatório PDF</button><button class="primary-btn" data-action="new-entry">+ Nova transação</button></div></div>'+ filterBar(
      filterSelect('entries-type-filter','Tipo',[{value:'Todos',label:'Receitas e despesas'},{value:'Receita',label:'Receitas'},{value:'Despesa',label:'Despesas'}],options.type) +
      filterSelect('entries-status-filter','Situação',[{value:'Todos',label:'Todas'},{value:'Previsto',label:'Previstas'},{value:'Pago',label:'Pagas'}],options.status) +
      filterSelect('entries-category-filter','Categoria',entryCategoryChoices,options.category) +
      filterSelect('entries-sort','Ordenar por',[{value:'date-asc',label:'Data: mais antiga'},{value:'date-desc',label:'Data: mais recente'},{value:'amount-desc',label:'Maior valor'},{value:'amount-asc',label:'Menor valor'},{value:'name-asc',label:'Nome: A–Z'},{value:'category-asc',label:'Categoria: A–Z'}],options.sort)
    ) +
      '<div class="card"><div class="list">' + (list.length ? list.map(renderEntryItem).join('') : empty('🧾','Nenhuma transação','Cadastre receitas ou despesas para este mês.')) + '</div></div>'+(sharedList.length?'<div class="card shared-movements-card"><div class="card-header"><div><div class="card-title">Movimentações de outros perfis</div><div class="card-subtitle">Acesso compartilhado em modo somente leitura</div></div></div><div class="list">'+sharedList.map(renderSharedEntryItem).join('')+'</div></div>':'');
  }

  function cardColorClass(name) {
    var n = normalizeText(name);
    if (n.indexOf('roxo') >= 0) return 'roxo';
    if (n.indexOf('azul') >= 0) return 'azul';
    if (n.indexOf('verde') >= 0) return 'verde';
    if (n.indexOf('vermelho') >= 0) return 'vermelho';
    return '';
  }
  function normalizeHexColor(value, fallback) {
    var color=String(value||'').trim();
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : fallback;
  }
  function cardColorValue(card) {
    var legacy={preto:'#15151B',roxo:'#8B2BC7',azul:'#1D8FD1',verde:'#0F766E',vermelho:'#9F2D2D'};
    return normalizeHexColor(card&&card.color,legacy[normalizeText(card&&card.colorName)]||'#15151B');
  }
  function cardBrandIcon(brand) {
    var name=String(brand||'Outro'),key=normalizeText(name).replace(/\s+/g,'-');
    var map={'american-express':'amex','outro':'generic'};
    var file=(map[key]||key||'generic')+'.svg';
    return '<span class="card-brand-icon" aria-label="'+escapeHtml(name)+'"><img src="assets/card-brands/'+escapeHtml(file)+'" alt="'+escapeHtml(name)+'" onerror="this.parentNode.classList.add(\'icon-missing\')"><b>'+escapeHtml(name)+'</b></span>';
  }
  function renderCards() {
    var options = viewOptions.cards;
    var cards = state.cards.filter(function(c){
      if(c.active===false)return false;
      var open = Math.max(0, cardInvoiceTotal(c.id, selectedMonth) - Number((cardInvoicePayment(c.id, selectedMonth) || {}).paidAmount || 0));
      return options.status === 'Todos' || (options.status === 'Em aberto' ? open > 0 : open <= 0);
    });
    cards = sortRecords(cards, options.sort, {
      name:function(c){ return c.name; },
      invoice:function(c){ return cardInvoiceTotal(c.id, selectedMonth); },
      limit:function(c){ return Number(c.limit || 0); },
      available:function(c){ return cardAvailableLimit(c, selectedMonth); },
      due:function(c){ return Number(c.dueDay || 0); }
    });
    var cardsHtml = cards.length ? cards.map(function(c){
      var total = cardInvoiceTotal(c.id, selectedMonth);
      var paid = cardInvoicePayment(c.id, selectedMonth);
      var paidAmount = paid ? Number(paid.paidAmount || 0) : 0;
      var open = Math.max(0, total - paidAmount);
      var available = cardAvailableLimit(c, selectedMonth);
      var visualColor=cardColorValue(c);
      var institution=institutionById(c.financialInstitutionId),account=state.bankAccounts.find(function(item){return item.id===c.bankAccountId;});
      return '<div class="card"><div class="card-visual custom-color" style="--card-color:'+(institution?escapeHtml(institution.color):escapeHtml(visualColor))+'"><div class="card-visual-head">'+institutionCardMark(institution,c.name,c.cardBrand||c.brandName)+'<span class="card-brand-badge">'+cardBrandIcon(c.cardBrand||c.brandName)+'</span></div><div class="card-number-dots">•••• •••• •••• '+escapeHtml(c.lastFourDigits || c.lastDigits || '0000')+'</div><div class="card-visual-foot"><span>'+(account?'Conta '+escapeHtml(account.name):'Sem conta vinculada')+'</span><span>Fecha dia '+escapeHtml(c.closingDay)+' · vence '+escapeHtml(c.dueDay)+' · melhor compra dia '+cardBestPurchaseDay(c)+'</span></div></div><div class="grid grid-4" style="margin-top:12px">' + metricCard('Limite total', money(c.limit), 'muted') + metricCard('Fatura', money(total), 'yellow') + metricCard('Utilizado', money(Math.max(0,Number(c.limit||0)-available)), 'red') + metricCard('Disponível', money(available), available >= 0 ? 'green' : 'red') + '</div><div class="row wrap" style="margin-top:12px"><button class="yellow-btn" data-action="new-card-transaction" data-card="' + c.id + '">Compra</button><button class="success-btn" data-action="pay-invoice" data-id="' + c.id + '">Pagar fatura</button><button class="secondary-btn" data-action="edit-card" data-id="' + c.id + '">Editar</button><button class="danger-btn" data-action="delete-card" data-id="' + c.id + '">Excluir</button></div></div>';
    }).join('') : empty('💳','Nenhum cartão','Cadastre um cartão para controlar compras e faturas.');
    var monthTransactions = state.cardTransactions.filter(function(t){
      return state.cards.some(function(card){return card.id===t.cardId&&card.active!==false;}) && cardTransactionIsBilledIn(t, selectedMonth) &&
        (options.purchaseCard === 'Todos' || t.cardId === options.purchaseCard) &&
        (options.purchaseCategory === 'Todos' || t.category === options.purchaseCategory);
    });
    monthTransactions = sortRecords(monthTransactions, options.purchaseSort, {
      name:function(t){ return t.title; },
      amount:function(t){ return cardBilledAmount(t); },
      date:function(t){ return parseDateBR(t.date); }
    });
    var transHtml = monthTransactions.length ? monthTransactions.map(function(t){
      var card = state.cards.find(function(c){ return c.id === t.cardId; });
      return '<div class="invoice-line"><div><strong>' + escapeHtml(t.title) + '</strong><div class="item-subtitle">' + escapeHtml(card ? card.name : 'Cartão removido') + ' · ' + categoryInline('card',t.category) + ' · ' + escapeHtml(t.date) + (Number(t.installments || 1) > 1 ? ' · ' + t.installments + 'x' : '') + '</div></div><div class="row"><strong class="red">' + money(cardBilledAmount(t)) + '</strong><button class="secondary-btn" data-action="edit-card-transaction" data-id="' + t.id + '">Editar</button><button class="danger-btn" data-action="delete-card-transaction" data-id="' + t.id + '">Excluir</button></div></div>';
    }).join('') : '<div class="item"><span class="muted">Nenhuma compra faturada neste mês.</span></div>';
    var summary = cardSummary(cards, selectedMonth, monthTransactions);
    var summaryHtml = '<div class="card card-summary" style="margin-bottom:16px"><div class="card-header"><div><div class="card-title">Resumo consolidado de ' + monthTitle(selectedMonth) + '</div><div class="card-subtitle">Totais dos cartões e compras apresentados pelos filtros atuais</div></div></div><div class="grid grid-4">' +
      metricCard('Cartões exibidos', String(summary.cardCount), 'muted') +
      metricCard('Limite total', money(summary.totalLimit), 'yellow') +
      metricCard('Limite comprometido', money(summary.committedLimit), summary.committedLimit > summary.totalLimit ? 'red' : 'yellow') +
      metricCard('Limite disponível', money(summary.availableLimit), summary.availableLimit >= 0 ? 'green' : 'red') +
      metricCard('Faturas do mês', money(summary.invoiceTotal), 'yellow') +
      metricCard('Valores pagos', money(summary.paidTotal), 'green') +
      metricCard('Valores em aberto', money(summary.openTotal), summary.openTotal > 0 ? 'red' : 'green') +
      metricCard('Compras exibidas', summary.purchaseCount + ' · ' + money(summary.purchaseTotal), 'muted') +
    '</div></div>';
    var cardChoices = [{value:'Todos',label:'Todos os cartões'}].concat(state.cards.filter(function(c){return c.active!==false;}).map(function(c){ return {value:c.id,label:c.name}; }));
    var cardCategoryChoices = categoryFilterOptions(state.categories.card.concat(state.cardTransactions.map(function(transaction){ return transaction.category; })));
    if (!cardCategoryChoices.some(function(option){ return option.value === options.purchaseCategory; })) options.purchaseCategory = 'Todos';
    return summaryHtml + '<div class="toolbar"><div class="toolbar-left"><button class="secondary-btn" data-action="open-module-report" data-report-module="cards">Relatório PDF</button><button class="primary-btn" data-action="new-card">+ Novo cartão</button><button class="yellow-btn" data-action="new-card-transaction">+ Nova compra</button></div></div>' + filterBar(
      filterSelect('cards-status-filter','Situação da fatura',[{value:'Todos',label:'Todas as situações'},{value:'Em aberto',label:'Com valor em aberto'},{value:'Quitados',label:'Sem valor em aberto'}],options.status) +
      filterSelect('cards-sort','Ordenar cartões',[{value:'name-asc',label:'Nome: A–Z'},{value:'name-desc',label:'Nome: Z–A'},{value:'limit-desc',label:'Maior limite total'},{value:'limit-asc',label:'Menor limite total'},{value:'invoice-desc',label:'Maior fatura'},{value:'invoice-asc',label:'Menor fatura'},{value:'available-desc',label:'Maior limite disponível'},{value:'due-asc',label:'Vencimento mais próximo'}],options.sort)
    ) + '<div class="grid grid-2">' + cardsHtml + '</div><div class="card" style="margin-top:16px"><div class="card-header"><div><div class="card-title">Compras na fatura de ' + monthTitle(selectedMonth) + '</div><div class="card-subtitle">Parcelas e recorrências que caem no mês</div></div></div>' + filterBar(
      filterSelect('cards-purchase-card-filter','Cartão',cardChoices,options.purchaseCard) +
      filterSelect('cards-purchase-category-filter','Categoria',cardCategoryChoices,options.purchaseCategory) +
      filterSelect('cards-purchase-sort','Ordenar compras',[{value:'date-desc',label:'Data: mais recente'},{value:'date-asc',label:'Data: mais antiga'},{value:'amount-desc',label:'Maior valor'},{value:'amount-asc',label:'Menor valor'},{value:'name-asc',label:'Nome: A–Z'},{value:'name-desc',label:'Nome: Z–A'}],options.purchaseSort)
    ) + transHtml + '</div>';
  }

  function renderCardsManaged(){
    var inactiveCount=state.cards.filter(function(item){return item.active===false;}).length;
    var html=renderCards();
    html=html.replace('<button class="primary-btn" data-action="new-card">+ Novo cartão</button>','<button class="primary-btn" data-action="new-card">+ Novo cartão</button><button class="secondary-btn" data-action="open-inactive-cards">Cartões inativos ('+inactiveCount+')</button>');
    state.cards.filter(function(item){return item.active!==false;}).forEach(function(card){var edit='<button class="secondary-btn" data-action="edit-card" data-id="'+card.id+'">Editar</button>';html=html.replace(edit,edit+'<button class="danger-btn" data-action="inactivate-card" data-id="'+card.id+'">Inativar</button>');});
    return html;
  }

  function renderSalary() {
    var t = salaryTotals(selectedMonth), r = t.record;
    var options = viewOptions.salary;
    var salaryItems = (r.items || []).filter(function(item){ return options.type === 'Todos' || item.type === options.type; });
    salaryItems = sortRecords(salaryItems, options.sort, {
      name:function(item){ return item.name; },
      amount:function(item){ return salaryItemAmount(item, r.grossSalary); },
      type:function(item){ return item.type; }
    });
    var itemsHtml = salaryItems.length ? salaryItems.map(function(i){
      var amount = salaryItemAmount(i, r.grossSalary);
      var installmentNumber = salaryItemIsLoan(i) ? salaryLoanInstallmentNumber(i, selectedMonth) : 0;
      var paidMonths = i.paidMonths || [];
      var validity = salaryItemIsLoan(i) ? ' · parcela ' + installmentNumber + '/' + salaryLoanInstallmentCount(i) + ' · início: ' + monthTitle(i.startMonth) + (paidMonths.indexOf(selectedMonth) >= 0 ? ' · paga' : ' · em aberto') : (i.fixedMonthly ? ' · fixo mensal' : '');
      return '<div class="item"><div class="item-main"><div class="item-title">' + escapeHtml(i.name) + '</div><div class="item-subtitle">' + escapeHtml(i.type) + ' · ' + escapeHtml(i.valueMode) + (i.valueMode === 'Percentual' ? ': ' + i.value + '%' : '') + validity + '</div></div><div class="row"><strong class="' + (i.type === 'Recebimento' ? 'green' : 'red') + '">' + money(amount) + '</strong>' + (salaryItemIsLoan(i) ? '<button class="secondary-btn" data-action="salary-loan-details" data-id="' + i.id + '">Parcelas</button>' : '') + '<button class="secondary-btn" data-action="edit-salary-item" data-id="' + i.id + '">Editar</button><button class="danger-btn" data-action="delete-salary-item" data-id="' + i.id + '">Excluir</button></div></div>';
    }).join('') : empty('💵','Nenhum item','Cadastre proventos ou descontos do salário.');
    return '<div class="grid grid-5">' + metricCard('Salário bruto', money(r.grossSalary), 'yellow') + metricCard('Proventos', money(t.earnings), 'green') + metricCard('Descontos', money(t.deductions), 'red') + metricCard('Empréstimos CLT', money(t.loanDeductions), 'red') + metricCard('Líquido', money(t.net), t.net >= 0 ? 'green' : 'red') + '</div><div class="toolbar" style="margin-top:16px"><div class="toolbar-left"><button class="secondary-btn" data-action="open-module-report" data-report-module="salary">Relatório PDF</button><button class="primary-btn" data-action="set-salary">Definir salário</button><button class="success-btn" data-action="new-salary-item">+ Provento, desconto ou empréstimo</button></div></div>' + filterBar(
      filterSelect('salary-type-filter','Mostrar',[{value:'Todos',label:'Todos os itens'},{value:'Recebimento',label:'Somente recebimentos'},{value:'Desconto',label:'Somente descontos'},{value:'Empréstimo CLT',label:'Somente empréstimos CLT'}],options.type) +
      filterSelect('salary-sort','Ordenar por',[{value:'name-asc',label:'Nome: A–Z'},{value:'name-desc',label:'Nome: Z–A'},{value:'amount-desc',label:'Maior valor'},{value:'amount-asc',label:'Menor valor'},{value:'type-asc',label:'Tipo'}],options.sort)
    ) + '<div class="card"><div class="list">' + itemsHtml + '</div></div>';
  }

  function loanPortfolioStats(loans) {
    loans = loans || [];
    var totalDebt = roundMoney(sum(loans, loanTotalDebt));
    var totalPaid = roundMoney(sum(loans, loanTotalPaid));
    var pending = roundMoney(Math.max(0, totalDebt - totalPaid));
    var paidContracts = loans.filter(function(loan){ return !loanRepeatsIndefinitely(loan) && loanReportRemaining(loan) <= 0; }).length;
    return { totalDebt:totalDebt, totalPaid:totalPaid, pending:pending, recoveredPercent:totalDebt > 0 ? Math.min(100, Math.round(totalPaid / totalDebt * 1000) / 10) : 0, totalContracts:loans.length, pendingContracts:loans.length-paidContracts, paidContracts:paidContracts };
  }
  function loanEvolutionPoints(loans) {
    var events=[];
    (loans || []).forEach(function(loan){
      events.push({key:monthFromBR(loan.createdDate || loan.firstDueDate),delta:loanBaseDebt(loan)});
      (loan.adjustments || []).forEach(function(adjustment){events.push({key:monthFromBR(adjustment.date),delta:Number(adjustment.amount||0)});});
      (loan.payments || []).forEach(function(payment){events.push({key:monthFromBR(payment.paidDate),delta:-(payment.amount===undefined?Number(loan.installmentAmount||0):Number(payment.amount||0))});});
    });
    var byMonth={};
    events.forEach(function(event){byMonth[event.key]=roundMoney(Number(byMonth[event.key]||0)+event.delta);});
    var balance=0;
    return Object.keys(byMonth).sort().map(function(key){balance=roundMoney(Math.max(0,balance+byMonth[key]));return {key:key,value:balance};});
  }
  function loanEvolutionSvg(points) {
    if (!points.length) return '<div class="report-empty">Sem movimentos para montar a evolução.</div>';
    var width=720,height=230,padX=46,padY=28;
    var maxValue=Math.max.apply(null,points.map(function(point){return point.value;}));
    if(maxValue<=0)maxValue=1;
    var coords=points.map(function(point,index){var x=points.length===1?width/2:padX+index*(width-padX*2)/(points.length-1);var y=height-padY-(point.value/maxValue)*(height-padY*2);return{x:x,y:y,point:point};});
    var line=coords.map(function(coord){return coord.x.toFixed(1)+','+coord.y.toFixed(1);}).join(' ');
    var dots=coords.map(function(coord){return '<circle cx="'+coord.x+'" cy="'+coord.y+'" r="5"></circle>';}).join('');
    var labels=coords.map(function(coord,index){if(points.length>6&&index!==0&&index!==points.length-1&&index%Math.ceil(points.length/5)!==0)return '';return '<text x="'+coord.x+'" y="'+(height-6)+'" text-anchor="middle">'+escapeHtml(monthTitle(coord.point.key).replace(' de ','/'))+'</text>';}).join('');
    return '<svg class="loan-evolution-chart" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Evolução do saldo pendente"><line x1="'+padX+'" y1="'+(height-padY)+'" x2="'+(width-padX)+'" y2="'+(height-padY)+'" class="chart-axis"></line><polyline points="'+line+'" class="chart-line"></polyline><g class="chart-dots">'+dots+'</g><g class="chart-labels">'+labels+'</g></svg>';
  }
  function loanReportHtml(kind) {
    kind=kind==='detalhado'?'detalhado':'sintetico';
    var loans=state.loans.slice(),stats=loanPortfolioStats(loans);
    var paidPercent=stats.totalDebt>0?Math.min(100,stats.totalPaid/stats.totalDebt*100):0;
    var distribution='conic-gradient(var(--lime) 0 '+paidPercent+'%, #ff6464 '+paidPercent+'% 100%)';
    var contractRows=loans.length?loans.map(function(loan){var progress=loanProgressPercent(loan);return '<div class="loan-report-row"><div><strong>'+escapeHtml(loan.name)+'</strong><small>'+escapeHtml(loan.direction)+' · '+escapeHtml(loan.createdDate||loan.firstDueDate)+'</small></div><div class="report-row-progress"><span>'+progress.toLocaleString('pt-BR')+'%</span><div class="loan-progress-track"><span style="width:'+progress+'%"></span></div></div><strong>'+money(loanReportRemaining(loan))+'</strong></div>';}).join(''):'<div class="report-empty">Nenhum empréstimo cadastrado.</div>';
    var detailed='';
    if(kind==='detalhado')detailed=loans.map(function(loan){var movements=loanMovementHistory(loan).map(function(movement){return '<tr><td>'+escapeHtml(movement.date)+'</td><td>'+escapeHtml(movement.type)+'</td><td>'+escapeHtml(movement.notes)+'</td><td class="'+(movement.direction==='payment'?'green':'red')+'">'+(movement.direction==='payment'?'− ':'+ ')+money(movement.amount)+'</td></tr>';}).join('');return '<section class="report-detail-contract"><h3>'+escapeHtml(loan.name)+'</h3><div class="report-detail-metrics"><span>Dívida <strong>'+money(loanTotalDebt(loan))+'</strong></span><span>Pago <strong>'+money(loanTotalPaid(loan))+'</strong></span><span>Restante <strong>'+money(loanReportRemaining(loan))+'</strong></span></div><table><thead><tr><th>Data</th><th>Movimento</th><th>Detalhe</th><th>Valor</th></tr></thead><tbody>'+movements+'</tbody></table></section>';}).join('');
    return '<div class="loan-report-sheet report-theme-'+reportTheme+'" id="loan-report-sheet" data-report-theme="'+reportTheme+'"><div class="report-brand"><div class="report-brand-identity"><img src="assets/rb_gestao_app_icon.png" alt="Símbolo RB Gestão"><div><strong class="report-app-name">RB Gestão Financeira</strong><small>CONTROLE FINANCEIRO PESSOAL</small></div></div><div class="report-brand-meta"><span>RELATÓRIO DE EMPRÉSTIMOS</span><strong>'+(kind==='detalhado'?'Detalhado':'Sintético')+'</strong><small>Perfil '+escapeHtml(getActiveProfile().name)+' · '+monthTitle(selectedMonth)+'</small></div></div><div class="report-kpis"><div><span>Saldo total pendente</span><strong class="red">'+money(stats.pending)+'</strong><small>'+stats.recoveredPercent.toLocaleString('pt-BR')+'% recuperado · '+money(stats.totalPaid)+'</small></div><div><span>Total das dívidas</span><strong>'+money(stats.totalDebt)+'</strong><small>'+stats.totalContracts+' contrato(s)</small></div><div><span>Contratos quitados</span><strong class="green">'+stats.paidContracts+'</strong><small>'+stats.pendingContracts+' pendente(s)</small></div></div><div class="report-visual-grid"><section><h3>Distribuição das dívidas</h3><div class="report-distribution"><div class="report-donut" style="background:'+distribution+'"><span>'+stats.recoveredPercent.toLocaleString('pt-BR')+'%</span></div><div class="report-legend"><span><i class="pending"></i>Pendentes <strong>'+stats.pendingContracts+'</strong></span><span><i class="paid"></i>Quitados <strong>'+stats.paidContracts+'</strong></span><span>Total <strong>'+stats.totalContracts+'</strong></span></div></div></section><section><h3>Evolução da dívida</h3>'+loanEvolutionSvg(loanEvolutionPoints(loans))+'</section></div><section class="report-contracts"><h3>Contratos e devedores</h3>'+contractRows+'</section>'+detailed+'<footer>Gerado em '+formatDateBR(new Date())+' · RB Gestão Financeira</footer></div>';
  }
  function openLoanReport(kind) {
    kind=kind==='detalhado'?'detalhado':'sintetico';
    $('modal-root').innerHTML='<div class="modal-backdrop report-backdrop"><div class="modal report-modal"><div class="report-popup-toolbar"><div><strong>Visualização do relatório</strong><small>O relatório acompanha o tema atual do aplicativo.</small></div><div class="row wrap"><button class="'+(kind==='sintetico'?'lime-btn':'secondary-btn')+'" data-action="open-loan-report" data-kind="sintetico">Sintético</button><button class="'+(kind==='detalhado'?'lime-btn':'secondary-btn')+'" data-action="open-loan-report" data-kind="detalhado">Detalhado</button><button class="secondary-btn" data-action="print-loan-report" data-kind="'+kind+'">Imprimir / Salvar PDF</button><button class="danger-btn" data-action="close-modal">Fechar</button></div></div>'+loanReportHtml(kind)+'</div></div>';
  }
  function printLoanReport() {
    root.scrollTo(0, 0);
    var reportModal = document.querySelector('.report-modal');
    if (reportModal) reportModal.scrollTop = 0;
    document.body.classList.add('printing-loan-report');
    document.body.classList.toggle('printing-report-dark', reportTheme === 'dark');
    root.print();
    setTimeout(function(){document.body.classList.remove('printing-loan-report','printing-report-dark');},500);
  }

  function reportTable(headers, rows) {
    if (!rows.length) return '<div class="report-empty">Nenhum registro para esta competência.</div>';
    return '<div class="module-report-table-wrap"><table class="module-report-table"><thead><tr>' + headers.map(function(header){ return '<th>' + escapeHtml(header) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function(row){ return '<tr>' + row.map(function(cell){ return '<td>' + cell + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function reportSection(title, text, body) {
    return '<section class="module-report-section"><h3>' + escapeHtml(title) + '</h3>' + (text ? '<p>' + escapeHtml(text) + '</p>' : '') + body + '</section>';
  }
  function moduleReportHtml(moduleId) {
    var moduleNames={dashboard:'Relatório completo',accounts:'Relatório de contas',investments:'Relatório de investimentos',entries:'Relatório de transações',cards:'Relatório de cartões',invoices:'Relatório de faturas',salary:'Relatório de salário',subscriptions:'Relatório de assinaturas','home-expenses':'Relatório de gastos da casa',categories:'Relatório de categorias',reports:'Central de relatórios',settings:'Relatório de configurações',help:'Guia do sistema'};
    var title=moduleNames[moduleId] || 'Relatório';
    if(moduleId==='institutions')title='Relatório de instituições';
    var d=dashboard(selectedMonth), movements=monthlyMovements(selectedMonth), cardTransactions=state.cardTransactions.filter(function(t){return cardTransactionIsBilledIn(t,selectedMonth);}), cards=cardSummary(state.cards,selectedMonth,cardTransactions), salary=salaryTotals(selectedMonth), loanStats=loanPortfolioStats(state.loans), body='', kpis=[];
    var entryRows=entriesForMonth(selectedMonth).map(function(item){return [escapeHtml(item.title),escapeHtml(item.category),escapeHtml(item.date),escapeHtml(item.status),'<strong class="'+(item.type==='Receita'?'green':'red')+'">'+(item.type==='Receita'?'+ ':'− ')+money(item.amount)+'</strong>'];});
    if(moduleId==='dashboard') {
      kpis=[['Saldo previsto',money(d.expectedBalance),d.expectedBalance>=0?'green':'red'],['Salário líquido',money(d.salaryNet),'green'],['Entradas previstas',money(d.expectedIncome),'green'],['Receitas + salário',money(d.totalIncome),d.totalIncome>=0?'green':'red'],['Saídas previstas',money(d.expectedExpense),'red']];
      body=reportSection('Resumo por módulo','Valores da competência selecionada.', '<div class="module-report-summary">'+[['Salário',money(d.salaryNet),'green'],['Transações',money(d.expectedIncome-d.expectedExpense),d.expectedIncome>=d.expectedExpense?'green':'red'],['Cartões - faturas',money(cards.invoiceTotal),'yellow'],['Empréstimos - saldo pendente',money(loanStats.pending),'red'],['Assinaturas do mês',money(d.subscriptionsDue),'yellow'],['Categorias cadastradas',String(Object.keys(state.categories).reduce(function(total,key){return total+(state.categories[key]||[]).length;},0)),'muted']].map(function(item){return '<div><span>'+item[0]+'</span><strong class="'+item[2]+'">'+item[1]+'</strong></div>';}).join('')+'</div>')+
        reportSection('Movimentações da competência','Salário, transações, empréstimos e assinaturas; cartões ficam somente no resumo informativo.',reportTable(['Descrição','Origem','Data','Situação','Valor'],movements.map(function(item){return [escapeHtml(item.title),escapeHtml(item.module),escapeHtml(item.date),escapeHtml(item.status),'<strong class="'+(item.type==='Receita'?'green':'red')+'">'+(item.type==='Receita'?'+ ':'− ')+money(item.amount)+'</strong>'];})))+
        reportSection('Cartões','Totais informativos, fora do cálculo do saldo previsto.',reportTable(['Cartão','Limite total','Fatura','Disponível'],state.cards.map(function(card){return [escapeHtml(card.name),money(card.limit),money(cardInvoiceTotal(card.id,selectedMonth)),'<strong class="'+(cardAvailableLimit(card,selectedMonth)>=0?'green':'red')+'">'+money(cardAvailableLimit(card,selectedMonth))+'</strong>'];})));
    } else if(moduleId==='entries') {
      kpis=[['Receitas',money(sum(entriesForMonth(selectedMonth).filter(function(item){return item.type==='Receita';}),function(item){return item.amount;})),'green'],['Despesas',money(sum(entriesForMonth(selectedMonth).filter(function(item){return item.type==='Despesa';}),function(item){return item.amount;})),'red'],['Lançamentos',String(entriesForMonth(selectedMonth).length),'muted']];
      body=reportSection('Transações','Receitas e despesas registradas na competência.',reportTable(['Descrição','Categoria','Data','Situação','Valor'],entryRows));
    } else if(moduleId==='accounts') {
      var banking=bankingSummary(),bankTransactions=state.bankTransactions.filter(function(item){return monthFromBR(item.transactionDate)===selectedMonth;}).sort(function(a,b){return parseDateBR(a.transactionDate)-parseDateBR(b.transactionDate);});
      var savedReport=savingsSummary();kpis=[['Saldo bancário',moneyFromCents(banking.balance),banking.balance>=0?'green':'red'],['Dinheiro guardado',moneyFromCents(savedReport.total),'yellow'],['Disponível',moneyFromCents(banking.balance-savedReport.total),banking.balance-savedReport.total>=0?'green':'red'],['Contas ativas',String(banking.accounts.length),'muted']];
      body=reportSection('Contas bancárias','O dinheiro guardado já está incluído no saldo e não é somado novamente ao patrimônio.',reportTable(['Instituição','Conta','Saldo bancário','Guardado','Disponível'],banking.accounts.map(function(account){var institution=institutionById(account.financialInstitutionId),financial=accountFinancials(account),reserved=accountReservedCents(account.id);return [escapeHtml(institution?institution.shortName:'Não definida'),escapeHtml(account.name),'<strong class="'+(financial.balance>=0?'green':'red')+'">'+moneyFromCents(financial.balance)+'</strong>',moneyFromCents(reserved),moneyFromCents(financial.balance-reserved)];})))+
        reportSection('Caixinhas','Reservas internas vinculadas às contas.',reportTable(['Caixinha','Conta','Categoria','Status','Atual','Meta'],state.savingsBoxes.map(function(box){var account=state.bankAccounts.find(function(item){return item.id===box.bankAccountId;});return [escapeHtml(box.name),escapeHtml(account?account.name:'Conta removida'),escapeHtml(box.category),escapeHtml(box.status),moneyFromCents(savingsBoxBalanceCents(box.id)),box.targetCents?moneyFromCents(box.targetCents):'Sem meta'];})))+
        reportSection('Extrato da competência','Movimentações bancárias registradas no mês selecionado.',reportTable(['Data','Conta','Tipo','Descrição','Valor'],bankTransactions.map(function(item){var account=state.bankAccounts.find(function(current){return current.id===item.bankAccountId;});return [escapeHtml(item.transactionDate),escapeHtml(account?account.name:'Conta removida'),escapeHtml(item.type),escapeHtml(item.description||''),'<strong class="'+(item.direction==='credit'?'green':'red')+'">'+(item.direction==='credit'?'+ ':'− ')+moneyFromCents(item.amountCents)+'</strong>'];})));
    } else if(moduleId==='investments') {
      var investmentReport=investmentStats();kpis=[['Capital investido',moneyFromCents(investmentReport.invested),'yellow'],['Valor atual',moneyFromCents(investmentReport.current),'green'],['Resultado',moneyFromCents(investmentReport.result),investmentReport.result>=0?'green':'red'],['Rentabilidade',investmentReport.percent.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%',investmentReport.percent>=0?'green':'red']];
      body=reportSection('Posição atual da carteira','Aportes e resgates de capital são movimentos internos.',reportTable(['Investimento','Categoria','Ativo/Ticker','Aplicado','Atual','Resultado'],state.investments.map(function(item){var result=Number(item.currentValueCents||0)-Number(item.investedCents||0);return [escapeHtml(item.name),escapeHtml(item.category+' · '+item.subcategory),escapeHtml(item.ticker||item.asset||'—'),moneyFromCents(item.investedCents),moneyFromCents(item.currentValueCents),'<strong class="'+(result>=0?'green':'red')+'">'+moneyFromCents(result)+'</strong>'];})))+reportSection('Movimentações da carteira','Histórico de aportes, resgates, compras, vendas e rendimentos.',reportTable(['Data','Investimento','Tipo','Valor','Taxas/Impostos','Lucro realizado'],state.investmentMovements.map(function(movement){var investment=state.investments.find(function(item){return item.id===movement.investmentId;});return [escapeHtml(movement.date),escapeHtml(investment?investment.name:'Investimento removido'),escapeHtml(movement.type),moneyFromCents(movement.amountCents),moneyFromCents(Number(movement.feesCents||0)+Number(movement.taxCents||0)),moneyFromCents(movement.realizedProfitCents)];})))+reportSection('Histórico patrimonial','Snapshots automáticos do patrimônio líquido.',reportTable(['Data','Contas','Investimentos','Patrimônio total','Patrimônio líquido'],state.patrimonySnapshots.map(function(snapshot){return [escapeHtml(snapshot.date),moneyFromCents(snapshot.accountsCents),moneyFromCents(snapshot.investmentsCents),moneyFromCents(snapshot.totalCents),moneyFromCents(snapshot.netCents)];})));
    } else if(moduleId==='cards') {
      kpis=[['Limite total',money(cards.totalLimit),'yellow'],['Disponível',money(cards.availableLimit),cards.availableLimit>=0?'green':'red'],['Faturas',money(cards.invoiceTotal),'yellow']];
      body=reportSection('Resumo dos cartões','Os valores são informativos e não entram no saldo previsto.',reportTable(['Cartão','Limite','Fatura','Em aberto','Disponível'],state.cards.map(function(card){var invoice=cardInvoiceTotal(card.id,selectedMonth), payment=cardInvoicePayment(card.id,selectedMonth), open=Math.max(0,invoice-Number(payment&&payment.paidAmount||0)); return [escapeHtml(card.name),money(card.limit),money(invoice),money(open),'<strong class="'+(cardAvailableLimit(card,selectedMonth)>=0?'green':'red')+'">'+money(cardAvailableLimit(card,selectedMonth))+'</strong>'];})))+reportSection('Compras da fatura','Compras que incidem nesta competência.',reportTable(['Descrição','Cartão','Categoria','Data','Valor'],cardTransactions.map(function(item){var card=state.cards.find(function(current){return current.id===item.cardId;});return [escapeHtml(item.title),escapeHtml(card?card.name:'Cartão removido'),escapeHtml(item.category),escapeHtml(item.date),money(cardBilledAmount(item))];})));
    } else if(moduleId==='invoices') {
      var invoiceRows=state.cards.map(function(card){var invoice=cardInvoiceTotal(card.id,selectedMonth),payment=cardInvoicePayment(card.id,selectedMonth),paid=Number(payment&&payment.paidAmount||0),open=Math.max(0,invoice-paid),account=state.bankAccounts.find(function(current){return current.id===(payment&&payment.bankAccountId);});return {card:card,invoice:invoice,payment:payment,paid:paid,open:open,account:account};});
      kpis=[['Faturas abertas',money(sum(invoiceRows,function(row){return row.open;})),sum(invoiceRows,function(row){return row.open;})>0?'red':'green'],['Pagas',money(sum(invoiceRows,function(row){return row.paid;})),'green'],['Cartões',String(state.cards.length),'yellow']];
      body=reportSection('Faturas por cartão','Valores calculados pelas compras da competência selecionada.',reportTable(['Cartão','Vencimento','Fatura','Pago','Em aberto','Conta utilizada'],invoiceRows.map(function(row){return [escapeHtml(row.card.name),'Dia '+escapeHtml(row.card.dueDay),money(row.invoice),money(row.paid),'<strong class="'+(row.open>0?'red':'green')+'">'+money(row.open)+'</strong>',escapeHtml(row.account?row.account.name:'Não informado')];})))+
        reportSection('Compras da competência','Compras que compõem as faturas deste mês.',reportTable(['Descrição','Cartão','Categoria','Data','Valor'],cardTransactions.map(function(item){var card=state.cards.find(function(current){return current.id===item.cardId;});return [escapeHtml(item.title),escapeHtml(card?card.name:'Cartão removido'),escapeHtml(item.category),escapeHtml(item.date),money(cardBilledAmount(item))];})));
    } else if(moduleId==='salary') {
      kpis=[['Bruto',money(salary.record.grossSalary),'yellow'],['Proventos',money(salary.earnings),'green'],['Descontos',money(salary.deductions+salary.loanDeductions),'red'],['Líquido',money(salary.net),salary.net>=0?'green':'red']];
      body=reportSection('Composição do salário','Salário vigente e itens aplicados nesta competência.',reportTable(['Item','Tipo','Modo','Valor'],(salary.record.items||[]).map(function(item){return [escapeHtml(item.name),escapeHtml(item.type),escapeHtml(item.valueMode),'<strong class="'+(item.type==='Recebimento'?'green':'red')+'">'+money(salaryItemAmount(item,salary.record.grossSalary))+'</strong>'];})));
    } else if(moduleId==='subscriptions') {
      var subscriptions=state.subscriptions.filter(function(item){return item.active!==false;});
      kpis=[['Ativas',String(subscriptions.length),'green'],['No mês',money(d.subscriptionsDue),'yellow'],['Equivalente mensal',money(sum(subscriptions,function(item){return subscriptionMonthlyEquivalent(item);})),'yellow']];
      body=reportSection('Assinaturas cadastradas','Serviços ativos e seus próximos vencimentos.',reportTable(['Serviço','Tipo','Ciclo','Próximo vencimento','Valor'],subscriptions.map(function(item){return [escapeHtml(item.name),escapeHtml(item.kind),escapeHtml(item.billingCycle),escapeHtml(nextSubscriptionDue(item)),money(item.amount)];})));
    } else if(moduleId==='home-expenses') {
      var home=homeExpensesData(), homeBills=home.bills.filter(function(bill){return homeBillType(bill)==='Fixa mensal' ? selectedMonth >= (bill.startMonth||monthFromBR(bill.dueDate)) : monthFromBR(bill.dueDate)===selectedMonth;}).sort(function(a,b){return a.title.localeCompare(b.title,'pt-BR');}), homeResidents=home.residents.slice().sort(function(a,b){return a.name.localeCompare(b.name,'pt-BR');}), homeDebts=home.residentDebts.filter(function(debt){return homeDebtVisibleInMonth(debt,selectedMonth);}).slice().sort(function(a,b){if(a.status!==b.status)return a.status==='Pendente'?-1:1;return parseDateBR(b.date)-parseDateBR(a.date);}),homeDebtPending=sum(homeDebts.filter(function(debt){return debt.status!=='Quitada';}),function(debt){return Number(debt.amount||0);}),homeTotals=homeSummary(), homeConfirmed=0, homeExpected=0;
      homeBills.forEach(function(bill){homeShares(bill).forEach(function(share){homeExpected+=share.amount;if(share.confirmed)homeConfirmed+=share.amount;});});
      kpis=[['Contas no mês',String(homeBills.length),'yellow'],['Total compartilhado',money(sum(homeBills,function(bill){return homeBillAmount(bill);})), 'yellow'],['Confirmado',money(homeConfirmed),homeConfirmed>=homeExpected&&homeExpected>0?'green':'yellow'],['Dívidas pendentes',money(homeDebtPending),homeDebtPending?'red':'green']];
      body=reportSection('Contas compartilhadas','Contas que vencem na competência selecionada.',reportTable(['Conta','Tipo','Categoria','Vencimento','Pago por','Total','Confirmações'],homeBills.map(function(bill){var shares=homeShares(bill),confirmed=shares.filter(function(share){return share.confirmed;}).length,payer=homeResident(homeBillPayerId(bill));return [escapeHtml(bill.title),escapeHtml(homeBillType(bill)),escapeHtml(bill.category),escapeHtml(homeBillDueDate(bill)),escapeHtml(payer?payer.name:'Não informado'),money(homeBillAmount(bill)),confirmed+'/'+shares.length];})))+
        reportSection('Resumo por morador','O saldo final compensa o que foi pago na casa com as dívidas diretas entre moradores.',reportTable(['Morador','Situação','Participação','Confirmado','Pago por ele(a)','Deve/recebe direto','Saldo final'],homeResidents.map(function(resident){var totals=homeTotals[resident.id]||{expected:0,confirmed:0,paid:0,debtOwed:0,debtReceivable:0,balance:0};return [escapeHtml(resident.name),resident.active===false?'Inativo':'Ativo',money(totals.expected),'<strong class="'+(totals.confirmed>=totals.expected&&totals.expected>0?'green':'yellow')+'">'+money(totals.confirmed)+'</strong>',money(totals.paid),money(totals.debtReceivable-totals.debtOwed),'<strong class="'+(totals.balance>=0?'green':'red')+'">'+(totals.balance>=0?'A receber ':'A pagar ')+money(Math.abs(totals.balance))+'</strong>'];})))+
        reportSection('Divisão por morador e conta','Ordenado por morador e, em seguida, pelo nome da conta.',reportTable(['Morador','Conta','Valor','Situação'],homeResidents.reduce(function(rows,resident){return rows.concat(homeBills.map(function(bill){var share=homeShares(bill).find(function(item){return item.residentId===resident.id;});return share?[escapeHtml(resident.name),escapeHtml(bill.title),money(share.amount),'<strong class="'+(share.confirmed?'green':'yellow')+'">'+(share.confirmed?'Confirmado':'Pendente')+'</strong>']:null;}).filter(Boolean));},[])))+
        reportSection('Acertos entre moradores','Dívidas diretas registradas separadamente das contas da casa e compensadas no saldo final.',reportTable(['Data','Devedor','Credor','Descrição','Vencimento','Valor','Situação'],homeDebts.map(function(debt){var debtor=homeResident(debt.debtorId),creditor=homeResident(debt.creditorId);return [escapeHtml(debt.date),escapeHtml(debtor?debtor.name:'Morador removido'),escapeHtml(creditor?creditor.name:'Morador removido'),escapeHtml(debt.description),escapeHtml(debt.dueDate),money(debt.amount),'<strong class="'+(debt.status==='Quitada'?'green':'yellow')+'">'+escapeHtml(debt.status)+'</strong>'];})))+
        reportSection('Histórico mensal das contas','Cada competência preserva o valor, o pagador e as confirmações daquele mês.',reportTable(['Conta','Competência','Valor','Pago por','Confirmações'],homeBills.reduce(function(rows,bill){var record=homeBillMonthRecord(bill,selectedMonth,false),payer=homeResident(homeBillPayerId(bill)),confirmed=Object.keys(homeBillConfirmations(bill)).filter(function(id){return homeBillConfirmations(bill)[id];}).length;rows.push([escapeHtml(bill.title),escapeHtml(monthTitle(selectedMonth)),money(homeBillAmount(bill)),escapeHtml(payer?payer.name:'Não informado'),confirmed+'/'+(bill.participantIds||[]).length+(record?'':' · pendente')]);return rows;},[])));
    } else if(moduleId==='categories') {
      var categoryRows=[], categoryGroupLabels={income:'Receitas',expense:'Despesas',card:'Cartões',salary:'Salário',loan:'Empréstimos'}; Object.keys(state.categories).forEach(function(group){(state.categories[group]||[]).forEach(function(name){categoryRows.push([escapeHtml(categoryGroupLabels[group]||group),'<span class="report-color" style="background:'+categoryColor(group,name)+'"></span>'+escapeHtml(name),escapeHtml(categoryColor(group,name))]);});});
      kpis=[['Grupos',String(Object.keys(state.categories).length),'muted'],['Categorias',String(categoryRows.length),'green'],['Cores exclusivas',String(new Set(categoryRows.map(function(row){return row[2];})).size),'yellow']];
      body=reportSection('Categorias e cores','Identificação visual aplicada às listas e gráficos.',reportTable(['Grupo','Categoria','Cor'],categoryRows));
    } else if(moduleId==='institutions') {
      var institutionRows=state.financialInstitutions.map(function(item){return [escapeHtml(item.name),escapeHtml(item.bankCode||'Sem código'),escapeHtml(item.color),String(state.bankAccounts.filter(function(account){return account.financialInstitutionId===item.id;}).length),String(state.cards.filter(function(card){return card.financialInstitutionId===item.id;}).length)];});
      kpis=[['Instituições',String(institutionRows.length),'green'],['Contas vinculadas',String(state.bankAccounts.length),'yellow'],['Cartões vinculados',String(state.cards.length),'muted']];
      body=reportSection('Instituições financeiras','Bancos, cores e vínculos cadastrados.',reportTable(['Instituição','Código','Cor','Contas','Cartões'],institutionRows));
    } else if(moduleId==='settings') {
      kpis=[['Tema',appTheme==='dark'?'Escuro':'Claro','muted'],['Abertura',appSettings.startMonth==='current'?'Mês atual':'Próximo mês','green'],['Backup',appSettings.autoBackupMode==='off'?'Desativado':'Configurado','yellow']];
      body=reportSection('Preferências do aplicativo','Configurações ativas, sem expor a pasta local ou dados sensíveis.',reportTable(['Preferência','Valor'],[['Tema do aplicativo',appTheme==='dark'?'Modo escuro':'Modo claro'],['Competência ao abrir',appSettings.startMonth==='current'?'Mês atual':'Próximo mês'],['Backup automático',appSettings.autoBackupMode],['Horário diário',appSettings.backupTime],['Cópias mantidas',String(appSettings.backupRetention)]]));
    } else if(moduleId==='reports') {
      kpis=[['Relatórios',String(screens.length-1),'green'],['Competência',monthTitle(selectedMonth),'yellow'],['Perfil',escapeHtml(getActiveProfile().name),'muted']];
      body=reportSection('Relatórios disponíveis','Módulos com emissão de PDF na competência selecionada.',reportTable(['Módulo','Descrição'],screens.filter(function(screen){return screen.id!=='reports';}).map(function(screen){return [escapeHtml(screen.pageTitle||screen.title),escapeHtml(screen.subtitle)];})));
    } else if(moduleId==='help') {
      kpis=[['Módulos',String(screens.length-1),'green'],['Competência',monthTitle(selectedMonth),'yellow'],['Perfil',escapeHtml(getActiveProfile().name),'muted']];
      body='<div class="module-report-help">'+renderHelp()+'</div>';
    }
    return '<div class="loan-report-sheet module-report-sheet report-theme-'+reportTheme+'" id="module-report-sheet" data-report-theme="'+reportTheme+'"><div class="report-brand"><div class="report-brand-identity"><img src="assets/rb_gestao_app_icon.png" alt="Símbolo RB Gestão"><div><strong class="report-app-name">RB Gestão Financeira</strong><small>CONTROLE FINANCEIRO PESSOAL</small></div></div><div class="report-brand-meta"><span>'+escapeHtml(title).toUpperCase()+'</span><strong>Completo</strong><small>Perfil '+escapeHtml(getActiveProfile().name)+' · '+monthTitle(selectedMonth)+'</small></div></div><div class="report-kpis">'+kpis.map(function(item){return '<div><span>'+item[0]+'</span><strong class="'+item[2]+'">'+item[1]+'</strong><small>Competência selecionada</small></div>';}).join('')+'</div>'+body+'<footer>Gerado em '+formatDateBR(new Date())+' · RB Gestão Financeira</footer></div>';
  }
  function openModuleReport(moduleId) {
    var name={dashboard:'Relatório completo do painel',accounts:'Relatório de contas',investments:'Relatório de investimentos',entries:'Relatório de transações',cards:'Relatório de cartões',invoices:'Relatório de faturas',salary:'Relatório de salário',subscriptions:'Relatório de assinaturas','home-expenses':'Relatório de gastos da casa',categories:'Relatório de categorias',reports:'Central de relatórios',settings:'Relatório de configurações',help:'Guia do sistema'}[moduleId]||'Relatório';
    $('modal-root').innerHTML='<div class="modal-backdrop report-backdrop"><div class="modal report-modal"><div class="report-popup-toolbar"><div><strong>'+name+'</strong><small>O relatório acompanha o tema atual do aplicativo.</small></div><div class="row wrap"><button class="secondary-btn" data-action="print-loan-report">Imprimir / Salvar PDF</button><button class="danger-btn" data-action="close-modal">Fechar</button></div></div>'+moduleReportHtml(moduleId)+'</div></div>';
  }

  function renderLoans() {
    var options = viewOptions.loans;
    var portfolio = loanPortfolioStats(state.loans);
    var loans = state.loans.filter(function(loan){
      var isPaid = loanIsBalanceOnly(loan) ? loanReportRemaining(loan) <= 0 : !nextLoanInstallment(loan);
      return (options.direction === 'Todos' || loan.direction === options.direction) &&
        (options.status === 'Todos' || (options.status === 'Quitados' ? isPaid : !isPaid)) &&
        (!searchText || normalizeText([loan.name,loan.direction,loan.notes].join(' ')).indexOf(normalizeText(searchText)) >= 0);
    });
    loans = sortRecords(loans, options.sort, {
      name:function(loan){ return loan.name; },
      amount:function(loan){ return loanOpenAmount(loan, selectedMonth); },
      installment:function(loan){ return Number(loan.installmentAmount || 0); },
      due:function(loan){ var next=nextLoanInstallment(loan); return next ? parseDateBR(next.dueDate) : new Date(8640000000000000); }
    });
    var html = loans.length ? loans.map(function(l){
      var sched = loanSchedule(l, selectedMonth);
      var paidCount = sched.filter(function(i){ return i.paid; }).length;
      var next = nextLoanInstallment(l);
      var directionCls = l.direction === 'Peguei emprestado' ? 'red' : 'green';
      var activeInstallmentCount = sched.length;
      var balanceOnly = loanIsBalanceOnly(l);
      var termLabel = balanceOnly ? 'Somente montante · sem parcelas' : (loanRepeatsIndefinitely(l) ? paidCount + ' paga(s) · sem data limite' : (l.openEnded ? 'Cobrança única · sem data limite' : paidCount + '/' + activeInstallmentCount + ' pagas'));
      var progress = loanProgressPercent(l);
      var middleMetric = balanceOnly ? metricCard('Formato', 'Sem parcelas', 'yellow') : metricCard('Parcela', money(l.installmentAmount), 'yellow');
      var lastMetric = balanceOnly ? metricCard('Saldo atual', money(loanReportRemaining(l)), loanReportRemaining(l) > 0 ? 'red' : 'green') : metricCard('Próxima', next ? next.dueDate : 'Quitado', next ? 'yellow' : 'green');
      var paymentButton = balanceOnly ? '<button class="success-btn" data-action="pay-loan-balance" data-id="' + l.id + '" ' + (loanReportRemaining(l) <= 0 ? 'disabled' : '') + '>Baixar saldo</button>' : '<button class="success-btn" data-action="pay-next-loan" data-id="' + l.id + '" ' + (!next ? 'disabled' : '') + '>Baixar parcela</button>';
      return '<div class="card loan-contract-card"><div class="card-header"><div class="loan-person"><span class="loan-person-avatar">' + escapeHtml((l.name || '?').charAt(0).toUpperCase()) + '</span><div><div class="card-title">' + escapeHtml(l.name) + '</div><div class="card-subtitle"><span class="pill ' + directionCls + '">' + escapeHtml(l.direction) + '</span> <span class="pill">' + termLabel + '</span></div></div></div><div class="loan-balance"><small>Saldo pendente</small><strong class="' + directionCls + '">' + money(loanReportRemaining(l)) + '</strong></div></div><div class="loan-contract-progress"><div><span>Pago ' + money(loanTotalPaid(l)) + '</span><strong>' + progress.toLocaleString('pt-BR') + '%</strong></div><div class="loan-progress-track"><span style="width:' + progress + '%"></span></div></div><div class="grid grid-3 loan-metrics">' + metricCard(balanceOnly ? 'Montante total' : 'Dívida total', money(loanTotalDebt(l)), 'muted') + middleMetric + lastMetric + '</div><div class="row wrap" style="margin-top:12px">' + paymentButton + '<button class="primary-btn" data-action="increase-loan" data-id="' + l.id + '">+ Aumentar dívida</button><button class="secondary-btn" data-action="loan-details" data-id="' + l.id + '">Detalhes</button><button class="secondary-btn" data-action="edit-loan" data-id="' + l.id + '">Editar</button><button class="danger-btn" data-action="delete-loan" data-id="' + l.id + '">Excluir</button></div></div>';
    }).join('') : empty('🏦','Nenhum empréstimo','Cadastre empréstimos recebidos ou feitos para terceiros.');
    return '<div class="loan-portfolio-summary"><div class="loan-summary-main"><span>Saldo total pendente</span><strong>' + money(portfolio.pending) + '</strong><small>' + portfolio.recoveredPercent.toLocaleString('pt-BR') + '% recuperado · ' + money(portfolio.totalPaid) + ' recebido/pago</small><div class="loan-progress-track"><span style="width:' + portfolio.recoveredPercent + '%"></span></div></div><div class="loan-summary-stat"><span>Dívida total</span><strong>' + money(portfolio.totalDebt) + '</strong></div><div class="loan-summary-stat"><span>Em aberto</span><strong class="red">' + portfolio.pendingContracts + '</strong></div><div class="loan-summary-stat"><span>Quitados</span><strong class="green">' + portfolio.paidContracts + '</strong></div></div><div class="toolbar"><div class="toolbar-left"><input class="search" id="search-box" value="' + escapeHtml(searchText) + '" placeholder="Buscar empréstimo ou devedor"><button class="primary-btn" data-action="new-loan">+ Novo empréstimo</button><button class="secondary-btn" data-action="open-loan-report" data-kind="sintetico">Relatório sintético</button><button class="secondary-btn" data-action="open-loan-report" data-kind="detalhado">Relatório detalhado</button></div></div>' + filterBar(
      filterSelect('loans-direction-filter','Direção',[{value:'Todos',label:'Todos os empréstimos'},{value:'Peguei emprestado',label:'Valores a pagar'},{value:'Emprestei para alguém',label:'Valores a receber'}],options.direction) +
      filterSelect('loans-status-filter','Situação',[{value:'Todos',label:'Todos'},{value:'Em aberto',label:'Em aberto'},{value:'Quitados',label:'Quitados'}],options.status) +
      filterSelect('loans-sort','Ordenar por',[{value:'name-asc',label:'Nome: A–Z'},{value:'name-desc',label:'Nome: Z–A'},{value:'amount-desc',label:'Maior saldo'},{value:'amount-asc',label:'Menor saldo'},{value:'installment-desc',label:'Maior parcela'},{value:'due-asc',label:'Próximo vencimento'}],options.sort)
    ) + '<div class="grid grid-2">' + html + '</div>';
  }

  function renderSubscriptions() {
    var options = viewOptions.subscriptions;
    var subscriptions = state.subscriptions.filter(function(sub){
      return (options.status === 'Todos' || (options.status === 'Ativas' ? sub.active !== false : sub.active === false)) &&
        (options.cycle === 'Todos' || sub.billingCycle === options.cycle);
    });
    subscriptions = sortRecords(subscriptions, options.sort, {
      name:function(sub){ return sub.name; },
      amount:function(sub){ return Number(sub.amount || 0); },
      due:function(sub){ return parseDateBR(nextSubscriptionDue(sub)); },
      cycle:function(sub){ return sub.billingCycle; }
    });
    var html = subscriptions.length ? subscriptions.map(function(s){
      var due = nextSubscriptionDue(s);
      return '<div class="card subscription-card"><div class="card-header"><div><div class="card-title">' + escapeHtml(s.name) + '</div><div class="card-subtitle"><span class="pill yellow">' + escapeHtml(s.kind) + '</span> <span class="pill ' + (s.active !== false ? 'green' : '') + '">' + (s.active !== false ? 'Ativa' : 'Pausada') + '</span></div></div><strong class="yellow subscription-amount">' + money(s.amount) + '</strong></div><div class="subscription-metrics">' + metricCard('Ciclo', s.billingCycle, 'muted') + metricCard('Equiv. mês', money(subscriptionMonthlyEquivalent(s)), 'yellow') + metricCard('Próximo venc.', due, 'green') + '</div><div class="row wrap" style="margin-top:12px"><button class="secondary-btn" data-action="toggle-subscription" data-id="' + s.id + '">' + (s.active !== false ? 'Pausar' : 'Ativar') + '</button><button class="secondary-btn" data-action="edit-subscription" data-id="' + s.id + '">Editar</button><button class="danger-btn" data-action="delete-subscription" data-id="' + s.id + '">Excluir</button></div></div>';
    }).join('') : empty('🔁','Nenhuma assinatura','Cadastre aplicativos, jogos, streaming e recorrências.');
    return '<div class="toolbar"><div class="toolbar-left"><button class="secondary-btn" data-action="open-module-report" data-report-module="subscriptions">Relatório PDF</button><button class="primary-btn" data-action="new-subscription">+ Nova assinatura</button></div></div>' + filterBar(
      filterSelect('subscriptions-status-filter','Situação',[{value:'Todos',label:'Ativas e pausadas'},{value:'Ativas',label:'Ativas'},{value:'Pausadas',label:'Pausadas'}],options.status) +
      filterSelect('subscriptions-cycle-filter','Ciclo',[{value:'Todos',label:'Todos os ciclos'},{value:'Mensal',label:'Mensal'},{value:'Trimestral',label:'Trimestral'},{value:'Anual',label:'Anual'}],options.cycle) +
      filterSelect('subscriptions-sort','Ordenar por',[{value:'name-asc',label:'Nome: A–Z'},{value:'name-desc',label:'Nome: Z–A'},{value:'amount-desc',label:'Maior valor'},{value:'amount-asc',label:'Menor valor'},{value:'due-asc',label:'Próximo vencimento'},{value:'cycle-asc',label:'Ciclo'}],options.sort)
    ) + '<div class="subscription-grid">' + html + '</div>';
  }

  function renderCategories() {
    var labels = { income:'Receitas', expense:'Despesas', card:'Cartão', salary:'Salário', loan:'Empréstimos' };
    var visibleModules = Object.keys(labels).filter(function(key){ return viewOptions.categories.module === 'Todos' || key === viewOptions.categories.module; });
    var html = visibleModules.map(function(k){
      var categories = sortRecords(state.categories[k], viewOptions.categories.sort, { name:function(name){ return name; } });
      var rows = categories.map(function(name){
        var color = categoryColor(k,name);
        return '<div class="item category-management-item"><span class="category-color-swatch" style="background:' + color + ';box-shadow:0 0 18px ' + color + '55"></span><div class="item-main"><div class="item-title">' + escapeHtml(name) + '</div><div class="item-subtitle">' + color + '</div></div><button class="secondary-btn" data-action="edit-category-color" data-module="' + k + '" data-name="' + escapeHtml(name) + '">Definir cor</button><button class="danger-btn" data-action="delete-category" data-module="' + k + '" data-name="' + escapeHtml(name) + '">Excluir</button></div>';
      }).join('');
      return '<div class="card"><div class="card-header"><div><div class="card-title">' + labels[k] + '</div><div class="card-subtitle">' + state.categories[k].length + ' categoria(s)</div></div><button class="primary-btn" data-action="new-category" data-module="' + k + '">Adicionar</button></div><div class="list">' + rows + '</div></div>';
    }).join('');
    var moduleChoices = [{value:'Todos',label:'Todos os grupos'}].concat(Object.keys(labels).map(function(key){ return {value:key,label:labels[key]}; }));
    return '<div class="toolbar"><div class="toolbar-left"><button class="secondary-btn" data-action="open-module-report" data-report-module="categories">Relatório PDF</button></div></div>' + filterBar(filterSelect('categories-module-filter','Grupo de categorias',moduleChoices,viewOptions.categories.module) + filterSelect('categories-sort','Ordenar categorias',[{value:'name-asc',label:'Nome: A–Z'},{value:'name-desc',label:'Nome: Z–A'}],viewOptions.categories.sort)) + '<div class="grid grid-2">' + html + '</div>';
  }

  function homeExpensesData() { return state.homeExpenses; }
  function homeResident(id) { return homeExpensesData().residents.find(function(item){ return item.id === id; }); }
  function homeCan(action) {
    var current = homeResident(homeExpensesData().currentResidentId);
    return !current || !current.permissions || current.permissions[action] !== false;
  }
  function homeBillMonthRecord(bill,key,create) {
    key=key||selectedMonth;bill.monthlyRecords=bill.monthlyRecords&&typeof bill.monthlyRecords==='object'?bill.monthlyRecords:{};
    if(!bill.monthlyRecords[key]&&create)bill.monthlyRecords[key]={amount:Number(bill.amount||0),payerId:String(bill.payerId||''),confirmations:{},paidDate:'',updatedAt:new Date().toISOString()};
    return bill.monthlyRecords[key]||null;
  }
  function homeBillAmount(bill,key) { var record=homeBillMonthRecord(bill,key,false);return record&&record.amount!=null?Number(record.amount||0):Number(bill.amount||0); }
  function homeBillPayerId(bill,key) { var record=homeBillMonthRecord(bill,key,false);return record&&record.payerId!=null?String(record.payerId):String(bill.payerId||''); }
  function homeBillConfirmations(bill,key) { var record=homeBillMonthRecord(bill,key,false);return record&&record.confirmations&&typeof record.confirmations==='object'?record.confirmations:{}; }
  function homeShares(bill) {
    var ids = (bill.participantIds || []).filter(function(id){ return homeResident(id); });
    if (!ids.length) return [];
    var cents = Math.round(homeBillAmount(bill) * 100), percentages=bill.participantPercentages||{}, totalPct=ids.reduce(function(sum,id){return sum+Number(percentages[id]||0);},0), confirmations=homeBillConfirmations(bill);
    if(totalPct<=0) totalPct=ids.length*100;
    return ids.map(function(id,index){ var pct=Number(percentages[id]||0); if(totalPct<=0)pct=100; return { residentId:id, percentage:pct, amount:Math.round(cents*pct/totalPct)/100, confirmed:Boolean(confirmations[id])}; });
  }
  function homeBillType(bill) { return bill && bill.billingType === 'Fixa mensal' ? 'Fixa mensal' : 'Variável'; }
  function homeBillDueDate(bill) { if(homeBillType(bill)!=='Fixa mensal')return bill.dueDate; var date=parseDateBR(bill.dueDate),parts=selectedMonth.split('-'),lastDay=new Date(Number(parts[0]),Number(parts[1]),0).getDate(),dueDay=Number(bill.dueDay||date.getDate()); return formatDateBR(new Date(Number(parts[0]),Number(parts[1])-1,Math.min(dueDay,lastDay))); }
  function homeSummary() {
    var result = {}; homeExpensesData().residents.forEach(function(resident){ result[resident.id] = { expected:0, confirmed:0, paid:0,debtOwed:0,debtReceivable:0,balance:0 }; });
    homeExpensesData().bills.filter(function(bill){ return homeBillType(bill)==='Fixa mensal' ? selectedMonth >= (bill.startMonth||monthFromBR(bill.dueDate)) : monthFromBR(bill.dueDate)===selectedMonth; }).forEach(function(bill){ homeShares(bill).forEach(function(share){ if(!result[share.residentId])return; result[share.residentId].expected += share.amount; if(share.confirmed)result[share.residentId].confirmed += share.amount; });var billRecord=homeBillMonthRecord(bill,selectedMonth,false),payerId=homeBillPayerId(bill);if(billRecord&&billRecord.paidDate&&result[payerId]) result[payerId].paid += homeBillAmount(bill); });
    homeExpensesData().residentDebts.forEach(function(debt){var settledBeforeOrInMonth=debt.status==='Quitada'&&debt.paidDate&&monthFromBR(debt.paidDate)<=selectedMonth;if(!homeDebtVisibleInMonth(debt,selectedMonth)||settledBeforeOrInMonth)return;var amount=Number(debt.amount||0);if(result[debt.debtorId])result[debt.debtorId].debtOwed+=amount;if(result[debt.creditorId])result[debt.creditorId].debtReceivable+=amount;});
    Object.keys(result).forEach(function(id){var totals=result[id];totals.balance=totals.paid-totals.expected+totals.debtReceivable-totals.debtOwed;});
    return result;
  }
  function residentDebtSummary() {
    var result={pending:0,settled:0,byResident:{}};
    homeExpensesData().residents.forEach(function(resident){result.byResident[resident.id]={owes:0,receives:0};});
    homeExpensesData().residentDebts.filter(function(debt){return homeDebtVisibleInMonth(debt,selectedMonth);}).forEach(function(debt){var amount=Number(debt.amount||0);if(debt.status==='Quitada')result.settled+=amount;else{result.pending+=amount;if(result.byResident[debt.debtorId])result.byResident[debt.debtorId].owes+=amount;if(result.byResident[debt.creditorId])result.byResident[debt.creditorId].receives+=amount;}});
    return result;
  }
  function homeDebt(id) { return homeExpensesData().residentDebts.find(function(item){return item.id===id;}); }
  function homeDebtVisibleInMonth(debt,month) { var paidMonth=debt.paidDate?monthFromBR(debt.paidDate):''; if(debt.status==='Quitada') return paidMonth===month; return debt.scheduleType==='Programada' ? monthFromBR(debt.dueDate)===month : monthFromBR(debt.date)<=month; }
  function renderResidentDebtCard(debt,allowed) {
    var debtor=homeResident(debt.debtorId),creditor=homeResident(debt.creditorId),settled=debt.status==='Quitada';
    if(debt.scheduleType==='Fixa') settled=false;
    return '<article class="card resident-debt-card '+(settled?'is-settled':'is-pending')+'"><div class="resident-debt-route"><div class="debt-person"><small>Devedor</small><strong>'+escapeHtml(debtor?debtor.name:'Morador removido')+'</strong></div><span class="debt-arrow" aria-hidden="true">→</span><div class="debt-person"><small>Credor</small><strong>'+escapeHtml(creditor?creditor.name:'Morador removido')+'</strong></div><strong class="resident-debt-value '+(settled?'green':'red')+'">'+money(debt.amount)+'</strong></div><div class="card-subtitle resident-debt-details">'+escapeHtml(debt.description)+' · '+(debt.scheduleType==='Programada'?'programada':'fixa')+' · lançado em '+escapeHtml(debt.date)+(debt.dueDate?' · vence em '+escapeHtml(debt.dueDate):'')+(settled&&debt.paidDate?' · quitado em '+escapeHtml(debt.paidDate):'')+'</div>'+(debt.notes?'<p class="resident-debt-notes">'+escapeHtml(debt.notes)+'</p>':'')+'<div class="row wrap resident-debt-actions"><span class="pill '+(settled?'green':'yellow')+'">'+(settled?'Quitada':'Pendente')+'</span>'+(allowed.edit?'<button class="'+(settled?'secondary-btn':'success-btn')+' compact-btn" data-action="toggle-home-debt" data-id="'+debt.id+'">'+(settled?'Reabrir':'Marcar como quitada')+'</button><button class="secondary-btn compact-btn" data-action="edit-home-debt" data-id="'+debt.id+'">Editar</button>':'')+(allowed.delete?'<button class="danger-btn compact-btn" data-action="delete-home-debt" data-id="'+debt.id+'">Excluir</button>':'')+'</div></article>';
  }
  function renderHomeExpenses() {
    var home=homeExpensesData(), residents=home.residents, active=residents.filter(function(item){return item.active!==false;}), summary=homeSummary(), allowed={view:homeCan('view'),create:homeCan('create'),edit:homeCan('edit'),delete:homeCan('delete')};
    if(!allowed.view) return '<div class="card">'+empty('🔒','Acesso restrito','O morador selecionado não tem permissão para visualizar os gastos da casa.')+'</div>';
    var residentOptions='<option value="">Administrador do perfil</option>'+residents.map(function(item){return '<option value="'+item.id+'" '+(home.currentResidentId===item.id?'selected':'')+'>'+escapeHtml(item.name)+(item.active===false?' (inativo)':'')+'</option>';}).join('');
    var residentCards=residents.length?residents.map(function(item){var totals=summary[item.id]||{expected:0,confirmed:0,paid:0,debtOwed:0,debtReceivable:0,balance:0},balanceLabel=totals.balance>0?'Saldo a receber':totals.balance<0?'Saldo a pagar':'Saldo acertado';return '<div class="card home-resident-card '+(item.active===false?'is-inactive':'')+'"><div class="card-header"><div><div class="card-title">'+escapeHtml(item.name)+'</div><div class="card-subtitle"><span class="pill '+(item.active===false?'red':'green')+'">'+(item.active===false?'Inativo':'Ativo')+'</span></div></div><div class="row">'+(allowed.edit?'<button class="secondary-btn" data-action="edit-home-resident" data-id="'+item.id+'">Editar</button><button class="secondary-btn" data-action="toggle-home-resident" data-id="'+item.id+'">'+(item.active===false?'Ativar':'Desativar')+'</button>':'')+(allowed.delete?'<button class="danger-btn" data-action="delete-home-resident" data-id="'+item.id+'">Excluir</button>':'')+'</div></div><div class="grid grid-4 home-mini-grid">'+metricCard('Participação do mês',money(totals.expected),'yellow')+metricCard('Pago por ele(a)',money(totals.paid),'muted')+metricCard('Deve / recebe direto',money(totals.debtReceivable-totals.debtOwed),totals.debtReceivable>=totals.debtOwed?'green':'red')+metricCard(balanceLabel,money(Math.abs(totals.balance)),totals.balance>=0?'green':'red')+'</div><div class="home-permissions">Competência '+escapeHtml(selectedMonth)+' · '+['view','create','edit','delete'].map(function(permission){return '<span>'+({view:'Visualizar',create:'Criar',edit:'Editar',delete:'Excluir'}[permission])+': '+(item.permissions&&item.permissions[permission]===false?'não':'sim')+'</span>';}).join(' · ')+'</div></div>';}).join(''):empty('👥','Nenhum morador','Cadastre os moradores para dividir as contas da casa.');
    var bills=home.bills.filter(function(bill){return homeBillType(bill)==='Fixa mensal' ? selectedMonth >= (bill.startMonth||monthFromBR(bill.dueDate)) : monthFromBR(bill.dueDate)===selectedMonth;}).sort(function(a,b){return parseDateBR(homeBillDueDate(a))-parseDateBR(homeBillDueDate(b));});
    var billCards=bills.length?bills.map(function(bill){var shares=homeShares(bill), payer=homeResident(homeBillPayerId(bill)), billRecord=homeBillMonthRecord(bill,selectedMonth,false), paid=Boolean(billRecord&&billRecord.paidDate), confirmed=shares.filter(function(item){return item.confirmed;}).length,currentAmount=homeBillAmount(bill);return '<div class="card home-bill-card"><div class="card-header"><div><div class="card-title">'+escapeHtml(bill.title)+'</div><div class="card-subtitle"><span class="pill '+(homeBillType(bill)==='Fixa mensal'?'green':'yellow')+'">'+homeBillType(bill)+'</span> '+escapeHtml(bill.category)+' · competência '+escapeHtml(selectedMonth)+' · vence em '+escapeHtml(homeBillDueDate(bill))+' · '+(paid?'pago por ':'pagador definido: ')+escapeHtml(payer?payer.name:'Não informado')+'</div></div><strong class="yellow">'+money(currentAmount)+'</strong></div><div class="home-shares">'+shares.map(function(share){var resident=homeResident(share.residentId);return '<div class="home-share"><span>'+escapeHtml(resident?resident.name:'Morador removido')+'</span><strong>'+money(share.amount)+'</strong><button class="'+(share.confirmed?'success-btn':'secondary-btn')+' compact-btn" data-action="toggle-home-payment" data-id="'+bill.id+'" data-resident-id="'+share.residentId+'" '+(!allowed.edit?'disabled':'')+'>'+ (share.confirmed?'Confirmado neste mês':'Confirmar neste mês') +'</button></div>';}).join('')+'</div><div class="row wrap" style="margin-top:12px"><span class="pill '+(paid?'green':'yellow')+'">'+(paid?'Pago em '+escapeHtml(billRecord.paidDate):'Pagamento pendente')+'</span><span class="pill '+(confirmed===shares.length&&shares.length?'green':'yellow')+'">'+confirmed+'/'+shares.length+' confirmações em '+escapeHtml(selectedMonth)+'</span>'+(allowed.edit?'<button class="success-btn" data-action="pay-home-bill" data-id="'+bill.id+'">'+(paid?'Editar pagamento':'Registrar pagamento')+'</button>':'')+'<button class="secondary-btn" data-action="home-bill-history" data-id="'+bill.id+'">Histórico mensal</button>'+(allowed.edit?'<button class="secondary-btn" data-action="edit-home-bill" data-id="'+bill.id+'">Editar este mês</button>':'')+(allowed.delete?'<button class="danger-btn" data-action="delete-home-bill" data-id="'+bill.id+'">Excluir</button>':'')+'</div></div>';}).join(''):empty('🏠','Nenhuma conta cadastrada','Cadastre aluguel, energia, internet e demais gastos compartilhados.');
    var debtSummary=residentDebtSummary(),debts=home.residentDebts.filter(function(debt){return homeDebtVisibleInMonth(debt,selectedMonth);}).slice().sort(function(a,b){if(a.status!==b.status)return a.status==='Pendente'?-1:1;return parseDateBR(b.date)-parseDateBR(a.date);}),debtCards=debts.length?debts.map(function(debt){return renderResidentDebtCard(debt,allowed);}).join(''):empty('🤝','Nenhum acerto nesta competência','Dívidas programadas aparecem no mês do vencimento e baixas no mês do pagamento.');
    var sharedSections='';
    var total=sum(bills,function(item){return homeBillAmount(item);}), confirmed=sum(Object.keys(summary),function(id){return summary[id].confirmed;});
    return '<div class="home-toolbar card"><div><div class="card-title">Controle compartilhado</div><div class="card-subtitle">Defina quem está usando o módulo e registre contas da casa.</div></div><label class="home-operator">Operando como<select class="select" id="home-current-resident">'+residentOptions+'</select></label></div><div class="grid grid-4">'+metricCard('Total de contas',money(total),'yellow')+metricCard('Confirmado pelos moradores',money(confirmed),'green')+metricCard('Dívidas pendentes',money(debtSummary.pending),debtSummary.pending?'red':'green')+metricCard('Moradores ativos',String(active.length),'muted')+'</div><div class="toolbar" style="margin-top:16px"><div class="toolbar-left">'+(allowed.view?'<button class="secondary-btn" data-action="open-module-report" data-report-module="home-expenses">Relatório PDF</button>':'')+(allowed.create?'<button class="primary-btn" data-action="new-home-resident">+ Morador</button><button class="success-btn" data-action="new-home-bill" '+(!active.length?'disabled':'')+'>+ Conta da casa</button><button class="yellow-btn" data-action="new-home-debt" '+(active.length<2?'disabled':'')+'>+ Dívida entre moradores</button>':'<span class="muted">Você não possui permissão para criar registros.</span>')+'</div></div><div class="home-section"><div class="card-title">Moradores</div><div class="grid grid-2" style="margin-top:12px">'+residentCards+'</div></div><div class="home-section"><div class="card-header"><div><div class="card-title">Acertos entre moradores</div><div class="card-subtitle">Valores devidos diretamente entre pessoas, sem duplicar as despesas da casa.</div></div><span class="pill '+(debtSummary.pending?'yellow':'green')+'">'+money(debtSummary.pending)+' pendente</span></div><div class="resident-debt-list" style="margin-top:12px">'+debtCards+'</div></div><div class="home-section"><div class="card-title">Contas compartilhadas</div><div class="grid grid-2" style="margin-top:12px">'+billCards+'</div></div>';
  }
  function renderSharedHomeExpensesSection(profile) {
    var home=normalizeState(profile.data).homeExpenses, residents=home.residents||[], residentById={};
    residents.forEach(function(resident){ residentById[resident.id]=resident; });
    var bills=(home.bills||[]).filter(function(bill){ return homeBillType(bill)==='Fixa mensal' ? selectedMonth >= (bill.startMonth||monthFromBR(bill.dueDate)) : monthFromBR(bill.dueDate)===selectedMonth; });
    if(!residents.length && !bills.length) return '';
    var residentCards=residents.map(function(resident){ return '<div class="card shared-home-card"><div class="card-title">'+escapeHtml(resident.name)+'</div><div class="card-subtitle"><span class="pill '+(resident.active===false?'red':'green')+'">'+(resident.active===false?'Inativo':'Ativo')+'</span> · compartilhado por '+escapeHtml(profile.name)+'</div></div>'; }).join('');
    var billCards=bills.map(function(bill){
      var record=bill.monthlyRecords&&bill.monthlyRecords[selectedMonth],currentAmount=record&&record.amount!=null?Number(record.amount):Number(bill.amount||0),confirmations=record&&record.confirmations||{},ids=(bill.participantIds||[]).filter(function(id){return residentById[id];}), cents=Math.round(currentAmount*100), base=ids.length?Math.floor(cents/ids.length):0, remainder=ids.length?cents%ids.length:0;
      var shares=ids.map(function(id,index){return {resident:residentById[id],amount:(base+(index<remainder?1:0))/100,confirmed:Boolean(confirmations[id])};});
      var due=homeBillType(bill)==='Fixa mensal'?(function(){var parts=selectedMonth.split('-'),last=new Date(Number(parts[0]),Number(parts[1]),0).getDate();return formatDateBR(new Date(Number(parts[0]),Number(parts[1])-1,Math.min(Number(bill.dueDay||1),last)));})():bill.dueDate;
      return '<div class="card home-bill-card shared-home-card"><div class="card-header"><div><div class="card-title">'+escapeHtml(bill.title)+'</div><div class="card-subtitle">'+escapeHtml(bill.category)+' · competência '+escapeHtml(selectedMonth)+' · vence em '+escapeHtml(due)+' · compartilhado por '+escapeHtml(profile.name)+'</div></div><strong class="yellow">'+money(currentAmount)+'</strong></div><div class="home-shares">'+shares.map(function(share){return '<div class="home-share"><span>'+escapeHtml(share.resident.name)+'</span><strong>'+money(share.amount)+'</strong><span class="pill '+(share.confirmed?'green':'yellow')+'">'+(share.confirmed?'Confirmado neste mês':'Pendente neste mês')+'</span></div>';}).join('')+'</div></div>';
    }).join('');
    return '<section class="home-section shared-home-section"><div class="shared-home-heading"><div><span class="settings-kicker">SOMENTE LEITURA</span><div class="card-title">Gastos compartilhados por '+escapeHtml(profile.name)+'</div></div><span class="pill green">Perfil compartilhado</span></div>'+(residents.length?'<div class="card-title shared-home-subtitle">Moradores</div><div class="grid grid-2">'+residentCards+'</div>':'')+(bills.length?'<div class="card-title shared-home-subtitle">Contas compartilhadas</div><div class="grid grid-2">'+billCards+'</div>':'')+'</section>';
  }
  function openHomeResidentForm(resident) {
    resident=resident||{id:'',name:'',active:true,permissions:{view:true,create:true,edit:true,delete:true}}; var p=resident.permissions||{};
    var checks=['view','create','edit','delete'].map(function(key){var label={view:'Visualizar',create:'Criar contas e moradores',edit:'Editar e confirmar pagamentos',delete:'Excluir contas e moradores'}[key];return '<label class="check-option"><input type="checkbox" name="permission-'+key+'" '+(p[key]!==false?'checked':'')+'> '+label+'</label>';}).join('');
    showModal(resident.id?'Editar morador':'Novo morador','Defina acesso ao módulo de Gastos da casa.', '<div class="form-grid">'+field('Nome','name','text',resident.name,'required')+'<div class="field"><label>Status</label><select class="select" name="active"><option value="true" '+(resident.active!==false?'selected':'')+'>Ativo</option><option value="false" '+(resident.active===false?'selected':'')+'>Inativo</option></select></div><div class="field form-full"><label>Permissões específicas</label><div class="home-permission-form">'+checks+'</div></div></div>', function(fd){var item={id:resident.id||uid(),name:fd.get('name').trim(),active:fd.get('active')==='true',permissions:{view:fd.get('permission-view')==='on',create:fd.get('permission-create')==='on',edit:fd.get('permission-edit')==='on',delete:fd.get('permission-delete')==='on'}}; if(!item.name)return toast('Informe o nome do morador.');var list=homeExpensesData().residents,idx=list.findIndex(function(current){return current.id===item.id;});if(idx>=0)list[idx]=item;else list.push(item);saveState();closeModal();render();toast('Morador salvo.');});
  }
  function openHomeBillForm(bill) {
    var active=homeExpensesData().residents.filter(function(item){return item.active!==false;});
    if(!active.length)return toast('Cadastre pelo menos um morador ativo.');
    var editing=Boolean(bill&&bill.id),targetMonth=editing?selectedMonth:monthKey(new Date());
    bill=bill||{id:'',title:'',category:'Aluguel',billingType:'Fixa mensal',amount:'',dueDate:todayBR(),dueDay:new Date().getDate(),startMonth:targetMonth,participantIds:active.map(function(item){return item.id;}),payerId:'',confirmations:{},monthlyRecords:{}};
    targetMonth=editing?selectedMonth:(bill.startMonth||targetMonth);
    var record=homeBillMonthRecord(bill,targetMonth,false),currentAmount=record&&record.amount!=null?Number(record.amount):Number(bill.amount||0),currentPayer=record&&record.payerId!=null?String(record.payerId):String(bill.payerId||'');
    var participants=active.map(function(item){var pct=(bill.participantPercentages&&bill.participantPercentages[item.id])||'';return '<label class="check-option"><input type="checkbox" name="participant" value="'+item.id+'" '+((bill.participantIds||[]).indexOf(item.id)>=0?'checked':'')+'> '+escapeHtml(item.name)+' <input class="input participant-percentage" name="percentage-'+item.id+'" type="number" min="0" max="100" step="0.01" value="'+pct+'" placeholder="%"></label>';}).join('');
    var payerOptions='<option value="">Não informado</option>'+active.map(function(item){return '<option value="'+item.id+'" '+(currentPayer===item.id?'selected':'')+'>'+escapeHtml(item.name)+'</option>';}).join('');
    showModal(editing?'Editar pagamento do mês':'Nova conta da casa','Cada competência guarda seu próprio valor, pagador e confirmações. O histórico dos meses anteriores não será alterado.','<div class="form-grid">'+field('Descrição','title','text',bill.title,'required')+selectField('Categoria','category',['Aluguel','Condomínio','Energia','Água','Internet','Mercado','Gás','Manutenção','Outro'],bill.category)+selectField('Tipo da conta','billingType',['Fixa mensal','Variável'],homeBillType(bill))+'<div class="field"><label for="amount">Valor nesta competência</label><input class="input" id="amount" name="amount" type="text" value="'+escapeHtml(currentAmount?money(currentAmount).replace('R$','').trim():'')+'" placeholder="Ex.: 120,00" required><small class="form-note">Este valor será armazenado somente no mês escolhido.</small></div>'+field('Dia do vencimento','dueDay','number',bill.dueDay||parseDateBR(bill.dueDate).getDate(),'min="1" max="31"')+'<div class="field"><label for="startMonth">'+(editing?'Competência do pagamento':'Mês inicial')+'</label><input class="input" id="startMonth" name="startMonth" type="month" value="'+escapeHtml(targetMonth)+'" required></div>'+'<div class="field"><label>Quem pagou neste mês?</label><select class="select" name="payerId">'+payerOptions+'</select></div><div class="field form-full"><label>Participantes da divisão</label><div class="home-permission-form">'+participants+'</div></div></div>',function(fd){
      var ids=fd.getAll('participant'),recordMonth=fd.get('startMonth')||targetMonth,amount=parseMoney(fd.get('amount')),dueDay=Math.max(1,Math.min(31,Number(fd.get('dueDay')||1))),lastDay=new Date(Number(recordMonth.slice(0,4)),Number(recordMonth.slice(5,7)),0).getDate(),recordDate=formatDateBR(new Date(Number(recordMonth.slice(0,4)),Number(recordMonth.slice(5,7))-1,Math.min(dueDay,lastDay)));
      if(!fd.get('title').trim()||amount<=0||!ids.length)return toast('Informe descrição, valor e pelo menos um participante.');
      var monthlyRecords=clone(bill.monthlyRecords||{}),previousRecord=monthlyRecords[recordMonth]||{},payerId=String(fd.get('payerId')||'');
      monthlyRecords[recordMonth]={amount:amount,payerId:payerId,confirmations:clone(previousRecord.confirmations||{}),paidDate:String(previousRecord.paidDate||''),updatedAt:new Date().toISOString()};
      var startMonth=editing?(bill.startMonth||recordMonth):recordMonth;
      var participantPercentages={};ids.forEach(function(id){var value=Number(fd.get('percentage-'+id)||0);if(value>0)participantPercentages[id]=value;});var item={id:bill.id||uid(),title:fd.get('title').trim(),category:fd.get('category'),billingType:fd.get('billingType')==='Fixa mensal'?'Fixa mensal':'Variável',amount:amount,dueDate:editing?bill.dueDate:recordDate,dueDay:dueDay,startMonth:startMonth,participantIds:ids,participantPercentages:participantPercentages,payerId:payerId,confirmations:{},monthlyRecords:monthlyRecords};
      var list=homeExpensesData().bills,idx=list.findIndex(function(current){return current.id===item.id;});if(idx>=0)list[idx]=item;else list.push(item);selectedMonth=recordMonth;saveState();saveUiState();closeModal();render();toast('Pagamento de '+monthTitle(recordMonth)+' salvo no histórico mensal.');
    });
  }
  function homeBillHistoryMonths(bill) {
    var start=bill.startMonth||monthFromBR(bill.dueDate)||selectedMonth,end=monthKey(new Date());if(selectedMonth>end)end=selectedMonth;var keys=[],key=start,guard=0;
    while(key<=end&&guard<120){keys.push(key);key=addMonthsKey(key,1);guard+=1;}
    Object.keys(bill.monthlyRecords||{}).forEach(function(month){if(keys.indexOf(month)<0)keys.push(month);});
    return keys.sort().reverse();
  }
  function openHomeBillHistory(bill) {
    if(!bill)return;var rows=homeBillHistoryMonths(bill).map(function(month){var record=homeBillMonthRecord(bill,month,false),confirmations=record&&record.confirmations||{},confirmed=Object.keys(confirmations).filter(function(id){return confirmations[id];}).length,participants=(bill.participantIds||[]).length,payer=homeResident(record&&record.payerId!=null?record.payerId:bill.payerId),amount=record&&record.amount!=null?Number(record.amount):Number(bill.amount||0);return [escapeHtml(monthTitle(month)),money(amount),escapeHtml(payer?payer.name:'Não informado'),confirmed+'/'+participants,'<strong class="'+(record?'green':'yellow')+'">'+(record?'Registrado':'Pendente')+'</strong>'];});
    $('modal-root').innerHTML='<div class="modal-backdrop"><div class="modal large"><button class="modal-close" data-action="close-modal">×</button><h2>Histórico mensal · '+escapeHtml(bill.title)+'</h2><p class="modal-desc">Valores, pagadores e confirmações são independentes em cada competência.</p>'+reportTable(['Competência','Valor','Pago por','Confirmações','Situação'],rows)+'</div></div>';
  }
  function openHomeBillPayment(bill) {
    if(!bill)return;var active=homeExpensesData().residents.filter(function(item){return item.active!==false;}),record=homeBillMonthRecord(bill,selectedMonth,false),payerId=record&&record.payerId!=null?record.payerId:bill.payerId||'',options=active.map(function(item){return {value:item.id,label:item.name};});
    showModal('Registrar pagamento da conta',bill.title+' · '+monthTitle(selectedMonth),'<div class="form-grid">'+selectObjectField('Quem pagou esta conta','payerId',options,payerId)+field('Data efetiva do pagamento','paidDate','date',dateInputFromBR(record&&record.paidDate||todayBR()),'required')+'</div><p class="form-note">O valor será somado ao campo “Pago por ele(a)” somente nesta competência.</p>',function(fd){var target=homeBillMonthRecord(bill,selectedMonth,true);target.payerId=String(fd.get('payerId')||'');target.paidDate=dateBRFromInput(fd.get('paidDate'))||todayBR();target.updatedAt=new Date().toISOString();saveState();closeModal();render();toast('Pagamento de '+monthTitle(selectedMonth)+' registrado.');});
  }
  function openHomeDebtForm(debt) {
    var residents=homeExpensesData().residents.filter(function(item){return item.active!==false||(debt&&(item.id===debt.debtorId||item.id===debt.creditorId));});
    if(residents.length<2)return toast('Cadastre pelo menos dois moradores para lançar uma dívida.');
    debt=debt||{id:'',debtorId:residents[0].id,creditorId:residents[1].id,description:'',amount:0,date:todayBR(),dueDate:todayBR(),scheduleType:'Fixa',status:'Pendente',paidDate:'',notes:''};
    var options=residents.map(function(item){return {value:item.id,label:item.name+(item.active===false?' (inativo)':'')};});
    var body='<div class="form-grid">'+selectObjectField('Quem deve','debtorId',options,debt.debtorId)+selectObjectField('Para quem deve','creditorId',options,debt.creditorId)+field('Descrição','description','text',debt.description,'required')+field('Valor devido','amount','text',debt.amount?money(debt.amount).replace('R$','').trim():'','required')+selectField('Tipo da dívida','scheduleType',['Fixa','Programada'],debt.scheduleType||'Fixa')+field('Data do lançamento','date','date',dateInputFromBR(debt.date),'required')+((debt.scheduleType||'Fixa')==='Programada'?field('Data de vencimento','dueDate','date',dateInputFromBR(debt.dueDate),'required'):'')+textareaField('Observação','notes',debt.notes||'')+'</div><p class="form-note">Dívidas fixas não possuem vencimento nem baixa. Dívidas programadas aparecem somente no mês do vencimento e podem ser quitadas no mês do pagamento.</p>';
    showModal(debt.id?'Editar dívida entre moradores':'Nova dívida entre moradores','Informe quem deve, quem deve receber e o valor combinado.',body,function(fd){var debtorId=String(fd.get('debtorId')),creditorId=String(fd.get('creditorId')),amount=parseMoney(fd.get('amount')),description=String(fd.get('description')||'').trim();if(debtorId===creditorId)return toast('O devedor e o credor precisam ser moradores diferentes.');if(!description||amount<=0)return toast('Informe a descrição e um valor maior que zero.');var now=new Date().toISOString(),item=Object.assign({},debt,{id:debt.id||uid(),debtorId:debtorId,creditorId:creditorId,description:description,amount:amount,date:dateBRFromInput(fd.get('date')),dueDate:dateBRFromInput(fd.get('dueDate')),scheduleType:fd.get('scheduleType')==='Programada'?'Programada':'Fixa',notes:String(fd.get('notes')||''),status:debt.status==='Quitada'?'Quitada':'Pendente',paidDate:debt.status==='Quitada'?debt.paidDate:'',createdAt:debt.createdAt||now,updatedAt:now});var list=homeExpensesData().residentDebts,index=list.findIndex(function(current){return current.id===item.id;});if(index>=0)list[index]=item;else list.push(item);saveState();closeModal();render();toast('Dívida entre moradores salva sem duplicar despesas.');},'large');
  }

  function renderProfilePermissionsSettings() {
    if (!isAdministrator(getActiveProfile())) return '';
    var target = profileStore.profiles.find(function(profile){ return profile.id === permissionsProfileId; }) || profileStore.profiles.find(function(profile){ return !isAdministrator(profile); }) || profileStore.profiles[0];
    permissionsProfileId = target.id;
    var options = profileStore.profiles.map(function(profile){ return '<option value="'+profile.id+'" '+(profile.id===target.id?'selected':'')+'>'+escapeHtml(profile.name)+(isAdministrator(profile)?' — Administrador':' — Usuário')+'</option>'; }).join('');
    var locked = isAdministrator(target);
    var cards = screens.map(function(screen){
      var permission = target.permissions[screen.id] || {view:true,create:true,edit:true};
      return '<article class="permission-module-card"><div class="permission-module-heading"><span class="nav-icon">'+screen.icon+'</span><strong>'+escapeHtml(screen.title)+'</strong></div><label class="permission-check"><input type="checkbox" data-permission-module="'+screen.id+'" data-permission-level="view" '+(permission.view?'checked':'')+' '+(locked?'disabled':'')+'> Visualizar informações</label><label class="permission-check"><input type="checkbox" data-permission-module="'+screen.id+'" data-permission-level="create" '+(permission.create?'checked':'')+' '+(locked?'disabled':'')+'> Incluir informações</label><label class="permission-check"><input type="checkbox" data-permission-module="'+screen.id+'" data-permission-level="edit" '+(permission.edit?'checked':'')+' '+(locked?'disabled':'')+'> Editar, excluir e alterar status</label></article>';
    }).join('');
    return '<section class="card settings-section permissions-settings-card"><div class="settings-heading"><div><span class="settings-kicker">CONTROLE DE ACESSO</span><div class="card-title">Perfis e permissões</div><p class="card-subtitle">Todos usam os mesmos dados. Defina apenas o que cada usuário pode visualizar, incluir ou editar em cada módulo.</p></div><span class="settings-icon">🔐</span></div><div class="permissions-toolbar"><select class="select" id="permissions-profile-select">'+options+'</select><button class="lime-btn" data-action="save-profile-permissions" '+(locked?'disabled':'')+'>Salvar permissões</button><button class="secondary-btn" data-action="new-profile">+ Adicionar perfil</button></div>'+(locked?'<div class="permission-admin-note">O administrador possui acesso total e suas permissões não podem ser removidas.</div>':'')+'<div class="permissions-grid">'+cards+'</div></section>';
  }
  function saveProfilePermissions() {
    if (!isAdministrator(getActiveProfile())) return toast('Somente o administrador pode alterar permissões.');
    var target = profileStore.profiles.find(function(profile){ return profile.id === permissionsProfileId; });
    if (!target || isAdministrator(target)) return toast('As permissões do administrador são fixas.');
    var permissions = defaultProfilePermissions();
    Array.prototype.slice.call(document.querySelectorAll('[data-permission-module]')).forEach(function(input){
      var moduleId=input.getAttribute('data-permission-module'), level=input.getAttribute('data-permission-level');
      if (permissions[moduleId] && level) permissions[moduleId][level]=input.checked;
    });
    target.permissions=permissions; target.updatedAt=new Date().toISOString(); saveProfileStore(); render(); toast('Permissões de '+target.name+' salvas.');
  }
  function refreshRemoteAccessStatus() {
    if(root.rbDesktop&&root.rbDesktop.sync&&root.rbDesktop.sync.status) root.rbDesktop.sync.status().then(function(status){remoteAccessStatus=Object.assign({},remoteAccessStatus,status||{});if(activeScreen==='settings')render();});
  }
  function renderRemoteAccessSettings() {
    if(!isAdministrator(getActiveProfile()))return '';
    if(root.ReactNativeWebView) {
      return '<section class="card settings-section remote-access-card"><div class="settings-heading"><div><span class="settings-kicker">CONEXÃO COM O DESKTOP</span><div class="card-title">Aplicativo mobile</div><p class="card-subtitle">O celular exibe e altera diretamente os dados do RB Gestão Windows.</p></div><span class="settings-icon">📱</span></div><div class="backup-status"><span class="backup-status-dot"></span><div><strong>Conexão online obrigatória</strong><small>O desktop e o serviço de acesso precisam permanecer ligados.</small></div></div><div class="row wrap"><button class="lime-btn" data-action="configure-mobile-connection">Alterar conexão</button></div><p class="form-note">Sem conexão com o desktop, o aplicativo mobile não permite consultar ou alterar informações.</p></section>';
    }
    var url=remoteAccessStatus.publicUrl||'';
    return '<section class="card settings-section remote-access-card"><div class="settings-heading"><div><span class="settings-kicker">ACESSO EM OUTRO COMPUTADOR</span><div class="card-title">Aplicativo web remoto</div><p class="card-subtitle">Use a mesma conexão segura do APK para abrir ou instalar o RB Gestão em outro PC.</p></div><span class="settings-icon">🌐</span></div><div class="remote-access-fields"><div class="field"><label for="remote-public-url">Endereço HTTPS público</label><input class="input" id="remote-public-url" value="'+escapeHtml(url)+'" placeholder="https://seu-computador.ts.net"></div><div class="field"><label for="remote-access-link">Link completo de acesso</label><input class="input" id="remote-access-link" value="'+escapeHtml(remoteAccessStatus.accessUrl||'Salve o endereço para gerar o link')+'" readonly></div></div><div class="row wrap"><button class="lime-btn" data-action="save-remote-access">Salvar endereço</button><button class="secondary-btn" data-action="copy-remote-access-link" '+(!remoteAccessStatus.accessUrl?'disabled':'')+'>Copiar link de acesso</button></div><p class="form-note">No outro computador, abra o link no navegador. Use a opção “Instalar aplicativo” do Chrome ou Edge para criar um app independente. O desktop principal precisa permanecer aberto e o Tailscale Funnel ativo.</p></section>';
  }
  function saveRemoteAccessSettings(){
    if(!isAdministrator(getActiveProfile())||!root.rbDesktop||!root.rbDesktop.sync||!root.rbDesktop.sync.configure)return toast('Configuração disponível somente no aplicativo Windows.');
    var value=String($('remote-public-url').value||'').trim();if(value&&value.indexOf('https://')!==0)return toast('Informe um endereço HTTPS válido.');
    root.rbDesktop.sync.configure({publicUrl:value}).then(function(status){remoteAccessStatus=Object.assign({},remoteAccessStatus,status||{});render();toast('Endereço remoto salvo.');});
  }
  function copyRemoteAccessLink(){
    var link=remoteAccessStatus.accessUrl;if(!link)return toast('Configure o endereço HTTPS primeiro.');
    var fallback=function(){var input=$('remote-access-link');input.focus();input.select();try{document.execCommand('copy');toast('Link copiado.');}catch(_){toast('Selecione e copie o link.');}};
    if(root.navigator&&root.navigator.clipboard&&root.navigator.clipboard.writeText)root.navigator.clipboard.writeText(link).then(function(){toast('Link copiado.');}).catch(fallback);else fallback();
  }
  function renderInstitutions(){var items=state.financialInstitutions;return '<div class="toolbar"><div class="toolbar-left"><button class="secondary-btn" data-action="open-module-report" data-report-module="institutions">Relatório PDF</button><button class="primary-btn" data-action="new-institution">+ Nova instituição</button></div></div><section class="card institutions-settings"><div class="settings-heading"><div><span class="settings-kicker">ESTRUTURA FINANCEIRA</span><div class="card-title">Instituições financeiras</div><p class="card-subtitle">Defina bancos, cores, logotipos e palavras usadas na identificação automática.</p></div></div><div class="institutions-list">'+items.map(function(item){var accounts=state.bankAccounts.filter(function(account){return account.financialInstitutionId===item.id;}).length,cards=state.cards.filter(function(card){return card.financialInstitutionId===item.id;}).length;return '<div class="institution-row">'+institutionIcon(item,'large')+'<div class="item-main"><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml(item.bankCode||'Sem código')+' · '+accounts+' conta(s) · '+cards+' cartão(ões) · '+escapeHtml(item.color)+'</small></div><span class="institution-color" title="'+escapeHtml(item.color)+'" style="background:'+escapeHtml(item.color)+'"></span><button class="secondary-btn" data-action="edit-institution" data-id="'+item.id+'">Editar</button><button class="danger-btn" data-action="delete-institution" data-id="'+item.id+'">Excluir</button></div>';}).join('')+'</div></section>';}
  function openInstitutionForm(institution){
    institution=institution||{id:'',name:'',shortName:'',bankCode:'',color:'#4B7600',icon:'',keywords:[],custom:true};
    var available=['','banco-amazonia.svg','banco-brasil.svg','banco-brasilia.svg','banco-nordeste.svg','banestes.svg','banrisul.svg','bradesco.svg','caixa.svg','inter.svg','itau.svg','nubank.svg','original.svg','safra.svg','santander.svg','sicoob.svg','sicredi.svg'];
    var pendingIcon=String(institution.icon||''),preset=pendingIcon.indexOf('data:image/')===0?'':pendingIcon,color=institution.color||'#4B7600';
    var presetOptions=available.map(function(value){return {value:value,label:value?value.replace('.svg',''):'Nenhum logotipo padrão'};});
    var preview='<div class="institution-icon-editor form-full"><div id="institution-icon-preview">'+institutionIcon(institution,'large')+'</div><div><strong>Ícone do banco</strong><small>Selecione um SVG padrão ou envie manualmente SVG, PNG, JPG ou WebP.</small><div class="row wrap"><label class="secondary-btn profile-photo-button" for="institutionIconFile">Escolher ícone</label><input class="profile-photo-file" id="institutionIconFile" type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp"><button type="button" class="danger-btn" id="remove-institution-icon" '+(!pendingIcon?'disabled':'')+'>Remover ícone</button></div></div></div>';
    var colorField='<div class="field category-color-field"><label for="color">Cor da instituição</label><input class="input category-color-input" id="color" name="color" type="color" value="'+escapeHtml(color)+'" required><small id="institution-color-value">'+escapeHtml(color.toUpperCase())+'</small></div>';
    var body='<div class="form-grid">'+field('Nome','name','text',institution.name,'required')+field('Nome curto','shortName','text',institution.shortName,'required')+field('Código do banco','bankCode','text',institution.bankCode||'')+selectObjectField('Logotipo padrão','iconPreset',presetOptions,preset)+colorField+field('Palavras-chave','keywords','text',(institution.keywords||[]).join(', '),'placeholder="nome, produto, variação"')+preview+'</div>';
    showModal(institution.id?'Editar instituição':'Nova instituição financeira','O ícone manual será salvo com os dados e aparecerá também no site e no aplicativo mobile.',body,function(fd){var item=normalizeInstitution(Object.assign({},institution,{id:institution.id||uid(),name:String(fd.get('name')||'').trim(),shortName:String(fd.get('shortName')||'').trim(),bankCode:String(fd.get('bankCode')||'').trim(),icon:pendingIcon,color:String(fd.get('color')||'#4B7600'),keywords:String(fd.get('keywords')||'').split(',').map(function(value){return value.trim();}).filter(Boolean),custom:true}),0);if(!item.name||!item.shortName)return toast('Informe nome e nome curto.');var index=state.financialInstitutions.findIndex(function(current){return current.id===item.id;});if(index>=0)state.financialInstitutions[index]=item;else state.financialInstitutions.push(item);saveState();closeModal();render();toast('Instituição financeira salva.');});
    function updatePreview(){var previewInstitution=Object.assign({},institution,{name:$('name').value||'Instituição',shortName:$('shortName').value||$('name').value||'Banco',color:$('color').value,icon:pendingIcon});$('institution-icon-preview').innerHTML=institutionIcon(previewInstitution,'large');$('remove-institution-icon').disabled=!pendingIcon;}
    $('color').oninput=function(){$('institution-color-value').textContent=this.value.toUpperCase();updatePreview();};$('name').oninput=updatePreview;$('shortName').oninput=updatePreview;
    $('iconPreset').onchange=function(){pendingIcon=this.value;updatePreview();};$('remove-institution-icon').onclick=function(){pendingIcon='';$('iconPreset').value='';$('institutionIconFile').value='';updatePreview();};
    $('institutionIconFile').onchange=function(){var file=this.files&&this.files[0];if(!file)return;if(!/^image\/(?:svg\+xml|png|jpe?g|webp)$/i.test(file.type))return toast('Escolha um ícone SVG, PNG, JPG ou WebP.');if(file.size>700*1024){this.value='';return toast('O ícone deve possuir no máximo 700 KB.');}var reader=new FileReader();reader.onload=function(){pendingIcon=String(reader.result||'');$('iconPreset').value='';updatePreview();toast('Ícone pronto para salvar.');};reader.onerror=function(){toast('Não foi possível ler o ícone.');};reader.readAsDataURL(file);};
  }
  function renderInstitutionsSettings(){return '';}

  function renderSettings() {
    var count = state.entries.length + state.cards.length + state.cardTransactions.length + state.invoicePayments.length + state.financialInstitutions.length + state.bankAccounts.length + state.bankTransactions.length + state.savingsBoxes.length + state.savingsMovements.length + state.investments.length + state.investmentMovements.length + state.loans.length + state.subscriptions.length + state.salaryRecords.length + state.homeExpenses.residents.length + state.homeExpenses.bills.length + state.homeExpenses.residentDebts.length;
    var modeLabels = { off:'Desativado', daily:'Todo dia no horário', 'on-close':'Sempre que o aplicativo fechar', 'daily-and-close':'Diário e também ao fechar' };
    var lastDate = backupStatus.lastBackupAt ? new Date(backupStatus.lastBackupAt).toLocaleString('pt-BR') : 'Nenhum backup automático ainda';
    var folder = backupStatus.folder || 'A pasta será definida pelo Windows na primeira execução instalada';
    var automaticAvailable = Boolean(root.rbDesktop && root.rbDesktop.backup);
    return '<div class="settings-layout">'+renderProfilePermissionsSettings()+renderRemoteAccessSettings()+renderInstitutionsSettings()+'<section class="card settings-section"><div class="settings-heading"><div><span class="settings-kicker">APARÊNCIA E NAVEGAÇÃO</span><div class="card-title">Preferências do aplicativo</div><p class="card-subtitle">Personalize como o RB Gestão abre e é exibido.</p></div><span class="settings-icon">⚙️</span></div><div class="settings-fields"><label class="setting-row"><span><strong>Tema do aplicativo</strong><small>Escolha o modo mais confortável para sua leitura.</small></span><select class="select" id="settings-theme"><option value="dark" '+(appTheme==='dark'?'selected':'')+'>Modo escuro</option><option value="light" '+(appTheme==='light'?'selected':'')+'>Modo claro</option></select></label><label class="setting-row"><span><strong>Competência ao abrir</strong><small>Define o mês inicial em uma nova abertura.</small></span><select class="select" id="settings-start-month"><option value="next" '+(appSettings.startMonth==='next'?'selected':'')+'>Próximo mês</option><option value="current" '+(appSettings.startMonth==='current'?'selected':'')+'>Mês atual</option></select></label></div></section>'+
      '<section class="card settings-section backup-settings-card"><div class="settings-heading"><div><span class="settings-kicker">PROTEÇÃO AUTOMÁTICA</span><div class="card-title">Backup</div><p class="card-subtitle">Salva usuários, permissões, fotos e toda a base financeira em arquivos JSON.</p></div><span class="settings-icon">🛡️</span></div><div class="grid grid-3 settings-summary">'+metricCard('Perfis',String(profileStore.profiles.length),'lime')+metricCard('Registros compartilhados',String(count),'yellow')+metricCard('Versão',String(state.version||'2.0.17-windows').replace('-windows',''),'muted')+'</div><div class="settings-fields"><label class="setting-row"><span><strong>Backup automático</strong><small>Escolha quando o sistema deve proteger seus dados.</small></span><select class="select" id="settings-backup-mode">'+Object.keys(modeLabels).map(function(value){return '<option value="'+value+'" '+(appSettings.autoBackupMode===value?'selected':'')+'>'+modeLabels[value]+'</option>';}).join('')+'</select></label><label class="setting-row '+(appSettings.autoBackupMode==='on-close'||appSettings.autoBackupMode==='off'?'setting-disabled':'')+'"><span><strong>Horário diário</strong><small>O aplicativo precisa estar aberto nesse horário.</small></span><input class="input" id="settings-backup-time" type="time" value="'+appSettings.backupTime+'" '+(appSettings.autoBackupMode==='on-close'||appSettings.autoBackupMode==='off'?'disabled':'')+'></label><label class="setting-row"><span><strong>Cópias mantidas</strong><small>Os arquivos mais antigos são removidos automaticamente.</small></span><select class="select" id="settings-backup-retention">'+[7,15,30,60,90].map(function(value){return '<option value="'+value+'" '+(appSettings.backupRetention===value?'selected':'')+'>'+value+' backups</option>';}).join('')+'</select></label><div class="setting-row setting-folder"><span><strong>Pasta de destino</strong><small title="'+escapeHtml(folder)+'">'+escapeHtml(folder)+'</small></span><button class="secondary-btn" data-action="choose-backup-folder" '+(!automaticAvailable?'disabled':'')+'>Escolher pasta</button></div></div><div class="backup-status '+(backupStatus.lastError?'has-error':'')+'"><span class="backup-status-dot"></span><div><strong>'+(backupStatus.lastError?'Falha no último backup':'Proteção configurada')+'</strong><small>'+(backupStatus.lastError?escapeHtml(backupStatus.lastError):escapeHtml(lastDate))+'</small></div></div><div class="row wrap settings-actions"><button class="lime-btn" data-action="run-auto-backup" '+(!automaticAvailable?'disabled':'')+'>Gerar backup agora</button><button class="secondary-btn" data-action="export-backup">Exportar manualmente</button><button class="secondary-btn" data-action="import-backup">Importar backup</button><button class="danger-btn" data-action="reset-data">Zerar base financeira</button></div>' + (!automaticAvailable?'<p class="form-note">A automação fica disponível no aplicativo Windows instalado. A exportação manual continua funcionando nesta visualização.</p>':'') + '</section></div>';
  }

  function renderHelp() {
    return '<div class="toolbar"><div class="toolbar-left"><button class="secondary-btn" data-action="open-module-report" data-report-module="help">Relatório PDF</button></div></div><div class="help-intro card"><span class="pill yellow">GUIA DO SISTEMA</span><h2>Como usar o RB Gestão Financeira</h2><p>Este tutorial explica o fluxo completo do aplicativo. Comece cadastrando o salário e depois registre as demais movimentações. Consulte sempre o mês exibido no topo da tela.</p></div>' +
      '<div class="help-grid">' +
        helpSection('1','Primeiros passos','Prepare o sistema para começar','<ol><li>Abra <strong>Salário</strong> e defina o salário bruto.</li><li>Cadastre recebimentos, descontos e empréstimos CLT.</li><li>Registre receitas e despesas em <strong>Transações</strong>.</li><li>Cadastre cartões, empréstimos e assinaturas nos módulos correspondentes.</li></ol>') +
        helpSection('2','Perfis de acesso','Usuários e permissões','<ul><li>Clique no avatar no alto da barra lateral para trocar de usuário.</li><li>Todos os usuários acessam a mesma base financeira.</li><li>Use <strong>+ Novo perfil</strong> para cadastrar nome, foto, cor e senha.</li><li>O administrador define quem pode visualizar, incluir ou editar em cada módulo.</li><li>Excluir um perfil remove apenas seu acesso e não apaga os dados financeiros.</li></ul>') +
        helpSection('3','Mês, navegação e tema','Consulte cada competência','<ul><li>Use a seta na divisória da barra lateral para alternar entre o menu completo e somente os ícones.</li><li>Em <strong>Configurações</strong>, escolha Modo claro ou Modo escuro. A opção fica salva para as próximas aberturas.</li><li>Use as setas no topo para avançar ou voltar um mês.</li><li>Clique no nome do mês para retornar ao próximo mês em relação à data atual.</li><li>Os lançamentos e totais acompanham o mês selecionado.</li><li>Ao pressionar <strong>F5</strong>, a tela, o mês, os filtros, a ordenação e o formato do menu são preservados.</li></ul>') +
        helpSection('4','Início e saldo previsto','Entenda o painel financeiro','<ul><li>O saldo considera salário líquido, receitas, despesas, empréstimos e assinaturas.</li><li>Entradas aumentam o saldo; saídas e descontos reduzem o saldo.</li><li>Os três totais de cartões servem para consulta e não alteram o saldo previsto.</li><li>As movimentações consolidadas mostram origem, data, situação e valor.</li></ul>') +
        helpSection('5','Transações','Receitas e despesas do dia a dia','<ul><li>Clique em <strong>Nova transação</strong> e informe descrição, valor, tipo, categoria, situação e data.</li><li>Use <strong>Previsto</strong> para valores ainda não realizados e <strong>Pago</strong> para valores concluídos.</li><li>A recorrência mensal cria lançamentos nos meses seguintes.</li><li>Ao editar uma transação recorrente, escolha no pop-up se deseja alterar somente a parcela selecionada ou todas as parcelas relacionadas. As datas e a numeração são preservadas.</li><li>Use <strong>Baixar</strong>, <strong>Estornar</strong>, <strong>Editar</strong> ou <strong>Excluir</strong> conforme necessário.</li></ul>') +
        helpSection('6','Cartões','Limites, compras e faturas','<ul><li>Cadastre o cartão com limite, fechamento, vencimento, cor e bandeira.</li><li>Em <strong>Nova compra</strong>, escolha cartão, categoria, data, parcelas e recorrência.</li><li>O sistema calcula limite total, comprometido, disponível, fatura e valor em aberto.</li><li>Use <strong>Pagar fatura</strong> para registrar pagamento integral, parcial ou parcelado.</li><li>Compras e faturas não entram no cálculo do saldo financeiro.</li></ul>') +
        helpSection('7','Salário e empréstimos CLT','Histórico mensal do salário líquido','<ul><li><strong>Recebimento</strong> adiciona comissão, bônus ou outro provento.</li><li><strong>Desconto</strong> registra INSS, faltas e demais deduções.</li><li><strong>Empréstimo CLT</strong> solicita o mês inicial e a quantidade de parcelas e aparece automaticamente nas competências seguintes.</li><li>Abra <strong>Parcelas</strong> para marcar competências atuais ou anteriores como pagas.</li><li>Valores podem ser fixos ou percentuais sobre o salário bruto.</li><li>O salário permanece válido nos meses seguintes até outro ser cadastrado.</li></ul>') +
        helpSection('8','Empréstimos','Contratos, movimentos e relatórios','<ul><li>Escolha <strong>Peguei emprestado</strong> para valores a pagar ou <strong>Emprestei para alguém</strong> para valores a receber.</li><li>No cadastro, escolha <strong>Valor total</strong>, <strong>Valor da parcela</strong> ou <strong>Somente montante</strong>.</li><li>Com <strong>Sem data limite</strong>, Valor total cria uma cobrança única aberta, enquanto Valor da parcela cria uma recorrência mensal.</li><li><strong>Somente montante</strong> guarda apenas o saldo, sem gerar cronograma. Use <strong>Baixar montante</strong> para registrar pagamentos totais ou parciais diretamente nele.</li><li>O painel mostra dívida total, saldo pendente, percentual recuperado e contratos em aberto ou quitados.</li><li>Use <strong>Baixar parcela</strong> para pagamentos totais ou parciais e <strong>Aumentar dívida</strong> para registrar novos valores no contrato.</li><li>Cada baixa parcial fica salva em <strong>Detalhes › Cronograma de parcelas</strong> como uma transação separada, com data, valor e estorno individual.</li><li>Em <strong>Gerenciar parcelas</strong>, exclua a última parcela, marque várias para exclusão conjunta, selecione todas ou remova o contrato inteiro. Baixas vinculadas às parcelas excluídas também são removidas.</li><li>Em <strong>Detalhes</strong>, acompanhe também o histórico de movimentos, o progresso e todo o cronograma.</li><li>Os relatórios <strong>Sintético</strong> e <strong>Detalhado</strong> abrem em uma pré-visualização. Escolha <strong>PDF claro</strong> ou <strong>PDF escuro</strong> e depois use <strong>Imprimir / Salvar PDF</strong>.</li></ul>') +
        helpSection('9','Assinaturas','Serviços e cobranças recorrentes','<ul><li>Cadastre nome, tipo, valor, ciclo, vencimento e data inicial.</li><li>O ciclo pode ser mensal, trimestral ou anual.</li><li>A cobrança entra no cálculo apenas quando for devida no mês selecionado.</li><li>Use <strong>Pausar</strong> para interromper temporariamente sem excluir.</li></ul>') +
        helpSection('10','Filtros, ordenação e categorias','Encontre exatamente o que precisa','<ul><li>Use filtros por tipo, situação, categoria, direção, ciclo ou cartão.</li><li>Visão Geral, Transações e compras dos Cartões possuem filtros próprios por categoria.</li><li>Ordene por nome, data, valor, vencimento, fatura ou limite.</li><li>Em <strong>Categorias</strong>, filtre por grupo e crie nomes personalizados para cada módulo.</li><li>Cada categoria possui uma cor exclusiva aplicada nos gráficos e listas. Novas categorias recebem automaticamente uma cor diferente.</li><li>Use <strong>Definir cor</strong> para personalizar; o sistema impede que duas categorias utilizem a mesma cor.</li><li>Excluir uma categoria não apaga lançamentos que já a utilizam.</li></ul>') +
        helpSection('11','Configurações e backup','Personalize e proteja seus dados','<ul><li>Na aba <strong>Configurações</strong>, escolha tema e competência inicial.</li><li>Ative o backup <strong>diário</strong>, <strong>ao fechar</strong> ou utilize as duas opções juntas.</li><li>No modo diário, defina o horário; o aplicativo precisa estar aberto nesse momento.</li><li>Escolha a pasta, a quantidade de cópias mantidas ou use <strong>Gerar backup agora</strong>.</li><li><strong>Exportar manualmente</strong> cria um JSON para transferência; <strong>Importar backup</strong> restaura os dados.</li><li><strong>Zerar perfil atual</strong> não altera os demais perfis.</li><li>A desinstalação não apaga automaticamente os dados locais.</li></ul>') +
      '</div><div class="help-callout card"><strong>Dica:</strong> antes de excluir muitos registros ou zerar a base, exporte um backup para poder recuperar as informações.</div>';
  }
  function helpSection(number, title, subtitle, content) {
    return '<section class="card help-card"><div class="help-heading"><span class="help-number">' + number + '</span><div><div class="card-title">' + title + '</div><div class="card-subtitle">' + subtitle + '</div></div></div><div class="help-list">' + content + '</div></section>';
  }

  function field(label, name, type, value, attrs) {
    attrs = attrs || '';
    return '<div class="field"><label for="' + name + '">' + label + '</label><input class="input" id="' + name + '" name="' + name + '" type="' + type + '" value="' + escapeHtml(value || '') + '" ' + attrs + '></div>';
  }
  function selectField(label, name, options, selected) {
    return '<div class="field"><label for="' + name + '">' + label + '</label><select class="select" id="' + name + '" name="' + name + '">' + options.map(function(o){ return '<option value="' + escapeHtml(o) + '" ' + (o === selected ? 'selected' : '') + '>' + escapeHtml(o) + '</option>'; }).join('') + '</select></div>';
  }

  function selectObjectField(label, name, options, selected) {
    return '<div class="field"><label for="' + name + '">' + label + '</label><select class="select" id="' + name + '" name="' + name + '">' + options.map(function(o){ return '<option value="' + escapeHtml(o.value) + '" ' + (o.value === selected ? 'selected' : '') + '>' + escapeHtml(o.label) + '</option>'; }).join('') + '</select></div>';
  }
  function textareaField(label, name, value) {
    return '<div class="field form-full"><label for="' + name + '">' + label + '</label><textarea class="textarea" id="' + name + '" name="' + name + '">' + escapeHtml(value || '') + '</textarea></div>';
  }
  function showModal(title, desc, body, onSubmit, size) {
    $('modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal ' + (size || '') + '"><h2>' + escapeHtml(title) + '</h2><p class="modal-desc">' + escapeHtml(desc || '') + '</p><form id="modal-form">' + body + '<div class="actions"><button type="button" class="secondary-btn" data-action="close-modal">Cancelar</button><button type="submit" class="primary-btn">Salvar</button></div></form></div></div>';
    $('modal-form').onsubmit = function(ev){ ev.preventDefault(); Promise.resolve(onSubmit(new FormData(ev.target))).catch(function(){ toast('Não foi possível salvar.'); }); };
  }
  function closeModal() { if (profileUnlockRequired || profileSelectionRequired) return; $('modal-root').innerHTML = ''; }

  function profileRecordCount(profile) {
    var data = normalizeState(profileStore && profileStore.sharedData || state);
    return data.entries.length + data.cards.length + data.cardTransactions.length + data.invoicePayments.length + data.financialInstitutions.length + data.bankAccounts.length + data.bankTransactions.length + data.savingsBoxes.length + data.savingsMovements.length + data.investments.length + data.investmentMovements.length + data.loans.length + data.subscriptions.length + data.salaryRecords.length + data.homeExpenses.residents.length + data.homeExpenses.bills.length + data.homeExpenses.residentDebts.length;
  }
  function openProfilesModal(startup) {
    if(startup) profileSelectionRequired=true;
    var active = getActiveProfile();
    var cards = profileStore.profiles.map(function(profile){
      var selected = active && profile.id === active.id;
      var created = new Date(profile.createdAt);
      var createdLabel = isNaN(created.getTime()) ? '' : ' · criado em ' + created.toLocaleDateString('pt-BR');
      return '<div class="profile-option ' + (selected ? 'selected' : '') + '"><button type="button" class="profile-option-main" data-action="switch-profile" data-id="' + profile.id + '">' + profileAvatarHtml(profile, 'profile-avatar-large') + '<span><strong>' + escapeHtml(profile.name) + (profile.passwordHash ? ' <span class="profile-password-badge" title="Perfil protegido">🔒</span>' : '') + '</strong><small>' + profileRecordCount(profile) + ' registro(s) disponíveis' + createdLabel + (selected ? ' · perfil atual' : '') + '</small></span></button><div class="profile-option-actions"><button type="button" class="secondary-btn compact-btn" data-action="edit-profile" data-id="' + profile.id + '">Editar</button><button type="button" class="danger-btn compact-btn" data-action="delete-profile" data-id="' + profile.id + '" ' + (profileStore.profiles.length <= 1 ? 'disabled' : '') + '>Excluir</button></div></div>';
    }).join('');
    var closeButton=startup?'':'<button type="button" class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>';
    var footerClose=startup?'':'<button type="button" class="secondary-btn" data-action="close-modal">Fechar</button>';
    $('modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal profile-modal"><div class="modal-title-row"><div><h2>Perfis de acesso</h2><p class="modal-desc">Escolha quem está entrando. Todos acessam a mesma base conforme suas permissões.</p></div>'+closeButton+'</div><div class="profile-options">' + cards + '</div><div class="actions"><button type="button" class="lime-btn" data-action="new-profile">+ Novo perfil</button>'+footerClose+'</div></div></div>';
  }
  function openProfileForm(profile) {
    profile = profile || { id:'', name:'', avatar:'initials', photo:'', color:'#b7ff3c' };
    var pendingPhoto = profile.photo || '';
    var photoProcessing = false;
    var avatarOptions = [
      {value:'initials',label:'Iniciais do nome'}, {value:'👤',label:'Pessoa'}, {value:'👩',label:'Mulher'},
      {value:'👨',label:'Homem'}, {value:'🧑‍💼',label:'Profissional'}, {value:'👨‍👩‍👧‍👦',label:'Família'}
    ];
    var previewProfile = { name:profile.name || 'Perfil', avatar:profile.avatar || 'initials', photo:pendingPhoto, color:profile.color || '#b7ff3c' };
    var photoEditor = '<div class="profile-photo-editor span-2"><div id="profile-photo-preview">' + profileAvatarHtml(previewProfile,'profile-avatar-editor') + '</div><div><strong>Foto do perfil</strong><small>Escolha JPG, PNG ou WebP. A imagem será recortada em formato quadrado.</small><div class="row wrap"><label class="secondary-btn profile-photo-button" for="profilePhoto">Escolher foto</label><input class="profile-photo-file" id="profilePhoto" type="file" accept="image/png,image/jpeg,image/webp"><button type="button" class="danger-btn" id="remove-profile-photo" ' + (!pendingPhoto ? 'disabled' : '') + '>Remover foto</button></div></div></div>';
    var profileColor=normalizeHexColor(profile.color,'#B7FF3C');
    var colorField='<div class="field category-color-field"><label for="profileColor">Cor de identificação</label><input class="input category-color-input" id="profileColor" name="profileColor" type="color" value="'+profileColor+'" required><small id="profile-color-value">'+profileColor+'</small></div>';
    var passwordFields = field(profile.id ? 'Nova senha numérica (deixe em branco para manter)' : 'Senha numérica do perfil (opcional)','profilePassword','password','','inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="12" autocomplete="new-password"') + field('Confirmar senha numérica','profilePasswordConfirm','password','','inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="12" autocomplete="new-password"');
    if (profile.id && profile.passwordHash) passwordFields += '<label class="check form-full"><input type="checkbox" name="removeProfilePassword" value="yes"> Remover a senha atual deste perfil</label>';
    var body = '<div class="form-grid">' + photoEditor + field('Nome do perfil','profileName','text',profile.name,'required maxlength="40"') + selectObjectField('Avatar alternativo','profileAvatar',avatarOptions,profile.avatar || 'initials') + colorField + passwordFields + '</div><p class="form-note">A senha é opcional e protege o acesso ao perfil. Ela não é salva em texto aberto.</p>';
    showModal(profile.id ? 'Editar perfil' : 'Novo perfil', profile.id ? 'Altere a identificação ou a senha de acesso.' : 'Crie um usuário para acessar a base financeira conforme as permissões.', body, async function(fd){
      if (photoProcessing) return toast('Aguarde o processamento da foto.');
      var name = String(fd.get('profileName') || '').trim();
      if (!name) return toast('Informe o nome do perfil.');
      var password = String(fd.get('profilePassword') || '');
      var confirmation = String(fd.get('profilePasswordConfirm') || '');
      if (password && !/^\d{4,12}$/.test(password)) return toast('A senha deve conter de 4 a 12 números.');
      if (password !== confirmation) return toast('A confirmação da senha não confere.');
      if (profile.id) {
        var current = profileStore.profiles.find(function(item){ return item.id === profile.id; });
        if (!current) return;
        current.name = name;
        current.avatar = fd.get('profileAvatar') || 'initials';
        current.photo = pendingPhoto;
        current.color = normalizeHexColor(fd.get('profileColor'),'#B7FF3C');
        if (fd.get('removeProfilePassword') === 'yes') { current.passwordHash = ''; current.passwordType=''; delete unlockedProfiles[current.id]; }
        else if (password) { current.passwordHash = await hashProfilePassword(password, current.id); current.passwordType='pin'; unlockedProfiles[current.id] = true; }
        current.updatedAt = new Date().toISOString();
      } else {
        var created = normalizeProfile({ name:name, avatar:fd.get('profileAvatar'), photo:pendingPhoto, color:normalizeHexColor(fd.get('profileColor'),'#B7FF3C'), data:defaultState() }, profileStore.profiles.length);
        if (password) { created.passwordHash = await hashProfilePassword(password, created.id); created.passwordType='pin'; unlockedProfiles[created.id] = true; }
        profileStore.profiles.push(created);
        profileStore.activeProfileId = created.id;
      state = profileStore.sharedData;
        activeScreen = 'dashboard';
        profileSelectionRequired = false;
      }
      var returnToStartupSelector = profileSelectionRequired && !!profile.id;
      saveProfileStore();
      if(returnToStartupSelector){ $('modal-root').innerHTML=''; render(); openProfilesModal(true); toast('Perfil atualizado. Escolha o perfil para entrar.'); return; }
      closeModal();
      render();
      toast(profile.id ? 'Perfil atualizado.' : 'Perfil criado e selecionado.');
    }, 'small');
    var photoInput = $('profilePhoto');
    var removePhotoButton = $('remove-profile-photo');
    var profileForm = $('modal-form');
    var submitButton = profileForm.querySelector('button[type="submit"]');
    var refreshPhotoPreview = function(){
      var liveProfile = { name:$('profileName').value || 'Perfil', avatar:$('profileAvatar').value || 'initials', photo:pendingPhoto, color:$('profileColor').value || '#b7ff3c' };
      $('profile-photo-preview').innerHTML = profileAvatarHtml(liveProfile,'profile-avatar-editor');
      removePhotoButton.disabled = !pendingPhoto;
    };
    photoInput.onchange = function(){
      var file = photoInput.files && photoInput.files[0];
      if (!file) return;
      photoProcessing = true; submitButton.disabled = true; submitButton.textContent = 'Processando foto...';
      resizeProfilePhoto(file,function(data,error){
        photoProcessing = false; submitButton.disabled = false; submitButton.textContent = 'Salvar';
        if (error) { photoInput.value=''; return toast(error); }
        pendingPhoto = data; refreshPhotoPreview(); toast('Foto pronta para salvar.');
      });
    };
    removePhotoButton.onclick = function(){ pendingPhoto=''; photoInput.value=''; refreshPhotoPreview(); };
    $('profileName').oninput = refreshPhotoPreview;
    $('profileAvatar').onchange = refreshPhotoPreview;
    $('profileColor').oninput = function(){ $('profile-color-value').textContent=$('profileColor').value.toUpperCase(); refreshPhotoPreview(); };
    ['profilePassword','profilePasswordConfirm'].forEach(function(id){var el=$(id);if(el)el.oninput=function(){el.value=el.value.replace(/\D/g,'');};});
    profileForm.addEventListener('submit',function(ev){ if(photoProcessing){ev.preventDefault();toast('Aguarde o processamento da foto.');} },true);
  }
  function requestDeleteProfile(id) {
    var profile = profileStore.profiles.find(function(item){ return item.id === id; });
    if (!profile || profileStore.profiles.length <= 1) return toast('É necessário manter pelo menos um perfil.');
    var records = profileRecordCount(profile);
    confirmAction('Excluir perfil', 'O acesso de "' + profile.name + '" será removido. Os ' + records + ' registro(s) financeiros compartilhados não serão apagados.', function(){
      profileStore.profiles = profileStore.profiles.filter(function(item){ return item.id !== id; });
      if (profileStore.activeProfileId === id) profileStore.activeProfileId = profileStore.profiles[0].id;
      state = profileStore.sharedData;
      saveProfileStore();
      render();
      toast('Perfil excluído.');
    });
  }
  function editProtectedProfile(id) {
    var profile = profileStore && profileStore.profiles.find(function(item){ return item.id === id; });
    if (!profile) return;
    requestProfileUnlock(profile, function(){ openProfileForm(profile); }, true);
  }
  function deleteProtectedProfile(id) {
    var profile = profileStore && profileStore.profiles.find(function(item){ return item.id === id; });
    if (!profile) return;
    requestProfileUnlock(profile, function(){ requestDeleteProfile(id); }, true);
  }

  function openEntryForm(entry) {
    entry = entry || { id:'', title:'', amount:'', type:'Despesa', category: state.categories.expense[0], date: todayBR(), status:'Previsto', notes:'' };
    var cats = entry.type === 'Receita' ? state.categories.income : state.categories.expense;
    var recurrenceFields = entry.id ? '' : selectField('Recorrência', 'recurrenceMode', ['Somente este mês','Mensal fixa'], 'Somente este mês') + field('Quantidade de meses', 'recurrenceMonths', 'number', '12', 'min="1" max="360"');
    var body = '<div class="form-grid">' +
      field('Descrição', 'title', 'text', entry.title, 'required') + field('Valor', 'amount', 'text', entry.amount ? money(entry.amount).replace('R$','').trim() : '', 'required') +
      selectField('Tipo', 'type', ['Receita','Despesa'], entry.type) + selectField('Status', 'status', ['Previsto','Pago'], entry.status) +
      selectField('Categoria', 'category', cats, entry.category) + field('Data', 'date', 'date', dateInputFromBR(entry.date), 'required') + recurrenceFields + textareaField('Observação', 'notes', entry.notes) + '</div>';
    showModal(entry.id ? 'Editar transação' : 'Nova transação', 'Informe os dados do lançamento.', body, function(fd){
      var type = fd.get('type');
      var obj = { id: entry.id || uid(), title: fd.get('title').trim(), amount: parseMoney(fd.get('amount')), type: type, category: fd.get('category'), date: dateBRFromInput(fd.get('date')), status: fd.get('status'), notes: fd.get('notes') || '' };
      if (!obj.title || obj.amount <= 0) return toast('Informe descrição e valor maior que zero.');
      var idx = state.entries.findIndex(function(e){ return e.id === obj.id; });
      if (idx >= 0) {
        var existing = state.entries[idx];
        obj.recurringGroupId = existing.recurringGroupId;
        obj.recurringIndex = existing.recurringIndex;
        obj.recurringTotal = existing.recurringTotal;
        obj.recurringFrequency = existing.recurringFrequency;
        var relatedEntries = existing.recurringGroupId ? state.entries.filter(function(item){ return item.id !== existing.id && item.recurringGroupId === existing.recurringGroupId; }) : [];
        if (relatedEntries.length) {
          closeModal();
          return askRecurringEntryEdit(existing, obj, relatedEntries.length);
        }
        state.entries = applyRecurringEntryEdit(state.entries, existing, obj, false);
        saveState(); closeModal(); render(); toast('Transação salva.');
        return;
      }
      var months = fd.get('recurrenceMode') === 'Mensal fixa' ? Number(fd.get('recurrenceMonths') || 1) : 1;
      var created = buildRecurringEntries(obj, months);
      state.entries = state.entries.concat(created);
      saveState(); closeModal(); render(); toast(created.length > 1 ? created.length + ' transações mensais criadas.' : 'Transação salva.');
    });
    var typeEl = $('type');
    typeEl.onchange = function(){
      var catEl = $('category');
      var list = typeEl.value === 'Receita' ? state.categories.income : state.categories.expense;
      catEl.innerHTML = list.map(function(c){ return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; }).join('');
    };
    var recurrenceModeEl = $('recurrenceMode');
    var recurrenceMonthsEl = $('recurrenceMonths');
    if (recurrenceModeEl && recurrenceMonthsEl) {
      var syncRecurrence = function(){
        recurrenceMonthsEl.disabled = recurrenceModeEl.value !== 'Mensal fixa';
      };
      recurrenceModeEl.onchange = syncRecurrence;
      syncRecurrence();
    }
  }

  function askRecurringEntryEdit(existing, edited, otherCount) {
    var question = 'Deseja aplicar estas alterações às outras ' + otherCount + ' parcela(s) cadastrada(s) também?';
    $('modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal small series-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="series-edit-title"><div class="series-edit-icon" aria-hidden="true">↻</div><h2 id="series-edit-title">Editar outras parcelas?</h2><p class="modal-desc">' + escapeHtml(question) + '</p><p class="form-note">As datas e a numeração de cada parcela serão preservadas.</p><div class="actions series-edit-actions"><button type="button" class="secondary-btn" id="edit-current-only">Não, somente esta</button><button type="button" class="lime-btn" id="edit-whole-series">Sim, todas</button></div></div></div>';
    $('edit-current-only').onclick = function(){
      state.entries = applyRecurringEntryEdit(state.entries, existing, edited, false);
      saveState(); closeModal(); render(); toast('Somente a parcela selecionada foi atualizada.');
    };
    $('edit-whole-series').onclick = function(){
      state.entries = applyRecurringEntryEdit(state.entries, existing, edited, true);
      saveState(); closeModal(); render(); toast('Todas as parcelas relacionadas foram atualizadas.');
    };
  }

  function institutionOptions(selected,includeEmpty) { var options=state.financialInstitutions.map(function(item){return {value:item.id,label:item.shortName+(item.bankCode?' · '+item.bankCode:'')};});if(includeEmpty)options.unshift({value:'',label:'Instituição não definida'});return selectObjectField('Instituição financeira','financialInstitutionId',options,selected||''); }
  function accountOptions(selected,label) { var options=state.bankAccounts.filter(function(item){return item.active!==false;}).map(function(item){var bank=institutionById(item.financialInstitutionId);return {value:item.id,label:(bank?bank.shortName+' · ':'')+item.name};});return selectObjectField(label||'Conta','bankAccountId',options,selected||''); }
  function openBankAccountForm(account) {
    account=account||{id:'',financialInstitutionId:'',name:'',description:'',type:'Conta corrente',agency:'',accountNumber:'',initialBalanceCents:0,overdraftLimitCents:0,isMain:false,active:true,color:'',notes:''};
    var body='<div class="form-grid">'+institutionOptions(account.financialInstitutionId,false)+field('Nome da conta','name','text',account.name,'required')+selectField('Tipo','type',['Conta corrente','Conta poupança','Conta digital','Conta pagamento','Carteira','Investimento','Dinheiro','Outros'],account.type)+field('Descrição','description','text',account.description||'')+field('Agência','agency','text',account.agency||'')+field('Número da conta','accountNumber','text',account.accountNumber||'')+field('Saldo inicial','initialBalance','text',moneyFromCents(account.initialBalanceCents).replace('R$','').trim(),'required')+field('Limite de cheque especial','overdraftLimit','text',moneyFromCents(account.overdraftLimitCents).replace('R$','').trim())+'<label class="check"><input type="checkbox" name="isMain" '+(account.isMain?'checked':'')+'> Conta principal</label><label class="check"><input type="checkbox" name="active" '+(account.active!==false?'checked':'')+'> Conta ativa</label>'+textareaField('Observações','notes',account.notes||'')+'</div>';
    showModal(account.id?'Editar conta':'Nova conta bancária','O saldo atual será calculado pelo saldo inicial mais as movimentações.',body,function(fd){var now=new Date().toISOString(),item=Object.assign({},account,{id:account.id||uid(),financialInstitutionId:String(fd.get('financialInstitutionId')||''),name:String(fd.get('name')||'').trim(),description:String(fd.get('description')||''),type:String(fd.get('type')||'Conta corrente'),agency:String(fd.get('agency')||''),accountNumber:String(fd.get('accountNumber')||''),initialBalanceCents:toCents(fd.get('initialBalance')),overdraftLimitCents:Math.max(0,toCents(fd.get('overdraftLimit'))),isMain:fd.get('isMain')==='on',active:fd.get('active')==='on',notes:String(fd.get('notes')||''),createdAt:account.createdAt||now,updatedAt:now});if(!item.name)return toast('Informe o nome da conta.');if(item.isMain)state.bankAccounts.forEach(function(current){current.isMain=false;});var index=state.bankAccounts.findIndex(function(current){return current.id===item.id;});if(index>=0)state.bankAccounts[index]=item;else state.bankAccounts.push(item);saveState();closeModal();render();toast('Conta bancária salva.');},'large');
  }
  function openBankTransactionForm(transaction,accountId) {
    if(!state.bankAccounts.some(function(item){return item.active!==false;}))return toast('Cadastre uma conta bancária primeiro.');
    transaction=transaction||{id:'',bankAccountId:accountId||state.bankAccounts[0].id,type:'Despesa',categoryId:'',description:'',amountCents:0,transactionDate:todayBR(),notes:'',direction:'debit',origin:'manual'};
    var body='<div class="form-grid">'+accountOptions(transaction.bankAccountId,'Conta')+selectField('Tipo','type',['Receita','Despesa','Ajuste de saldo','Estorno'],transaction.type)+field('Descrição','description','text',transaction.description,'required')+field('Valor','amount','text',transaction.amountCents?moneyFromCents(transaction.amountCents).replace('R$','').trim():'','required')+field('Categoria','categoryId','text',transaction.categoryId||'')+field('Data','transactionDate','date',dateInputFromBR(transaction.transactionDate),'required')+selectField('Movimento','direction',['credit','debit'],transaction.direction)+textareaField('Observação','notes',transaction.notes||'')+'</div>';
    showModal(transaction.id?'Editar movimentação':'Nova movimentação bancária','O saldo da conta será recalculado automaticamente.',body,function(fd){var type=String(fd.get('type')),direction=String(fd.get('direction'));if(type==='Receita'||type==='Estorno')direction='credit';if(type==='Despesa')direction='debit';var now=new Date().toISOString(),item=Object.assign({},transaction,{id:transaction.id||uid(),bankAccountId:String(fd.get('bankAccountId')),type:type,description:String(fd.get('description')||'').trim(),amountCents:Math.abs(toCents(fd.get('amount'))),categoryId:String(fd.get('categoryId')||''),transactionDate:dateBRFromInput(fd.get('transactionDate')),direction:direction,notes:String(fd.get('notes')||''),origin:transaction.origin||'manual',createdAt:transaction.createdAt||now,updatedAt:now});if(!item.description||item.amountCents<=0)return toast('Informe descrição e valor maior que zero.');var index=state.bankTransactions.findIndex(function(current){return current.id===item.id;});if(index>=0)state.bankTransactions[index]=item;else state.bankTransactions.push(item);saveState();closeModal();render();toast('Movimentação salva e saldo atualizado.');},'large');
  }
  function openBankTransfer(groupId) {
    var active=state.bankAccounts.filter(function(item){return item.active!==false;});if(active.length<2)return toast('Cadastre pelo menos duas contas ativas para transferir.');var pair=groupId?state.bankTransactions.filter(function(item){return item.transferGroupId===groupId;}):[],debit=pair.find(function(item){return item.direction==='debit';}),credit=pair.find(function(item){return item.direction==='credit';});
    var fromId=debit?debit.bankAccountId:active[0].id,toId=credit?credit.bankAccountId:active[1].id,amount=debit?debit.amountCents:0,date=debit?debit.transactionDate:todayBR(),description=debit?debit.description:'Transferência entre contas';
    var opts=active.map(function(item){var bank=institutionById(item.financialInstitutionId);return {value:item.id,label:(bank?bank.shortName+' · ':'')+item.name};});var body='<div class="form-grid">'+selectObjectField('Conta de origem','fromAccountId',opts,fromId)+selectObjectField('Conta de destino','toAccountId',opts,toId)+field('Valor','amount','text',amount?moneyFromCents(amount).replace('R$','').trim():'','required')+field('Data','transactionDate','date',dateInputFromBR(date),'required')+field('Descrição','description','text',description,'required')+'</div>';
    showModal(groupId?'Editar transferência':'Transferência entre contas','As duas pontas permanecerão vinculadas e o patrimônio total não será alterado.',body,function(fd){var from=String(fd.get('fromAccountId')),to=String(fd.get('toAccountId')),cents=Math.abs(toCents(fd.get('amount')));if(from===to)return toast('Escolha contas diferentes.');if(cents<=0)return toast('Informe um valor maior que zero.');var group=groupId||uid(),when=dateBRFromInput(fd.get('transactionDate')),desc=String(fd.get('description')||'Transferência'),now=new Date().toISOString();state.bankTransactions=state.bankTransactions.filter(function(item){return item.transferGroupId!==group;});state.bankTransactions.push({id:uid(),bankAccountId:from,relatedAccountId:to,type:'Transferência',direction:'debit',amountCents:cents,description:desc,transactionDate:when,transferGroupId:group,origin:'transfer',createdAt:now,updatedAt:now},{id:uid(),bankAccountId:to,relatedAccountId:from,type:'Transferência',direction:'credit',amountCents:cents,description:desc,transactionDate:when,transferGroupId:group,origin:'transfer',createdAt:now,updatedAt:now});saveState();closeModal();render();toast('Transferência salva sem alterar o patrimônio.');});
  }
  function openSavingBoxForm(box){var accounts=state.bankAccounts.filter(function(item){return item.active!==false;});if(!accounts.length)return toast('Cadastre uma conta bancária antes de criar uma caixinha.');box=box||{id:'',name:'',bankAccountId:accounts[0].id,initialBalanceCents:0,targetCents:0,targetDate:'',category:'Dinheiro reservado',description:'',icon:'🐷',status:'Ativa'};var categories=['Reserva de emergência','Viagem','Impostos','Manutenção','Compras futuras','Entrada de veículo','Dinheiro reservado','Outros objetivos'];var body='<div class="form-grid">'+field('Nome','name','text',box.name,'required')+accountOptions(box.bankAccountId,'Conta de origem')+field('Valor atual/base','initialBalance','text',moneyFromCents(box.initialBalanceCents).replace('R$','').trim(),'required')+field('Meta opcional','target','text',box.targetCents?moneyFromCents(box.targetCents).replace('R$','').trim():'')+field('Data da meta','targetDate','date',box.targetDate?dateInputFromBR(box.targetDate):'')+selectField('Categoria','category',categories,box.category)+field('Ícone','icon','text',box.icon||'🐷','maxlength="4"')+selectField('Status','status',['Ativa','Concluída','Arquivada'],box.status)+textareaField('Descrição / observação','description',box.description||'')+'</div>';showModal(box.id?'Editar caixinha':'Nova caixinha','O valor reservado continua dentro do saldo bancário e não será tratado como receita ou despesa.',body,function(fd){var item=Object.assign({},box,{id:box.id||uid(),name:String(fd.get('name')||'').trim(),bankAccountId:String(fd.get('bankAccountId')||''),initialBalanceCents:Math.max(0,toCents(fd.get('initialBalance'))),targetCents:Math.max(0,toCents(fd.get('target'))),targetDate:fd.get('targetDate')?dateBRFromInput(fd.get('targetDate')):'',category:String(fd.get('category')),icon:String(fd.get('icon')||'🐷'),status:String(fd.get('status')),description:String(fd.get('description')||'')});if(!item.name)return toast('Informe o nome da caixinha.');var index=state.savingsBoxes.findIndex(function(current){return current.id===item.id;});if(index>=0)state.savingsBoxes[index]=item;else state.savingsBoxes.push(item);saveState();closeModal();render();toast('Caixinha salva sem alterar receitas ou despesas.');},'large');}
  function openSavingMovementForm(boxId){var box=state.savingsBoxes.find(function(item){return item.id===boxId;});if(!box)return;var current=savingsBoxBalanceCents(boxId),body='<div class="form-grid">'+selectField('Movimentação','type',['Guardar','Retirar'], 'Guardar')+field('Valor','amount','text','','required')+field('Data','date','date',dateInputFromBR(todayBR()),'required')+textareaField('Observação','notes','')+'</div><p class="form-note">Saldo guardado atual: <strong>'+moneyFromCents(current)+'</strong>. Esta é uma transferência interna e não entra em Receita x Despesa.</p>';showModal('Movimentar caixinha',box.name,body,function(fd){var direction=fd.get('type')==='Retirar'?'out':'in',amount=Math.abs(toCents(fd.get('amount')));if(amount<=0)return toast('Informe um valor maior que zero.');if(direction==='out'&&amount>current)return toast('O valor retirado não pode superar o saldo da caixinha.');state.savingsMovements.push({id:uid(),boxId:box.id,type:String(fd.get('type')),direction:direction,amountCents:amount,date:dateBRFromInput(fd.get('date')),notes:String(fd.get('notes')||''),internalType:'TRANSFERENCIA_CAIXINHA',createdAt:new Date().toISOString()});saveState();closeModal();render();toast(direction==='in'?'Valor reservado. O patrimônio não foi alterado.':'Valor devolvido ao disponível. O patrimônio não foi alterado.');});}
  function openSavingHistory(boxId){var box=state.savingsBoxes.find(function(item){return item.id===boxId;});if(!box)return;var rows=state.savingsMovements.filter(function(item){return item.boxId===boxId;}).sort(function(a,b){return parseDateBR(b.date)-parseDateBR(a.date);}).map(function(item){return '<div class="statement-row"><span class="recent-icon">'+(item.direction==='in'?'↘':'↗')+'</span><div class="item-main"><strong>'+escapeHtml(item.type)+'</strong><small>'+escapeHtml(item.date)+(item.notes?' · '+escapeHtml(item.notes):'')+'</small></div><strong class="'+(item.direction==='in'?'green':'yellow')+'">'+(item.direction==='in'?'+ ':'− ')+moneyFromCents(item.amountCents)+'</strong></div>';}).join('');$('modal-root').innerHTML='<div class="modal-backdrop"><div class="modal large"><button class="modal-close" data-action="close-modal">×</button><h2>Histórico · '+escapeHtml(box.name)+'</h2><p class="modal-desc">Movimentações internas da reserva.</p><div class="bank-statement">'+(rows||empty('🐷','Sem movimentações','O valor base da caixinha não possui movimentação separada.'))+'</div></div></div>';}
  function openInvestmentForm(item){var accounts=state.bankAccounts.filter(function(account){return account.active!==false;});item=item||{id:'',name:'',financialInstitutionId:'',bankAccountId:accounts[0]?accounts[0].id:'',category:'Renda Fixa',subcategory:'CDB',ticker:'',applicationDate:todayBR(),investedCents:0,currentValueCents:0,quantity:0,averagePriceCents:0,maturityDate:'',liquidity:'No vencimento',indexer:'CDI',contractedRate:'',taxation:'',status:'Ativo',goalCents:0,notes:''};var categoryValue=item.category+'|'+item.subcategory,body='<div class="form-grid">'+field('Nome','name','text',item.name,'required')+institutionOptions(item.financialInstitutionId,true)+(accounts.length?accountOptions(item.bankAccountId,'Conta vinculada'):field('Conta vinculada','bankAccountId','text','','disabled'))+selectObjectField('Categoria e subcategoria','investmentCategory',investmentCategoryOptions(),categoryValue)+field('Ativo','asset','text',item.asset||'')+field('Código / Ticker','ticker','text',item.ticker||'')+field('Data da aplicação','applicationDate','date',dateInputFromBR(item.applicationDate),'required')+field('Valor aplicado','investedValue','text',moneyFromCents(item.investedCents).replace('R$','').trim(),'required')+field('Quantidade','quantity','number',item.quantity||'','min="0" step="0.00000001"')+field('Preço médio','averagePrice','text',item.averagePriceCents?moneyFromCents(item.averagePriceCents).replace('R$','').trim():'')+field('Valor atual','currentValue','text',moneyFromCents(item.currentValueCents).replace('R$','').trim(),'required')+field('Vencimento','maturityDate','date',item.maturityDate?dateInputFromBR(item.maturityDate):'')+field('Liquidez','liquidity','text',item.liquidity||'')+selectField('Indexador','indexer',['CDI','SELIC','IPCA','Prefixado','CDI +','IPCA +','Outros'],item.indexer||'Outros')+field('Taxa contratada','contractedRate','text',item.contractedRate||'')+field('Tributação','taxation','text',item.taxation||'')+selectField('Status','status',['Ativo','Vencido','Resgatado','Encerrado'],item.status)+field('Meta opcional','goal','text',item.goalCents?moneyFromCents(item.goalCents).replace('R$','').trim():'')+(!item.id&&accounts.length?'<label class="check form-full"><input type="checkbox" name="debitAccount" checked> Registrar a aplicação como saída interna da conta vinculada</label>':'')+textareaField('Observações','notes',item.notes||'')+'</div>';showModal(item.id?'Editar investimento':'Novo investimento','A aplicação é patrimônio transferido, nunca uma despesa.',body,function(fd){var pair=String(fd.get('investmentCategory')||'Renda Fixa|Outros').split('|'),now=new Date().toISOString(),created=!item.id,obj=Object.assign({},item,{id:item.id||uid(),name:String(fd.get('name')||'').trim(),financialInstitutionId:String(fd.get('financialInstitutionId')||''),bankAccountId:String(fd.get('bankAccountId')||''),category:pair.shift()||'Outros Investimentos',subcategory:pair.join('|')||'Outros',asset:String(fd.get('asset')||''),ticker:String(fd.get('ticker')||'').toUpperCase(),applicationDate:dateBRFromInput(fd.get('applicationDate')),investedCents:Math.max(0,toCents(fd.get('investedValue'))),quantity:Math.max(0,Number(fd.get('quantity')||0)),averagePriceCents:Math.max(0,toCents(fd.get('averagePrice'))),currentValueCents:Math.max(0,toCents(fd.get('currentValue'))),maturityDate:fd.get('maturityDate')?dateBRFromInput(fd.get('maturityDate')):'',liquidity:String(fd.get('liquidity')||''),indexer:String(fd.get('indexer')||''),contractedRate:String(fd.get('contractedRate')||''),taxation:String(fd.get('taxation')||''),status:String(fd.get('status')),goalCents:Math.max(0,toCents(fd.get('goal'))),notes:String(fd.get('notes')||''),createdAt:item.createdAt||now,updatedAt:now});if(!obj.name)return toast('Informe o nome do investimento.');if(!obj.averagePriceCents&&obj.quantity)obj.averagePriceCents=Math.round(obj.investedCents/obj.quantity);var index=state.investments.findIndex(function(current){return current.id===obj.id;});if(index>=0)state.investments[index]=obj;else state.investments.push(obj);if(created&&obj.investedCents){var movementId=uid();state.investmentMovements.push({id:movementId,investmentId:obj.id,type:'Aplicação',amountCents:obj.investedCents,quantity:obj.quantity,feesCents:0,taxCents:0,date:obj.applicationDate,internalType:'APLICACAO_INVESTIMENTO',realized:false,notes:'Aplicação inicial'});if(fd.get('debitAccount')==='on'&&obj.bankAccountId)state.bankTransactions.push({id:uid(),bankAccountId:obj.bankAccountId,type:'Aplicação em investimento',direction:'debit',amountCents:obj.investedCents,description:'Aplicação · '+obj.name,transactionDate:obj.applicationDate,relatedInvestmentId:obj.id,relatedInvestmentMovementId:movementId,origin:'investment-transfer',internalType:'APLICACAO_INVESTIMENTO',createdAt:now,updatedAt:now});}saveState();closeModal();render();toast('Investimento salvo. A aplicação não foi classificada como despesa.');},'large');}
  function openInvestmentMovementForm(investmentId){var item=state.investments.find(function(current){return current.id===investmentId;});if(!item)return;var types=['Aplicação','Aporte','Resgate parcial','Resgate total','Rendimento','Dividendo','Juros','Juros sobre capital','Amortização','Bonificação','Venda','Compra','Taxa','Imposto','Transferência entre investimentos','Ajuste manual'],destinations=state.investments.filter(function(current){return current.id!==item.id&&current.status==='Ativo';}).map(function(current){return {value:current.id,label:current.name};});destinations.unshift({value:'',label:'Nenhum'});var body='<div class="form-grid">'+selectField('Tipo','type',types,'Aporte')+field('Valor bruto','amount','text','','required')+field('Quantidade','quantity','number','','min="0" step="0.00000001"')+field('Taxas','fees','text','')+field('Impostos','tax','text','')+field('Data','date','date',dateInputFromBR(todayBR()),'required')+(state.bankAccounts.length?accountOptions(item.bankAccountId,'Conta de origem / recebimento'):'')+selectObjectField('Investimento de destino','destinationInvestmentId',destinations,'')+'<label class="check form-full"><input type="checkbox" name="countAsIncome" checked> Considerar somente o rendimento ou lucro realizado como Receita de Investimentos</label>'+textareaField('Observação','notes','')+'</div><p class="form-note">Aportes e resgates do próprio capital são transferências internas. Apenas ganhos efetivamente recebidos podem virar receita.</p>';showModal('Movimentar investimento',item.name,body,function(fd){var type=String(fd.get('type')),amount=Math.abs(toCents(fd.get('amount'))),qty=Math.max(0,Number(fd.get('quantity')||0)),fees=Math.abs(toCents(fd.get('fees'))),tax=Math.abs(toCents(fd.get('tax'))),accountId=String(fd.get('bankAccountId')||''),date=dateBRFromInput(fd.get('date')),now=new Date().toISOString(),movementId=uid(),capitalIn=['Aplicação','Aporte','Compra'].indexOf(type)>=0,capitalOut=['Resgate parcial','Resgate total','Venda'].indexOf(type)>=0,income=['Rendimento','Dividendo','Juros','Juros sobre capital','Amortização'].indexOf(type)>=0;if(amount<=0)return toast('Informe um valor maior que zero.');var beforeCurrent=Number(item.currentValueCents||0),beforeInvested=Number(item.investedCents||0),cost=0,profit=0;if(capitalIn){item.investedCents+=amount;item.currentValueCents+=amount;if(qty)item.quantity=Number(item.quantity||0)+qty;if(item.quantity)item.averagePriceCents=Math.round(item.investedCents/item.quantity);}else if(capitalOut){cost=qty&&item.averagePriceCents?Math.min(beforeInvested,Math.round(qty*item.averagePriceCents)):Math.min(beforeInvested,beforeCurrent?Math.round(beforeInvested*Math.min(1,amount/beforeCurrent)):amount);profit=amount-cost-fees-tax;item.currentValueCents=Math.max(0,beforeCurrent-amount);item.investedCents=Math.max(0,beforeInvested-cost);if(qty)item.quantity=Math.max(0,Number(item.quantity||0)-qty);if(type==='Resgate total'){item.currentValueCents=0;item.investedCents=0;item.quantity=0;item.status='Resgatado';}}else if(income){if(!accountId)item.currentValueCents+=Math.max(0,amount-fees-tax);profit=Math.max(0,amount-fees-tax);}else if(type==='Taxa'||type==='Imposto'){if(!accountId)item.currentValueCents=Math.max(0,beforeCurrent-amount);}else if(type==='Transferência entre investimentos'){var destination=state.investments.find(function(current){return current.id===String(fd.get('destinationInvestmentId')||'');});if(!destination)return toast('Escolha o investimento de destino.');cost=Math.min(beforeInvested,beforeCurrent?Math.round(beforeInvested*Math.min(1,amount/beforeCurrent)):amount);item.currentValueCents=Math.max(0,beforeCurrent-amount);item.investedCents=Math.max(0,beforeInvested-cost);destination.currentValueCents=Number(destination.currentValueCents||0)+amount;destination.investedCents=Number(destination.investedCents||0)+cost;}else if(type==='Ajuste manual'){item.currentValueCents=amount;}var internalType=capitalIn?'APLICACAO_INVESTIMENTO':capitalOut?'RESGATE_INVESTIMENTO':income?'RENDIMENTO_INVESTIMENTO':type==='Transferência entre investimentos'?'TRANSFERENCIA_INVESTIMENTO':normalizeText(type).toUpperCase().replace(/\s+/g,'_');var movement={id:movementId,investmentId:item.id,destinationInvestmentId:String(fd.get('destinationInvestmentId')||''),type:type,amountCents:amount,quantity:qty,feesCents:fees,taxCents:tax,date:date,accountId:accountId,realized:!!accountId&&income,realizedProfitCents:profit,internalType:internalType,notes:String(fd.get('notes')||''),createdAt:now};state.investmentMovements.push(movement);var accountAmount=0,direction='';if(accountId&&capitalIn){accountAmount=amount+fees+tax;direction='debit';}if(accountId&&capitalOut){accountAmount=Math.max(0,amount-fees-tax);direction='credit';}if(accountId&&income){accountAmount=Math.max(0,amount-fees-tax);direction='credit';}if(accountId&&(type==='Taxa'||type==='Imposto')){accountAmount=amount;direction='debit';}if(accountAmount)state.bankTransactions.push({id:uid(),bankAccountId:accountId,type:type+' de investimento',direction:direction,amountCents:accountAmount,description:type+' · '+item.name,transactionDate:date,relatedInvestmentId:item.id,relatedInvestmentMovementId:movementId,origin:'investment-transfer',internalType:internalType,createdAt:now,updatedAt:now});var incomeValue=income?profit:(capitalOut?Math.max(0,profit):0);if(fd.get('countAsIncome')==='on'&&incomeValue>0&&accountId)state.entries.push({id:'investment-income-'+movementId,title:(income?'Rendimento':'Lucro realizado')+' · '+item.name,amount:incomeValue/100,type:'Receita',category:'Receita de Investimentos',date:date,status:'Pago',notes:'Gerado pelo módulo de investimentos',internalType:income?'RENDIMENTO_INVESTIMENTO':'VENDA_ATIVO',relatedInvestmentMovementId:movementId});saveState();closeModal();render();toast('Movimentação registrada sem duplicar receita, despesa ou patrimônio.');},'large');}
  function openInvestmentHistory(investmentId){var item=state.investments.find(function(current){return current.id===investmentId;});if(!item)return;var rows=state.investmentMovements.filter(function(current){return current.investmentId===investmentId;}).sort(function(a,b){return parseDateBR(b.date)-parseDateBR(a.date);}).map(function(movement){return '<div class="statement-row"><span class="recent-icon">📈</span><div class="item-main"><strong>'+escapeHtml(movement.type)+'</strong><small>'+escapeHtml(movement.date)+(movement.notes?' · '+escapeHtml(movement.notes):'')+(movement.realizedProfitCents?' · resultado realizado '+moneyFromCents(movement.realizedProfitCents):'')+'</small></div><strong>'+moneyFromCents(movement.amountCents)+'</strong></div>';}).join('');$('modal-root').innerHTML='<div class="modal-backdrop"><div class="modal large"><button class="modal-close" data-action="close-modal">×</button><h2>Histórico · '+escapeHtml(item.name)+'</h2><p class="modal-desc">Aplicações, compras, vendas, resgates e rendimentos.</p><div class="bank-statement">'+(rows||empty('📈','Sem movimentações','Nenhum movimento registrado.'))+'</div></div></div>';}
  function manageInvestmentCategories(){var rows='';Object.keys(state.investmentCategories).forEach(function(group){rows+='<section class="investment-category-group"><h3>'+escapeHtml(group)+'</h3>'+(state.investmentCategories[group]||[]).map(function(name){return '<div class="category-row"><span>'+escapeHtml(name)+'</span><button class="danger-btn" data-action="delete-investment-category" data-group="'+escapeHtml(group)+'" data-name="'+escapeHtml(name)+'">Excluir</button></div>';}).join('')+'</section>';});$('modal-root').innerHTML='<div class="modal-backdrop"><div class="modal large"><button class="modal-close" data-action="close-modal">×</button><h2>Categorias de investimentos</h2><p class="modal-desc">Mantenha as categorias padrão ou acrescente classificações personalizadas.</p><button class="primary-btn" data-action="new-investment-category">+ Nova categoria</button><div class="investment-category-list">'+rows+'</div></div></div>';}
  function openInvestmentCategoryForm(){var groups=Object.keys(state.investmentCategories);showModal('Nova categoria de investimento','Escolha um grupo existente ou informe um novo grupo.','<div class="form-grid">'+selectField('Grupo existente','group',groups.concat(['Novo grupo']),'Renda Fixa')+field('Novo grupo','newGroup','text','')+field('Nome da categoria','name','text','','required')+'</div>',function(fd){var group=String(fd.get('group')),name=String(fd.get('name')||'').trim();if(group==='Novo grupo')group=String(fd.get('newGroup')||'').trim();if(!group||!name)return toast('Informe o grupo e o nome.');state.investmentCategories[group]=state.investmentCategories[group]||[];if(state.investmentCategories[group].some(function(current){return normalizeText(current)===normalizeText(name);}))return toast('Esta categoria já existe.');state.investmentCategories[group].push(name);saveState();closeModal();render();toast('Categoria de investimento criada.');});}
  function openAccountDetails(id,period) { var account=state.bankAccounts.find(function(item){return item.id===id;});if(!account)return;period=period||'month';var institution=institutionById(account.financialInstitutionId),f=accountFinancials(account),reserved=accountReservedCents(id),now=new Date(),start=null;if(period==='today')start=new Date(now.getFullYear(),now.getMonth(),now.getDate());if(period==='7')start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-6);if(period==='30')start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-29);if(period==='month')start=new Date(Number(selectedMonth.slice(0,4)),Number(selectedMonth.slice(5,7))-1,1);if(period==='previous'){var p=addMonthsKey(selectedMonth,-1);start=new Date(Number(p.slice(0,4)),Number(p.slice(5,7))-1,1);}var end=period==='previous'?new Date(start.getFullYear(),start.getMonth()+1,0):null;var transactions=accountTransactions(id).filter(function(item){var date=parseDateBR(item.transactionDate);return (!start||date>=start)&&(!end||date<=end);}).sort(function(a,b){return parseDateBR(b.transactionDate)-parseDateBR(a.transactionDate);});$('modal-root').innerHTML='<div class="modal-backdrop"><div class="modal account-detail-modal"><button class="modal-close" data-action="close-modal">×</button><header class="account-detail-head">'+institutionIcon(institution,'large')+'<div><span>'+escapeHtml(institution?institution.name:'Instituição não definida')+'</span><h2>'+escapeHtml(account.name)+'</h2></div><strong class="'+(f.balance<0?'red':'green')+'">'+moneyFromCents(f.balance)+'</strong></header><div class="grid grid-4">'+metricCard('Saldo bancário',moneyFromCents(f.balance),f.balance<0?'red':'green')+metricCard('Dinheiro guardado',moneyFromCents(reserved),'yellow')+metricCard('Disponível para uso',moneyFromCents(f.balance-reserved),f.balance-reserved>=0?'green':'red')+metricCard('Limite especial',moneyFromCents(f.available),'muted')+'</div><div class="detail-toolbar"><select class="select" id="account-detail-period"><option value="today" '+(period==='today'?'selected':'')+'>Hoje</option><option value="7" '+(period==='7'?'selected':'')+'>7 dias</option><option value="30" '+(period==='30'?'selected':'')+'>30 dias</option><option value="month" '+(period==='month'?'selected':'')+'>Este mês</option><option value="previous" '+(period==='previous'?'selected':'')+'>Mês anterior</option><option value="all" '+(period==='all'?'selected':'')+'>Todo o período</option></select><button class="primary-btn" data-action="new-bank-transaction" data-account="'+id+'">+ Movimentação</button></div><div class="bank-statement">'+(transactions.length?transactions.map(function(item){var internal=item.origin==='transfer'||item.origin==='investment-transfer';return '<div class="statement-row"><span class="recent-icon">'+(item.direction==='credit'?'↗':'↘')+'</span><div class="item-main"><strong>'+escapeHtml(item.description)+'</strong><small>'+escapeHtml(item.type)+' · '+escapeHtml(item.transactionDate)+(internal?' · movimentação interna':'')+'</small></div><strong class="'+(item.direction==='credit'?'green':'red')+'">'+(item.direction==='credit'?'+ ':'− ')+moneyFromCents(item.amountCents)+'</strong>'+(internal?'':'<button class="secondary-btn" data-action="edit-bank-transaction" data-id="'+item.id+'">Editar</button><button class="danger-btn" data-action="delete-bank-transaction" data-id="'+item.id+'">Excluir</button>')+'</div>';}).join(''):empty('↔','Nenhuma movimentação','Não há lançamentos para este período.'))+'</div></div></div>';$('account-detail-period').onchange=function(){openAccountDetails(id,this.value);}; }

  function openCardForm(card) {
    card = card || { id:'', name:'', financialInstitutionId:'',institutionSource:'',bankAccountId:'',lastFourDigits:'', limit:'', closingDay:'20', dueDay:'10', color:'#15151B', colorName:'Preto', cardBrand:'Visa', active:true };
    var cardColor=cardColorValue(card);
    var colorField='<div class="field category-color-field"><label for="cardColor">Cor do cartão</label><input class="input category-color-input" id="cardColor" name="cardColor" type="color" value="'+cardColor+'" required><small id="card-color-value">'+cardColor+'</small></div>';
    var brands=['Visa','Mastercard','Elo','Hipercard','American Express','Diners','Outro'], selectedBrand=card.cardBrand||card.brandName||'Visa';
    var brandPreview='<div class="field"><label>Prévia da bandeira</label><div class="card-brand-preview" id="card-brand-preview">'+cardBrandIcon(selectedBrand)+'<strong id="card-brand-preview-name">'+escapeHtml(selectedBrand)+'</strong></div></div>';
    var linkedOptions=[{value:'',label:'Nenhuma conta vinculada'}].concat(state.bankAccounts.filter(function(item){return item.active!==false;}).map(function(item){var bank=institutionById(item.financialInstitutionId);return {value:item.id,label:(bank?bank.shortName+' · ':'')+item.name};}));
    var detected=institutionById(card.financialInstitutionId);
    var detectionPreview='<div class="field form-full"><label>Banco identificado</label><div class="institution-detection" id="institution-detection">'+institutionIcon(detected)+'<span><strong>'+(detected?escapeHtml(detected.name):'Instituição não definida')+'</strong><small>Digite o nome do cartão ou selecione manualmente.</small></span></div></div>';
    var body = '<div class="form-grid">' + field('Nome do cartão', 'name', 'text', card.name, 'required') + institutionOptions(card.financialInstitutionId,true) + selectObjectField('Conta vinculada','bankAccountId',linkedOptions,card.bankAccountId||'') + selectField('Bandeira', 'brandName', brands, selectedBrand) + field('Final do cartão', 'lastDigits', 'text', card.lastFourDigits || card.lastDigits || '', 'inputmode="numeric" maxlength="4"') + field('Limite', 'limit', 'text', card.limit ? money(card.limit).replace('R$','').trim() : '', 'required') + field('Dia fechamento', 'closingDay', 'number', card.closingDay || '20', 'min="1" max="31"') + field('Dia vencimento', 'dueDay', 'number', card.dueDay || '10', 'min="1" max="31"') + colorField + brandPreview+detectionPreview + '</div>';
    showModal(card.id ? 'Editar cartão' : 'Novo cartão', 'Controle limite, fechamento e vencimento.', body, function(fd){
      var selectedAccount=state.bankAccounts.find(function(item){return item.id===String(fd.get('bankAccountId')||'');}),manual=$('financialInstitutionId').dataset.manual==='true',institutionId=String(fd.get('financialInstitutionId')||'');if(!manual&&selectedAccount&&selectedAccount.financialInstitutionId)institutionId=selectedAccount.financialInstitutionId;
      var obj = Object.assign({},card,{ id: card.id || uid(), name: fd.get('name').trim(), financialInstitutionId:institutionId, institutionSource:manual?'manual':(selectedAccount?'account':(institutionId?'detected':'')),bankAccountId:String(fd.get('bankAccountId')||''), lastDigits: fd.get('lastDigits').trim(),lastFourDigits:fd.get('lastDigits').trim(), limit: parseMoney(fd.get('limit')), closingDay: Number(fd.get('closingDay') || 1), dueDay: Number(fd.get('dueDay') || 1), color: normalizeHexColor(fd.get('cardColor'),'#15151B'), colorName:'Personalizada', brandName: fd.get('brandName'),cardBrand:fd.get('brandName') });
      if (!obj.name || obj.limit <= 0) return toast('Informe nome e limite maior que zero.');
      var idx = state.cards.findIndex(function(c){ return c.id === obj.id; });
      if (idx >= 0) state.cards[idx] = obj; else state.cards.push(obj);
      saveState(); closeModal(); render(); toast('Cartão salvo.');
    });
    $('cardColor').oninput = function(){ $('card-color-value').textContent=$('cardColor').value.toUpperCase(); };
    $('brandName').onchange = function(){ $('card-brand-preview').innerHTML=cardBrandIcon($('brandName').value)+'<strong id="card-brand-preview-name">'+escapeHtml($('brandName').value)+'</strong>'; };
    function updateDetection(institution){$('institution-detection').innerHTML=institutionIcon(institution)+'<span><strong>'+(institution?escapeHtml(institution.name):'Instituição não definida')+'</strong><small>'+(institution?'Banco associado ao cartão.':'Digite o nome do cartão ou selecione manualmente.')+'</small></span>';if(institution){var accountSelect=$('bankAccountId'),matching=state.bankAccounts.filter(function(item){return item.active!==false&&item.financialInstitutionId===institution.id;});var ordered=matching.concat(state.bankAccounts.filter(function(item){return item.active!==false&&item.financialInstitutionId!==institution.id;}));accountSelect.innerHTML='<option value="">Nenhuma conta vinculada</option>'+ordered.map(function(item){var bank=institutionById(item.financialInstitutionId);return '<option value="'+item.id+'">'+escapeHtml((bank?bank.shortName+' · ':'')+item.name)+'</option>';}).join('');if(matching.length===1&&!card.bankAccountId)accountSelect.value=matching[0].id;else if(card.bankAccountId)accountSelect.value=card.bankAccountId;}}
    $('financialInstitutionId').dataset.manual=card.institutionSource==='manual'?'true':'false';
    $('financialInstitutionId').onchange=function(){this.dataset.manual='true';updateDetection(institutionById(this.value));};
    $('name').oninput=function(){if($('financialInstitutionId').dataset.manual==='true')return;var found=identifyFinancialInstitution(this.value);$('financialInstitutionId').value=found?found.id:'';updateDetection(found);};
  }
  function openCardTransactionForm(t, selectedCardId) {
    var activeCards=state.cards.filter(function(card){return card.active!==false;});
    if (!activeCards.length) { toast('Cadastre ou reative um cartão primeiro.'); return openCardForm(); }
    t = t || { id:'', cardId:selectedCardId || activeCards[0].id, title:'', amount:'', category:state.categories.card[0], date:todayBR(), billingMonthOffset:1, installments:1, recurrenceMonths:0, consumeTotalLimit:false, notes:'' };
    var selectableCards=activeCards.slice();if(t.id&&!selectableCards.some(function(card){return card.id===t.cardId;})){var historical=state.cards.find(function(card){return card.id===t.cardId;});if(historical)selectableCards.push(historical);}
    var body = '<div class="form-grid">' + field('Descrição da compra', 'title', 'text', t.title, 'required') + field('Valor total', 'amount', 'text', t.amount ? money(t.amount).replace('R$','').trim() : '', 'required') + selectObjectField('Cartão', 'cardId', selectableCards.map(function(c){ return { value: c.id, label: c.name }; }), t.cardId) + selectField('Categoria', 'category', state.categories.card, t.category) + field('Data da compra', 'date', 'date', dateInputFromBR(t.date), 'required') + field('Mês cobrança após', 'billingMonthOffset', 'number', t.billingMonthOffset == null ? 1 : t.billingMonthOffset, 'min="0"') + field('Parcelas', 'installments', 'number', t.installments || 1, 'min="1"') + field('Recorrência meses', 'recurrenceMonths', 'number', t.recurrenceMonths || 0, 'min="0"') + '<div class="field"><label>Limite</label><select class="select" name="consumeTotalLimit"><option value="false" ' + (!t.consumeTotalLimit ? 'selected' : '') + '>Consumir parcela no limite</option><option value="true" ' + (t.consumeTotalLimit ? 'selected' : '') + '>Consumir valor total no limite</option></select></div>' + textareaField('Observação', 'notes', t.notes) + '</div>';
    showModal(t.id ? 'Editar compra no cartão' : 'Nova compra no cartão', 'Parcelas e recorrência são calculadas automaticamente na fatura.', body, function(fd){
      var obj = { id: t.id || uid(), cardId: fd.get('cardId'), title: fd.get('title').trim(), amount: parseMoney(fd.get('amount')), category: fd.get('category'), date: dateBRFromInput(fd.get('date')), billingMonthOffset: Number(fd.get('billingMonthOffset') || 0), installments: Math.max(1, Number(fd.get('installments') || 1)), recurrenceMonths: Math.max(0, Number(fd.get('recurrenceMonths') || 0)), consumeTotalLimit: fd.get('consumeTotalLimit') === 'true', notes: fd.get('notes') || '' };
      if (!obj.title || obj.amount <= 0) return toast('Informe descrição e valor maior que zero.');
      var idx = state.cardTransactions.findIndex(function(x){ return x.id === obj.id; });
      if (idx >= 0) state.cardTransactions[idx] = obj; else state.cardTransactions.push(obj);
      saveState(); closeModal(); render(); toast('Compra salva.');
    });
  }
  function openInvoicePayment(cardId) {
    var card = state.cards.find(function(c){ return c.id === cardId; });
    if (!card) return;
    var total = cardInvoiceTotal(cardId, selectedMonth);
    var current = cardInvoicePayment(cardId, selectedMonth) || { paidAmount: total, mode:'Integral', installments:1, interestPercent:0, date:todayBR() };
    var activeAccounts=state.bankAccounts.filter(function(item){return item.active!==false;});
    var body = '<div class="form-grid">' + field('Valor pago', 'paidAmount', 'text', money(current.paidAmount || total).replace('R$','').trim(), 'required') + selectField('Modo', 'mode', ['Integral','Parcial','Parcelamento'], current.mode || 'Integral') + (activeAccounts.length?accountOptions(current.bankAccountId||card.bankAccountId,'Conta utilizada'):'<div class="field form-full"><span class="form-error">Cadastre uma conta bancária ativa para baixar o pagamento no saldo.</span></div>') + field('Parcelas', 'installments', 'number', current.installments || 1, 'min="1"') + field('Juros %', 'interestPercent', 'text', current.interestPercent || '0') + field('Data pagamento', 'date', 'date', dateInputFromBR(current.date), 'required') + '</div><p class="card-subtitle" style="margin-top:10px">Fatura calculada: <strong class="yellow">' + money(total) + '</strong>. O pagamento reduz o saldo da conta, mas não cria uma nova despesa no fluxo.</p>';
    showModal('Pagar fatura', card.name + ' · ' + monthTitle(selectedMonth), body, function(fd){
      var accountId=String(fd.get('bankAccountId')||'');if(activeAccounts.length&&!accountId)return toast('Selecione a conta utilizada no pagamento.');
      var p = { id: current.id || uid(), cardId: cardId, month: selectedMonth, mode: fd.get('mode'), paidAmount: parseMoney(fd.get('paidAmount')), installments: Math.max(1, Number(fd.get('installments') || 1)), interestPercent: parseMoney(fd.get('interestPercent')), date: dateBRFromInput(fd.get('date')),bankAccountId:accountId };
      state.invoicePayments = state.invoicePayments.filter(function(x){ return !(x.cardId === cardId && x.month === selectedMonth); });
      state.invoicePayments.push(p);
      var invoiceKey=cardId+'|'+selectedMonth;state.bankTransactions=state.bankTransactions.filter(function(item){return item.relatedInvoiceId!==invoiceKey;});if(accountId&&p.paidAmount>0)state.bankTransactions.push({id:uid(),bankAccountId:accountId,type:'Pagamento de cartão',direction:'debit',amountCents:toCents(p.paidAmount),description:'Pagamento da fatura '+card.name,transactionDate:p.date,relatedCardId:cardId,relatedInvoiceId:invoiceKey,origin:'invoice-payment',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
      saveState(); closeModal(); render(); toast('Pagamento de fatura salvo.');
    });
  }

  function openSalaryBaseForm() {
    var t = salaryTotals(selectedMonth), r = t.record;
    var body = '<div class="form-grid">' + field('Salário bruto', 'grossSalary', 'text', r.grossSalary ? money(r.grossSalary).replace('R$','').trim() : '', 'required') + textareaField('Observação', 'notes', r.notes || '') + '</div>';
    showModal('Definir salário', monthTitle(selectedMonth), body, function(fd){
      r.grossSalary = parseMoney(fd.get('grossSalary'));
      r.notes = fd.get('notes') || '';
      upsertSalaryRecord(r); saveState(); closeModal(); render(); toast('Salário salvo.');
    }, 'small');
  }
  function openSalaryItemForm(item) {
    var r = salaryRecordForMonth(selectedMonth);
    item = item || { id:'', name:'', type:'Desconto', valueMode:'Valor', value:'', fixedMonthly:true, startMonth:monthKey(new Date()), installmentCount:1, paidMonths:[], notes:'' };
    var body = '<div class="form-grid">' + field('Nome', 'name', 'text', item.name, 'required') + selectField('Tipo', 'type', ['Recebimento','Desconto','Empréstimo CLT'], item.type) + selectField('Modo do valor', 'valueMode', ['Valor','Percentual'], item.valueMode) + field('Valor ou percentual', 'value', 'text', item.value || '', 'required') + '<div class="field" id="salary-recurrence-field"><label>Recorrência</label><select class="select" id="fixedMonthly" name="fixedMonthly"><option value="true" ' + (item.fixedMonthly !== false ? 'selected' : '') + '>Repete nos próximos meses</option><option value="false" ' + (item.fixedMonthly === false ? 'selected' : '') + '>Somente este mês</option></select></div><div class="form-grid form-full" id="salary-loan-period">' + field('Mês de início', 'startMonth', 'month', item.startMonth || selectedMonth) + field('Quantidade de parcelas', 'installmentCount', 'number', salaryItemIsLoan(item) ? salaryLoanInstallmentCount(item) : 1, 'min="1" max="600"') + '</div>' + textareaField('Observação', 'notes', item.notes || '') + '</div>';
    showModal(item.id ? 'Editar item do salário' : 'Novo item do salário', monthTitle(selectedMonth), body, function(fd){
      var type = fd.get('type');
      var isLoan = type === 'Empréstimo CLT';
      var count = isLoan ? Math.max(1, Number(fd.get('installmentCount') || 1)) : 0;
      var startMonth = isLoan ? fd.get('startMonth') : '';
      var obj = { id: item.id || uid(), name: fd.get('name').trim(), type: type, valueMode: fd.get('valueMode'), value: parseMoney(fd.get('value')), fixedMonthly: isLoan || fd.get('fixedMonthly') === 'true', startMonth: startMonth, installmentCount: count, endMonth: isLoan && startMonth ? addMonthsKey(startMonth, count - 1) : '', paidMonths: isLoan ? (item.paidMonths || []) : [], notes: fd.get('notes') || '' };
      if (!obj.name || obj.value <= 0) return toast('Informe nome e valor.');
      if (isLoan && !obj.startMonth) return toast('Informe o mês de início.');
      if (isLoan && (!Number.isInteger(obj.installmentCount) || obj.installmentCount < 1)) return toast('Informe uma quantidade válida de parcelas.');
      if (isLoan) state.salaryRecords.forEach(function(record){ record.items = (record.items || []).filter(function(existing){ return existing.id !== obj.id; }); });
      r.items = r.items || [];
      var idx = r.items.findIndex(function(x){ return x.id === obj.id; });
      if (idx >= 0) r.items[idx] = obj; else r.items.push(obj);
      upsertSalaryRecord(r); saveState(); closeModal(); render(); toast('Item salvo.');
    });
    var typeEl = $('type');
    var periodEl = $('salary-loan-period');
    var recurrenceFieldEl = $('salary-recurrence-field');
    var recurrenceEl = $('fixedMonthly');
    var startEl = $('startMonth');
    var installmentCountEl = $('installmentCount');
    var syncSalaryItemType = function(){
      var isLoan = typeEl.value === 'Empréstimo CLT';
      periodEl.hidden = !isLoan;
      recurrenceFieldEl.hidden = isLoan;
      recurrenceEl.disabled = isLoan;
      startEl.required = isLoan;
      installmentCountEl.required = isLoan;
    };
    typeEl.onchange = syncSalaryItemType;
    syncSalaryItemType();
  }

  function findSalaryLoan(id) {
    var found = null;
    state.salaryRecords.some(function(record){
      found = (record.items || []).find(function(item){ return item.id === id && salaryItemIsLoan(item); }) || null;
      return !!found;
    });
    return found;
  }
  function openSalaryLoanDetails(id) {
    var item = findSalaryLoan(id);
    if (!item) return;
    var count = salaryLoanInstallmentCount(item);
    var paidMonths = item.paidMonths || [];
    var rows = [];
    for (var number=1; number<=count; number++) {
      var key = addMonthsKey(item.startMonth, number - 1);
      var monthRecord = salaryRecordForMonth(key);
      var paid = paidMonths.indexOf(key) >= 0;
      var canToggle = key <= selectedMonth;
      rows.push('<div class="item"><div class="item-main"><div class="item-title">Parcela ' + number + '/' + count + ' · ' + monthTitle(key) + '</div><div class="item-subtitle">' + (paid ? 'Paga' : (canToggle ? 'Em aberto' : 'Parcela futura')) + '</div></div><div class="row"><strong class="red">' + money(salaryItemAmount(item, monthRecord.grossSalary)) + '</strong><button class="' + (paid ? 'secondary-btn' : 'success-btn') + '" data-action="toggle-salary-loan-payment" data-id="' + item.id + '" data-month="' + key + '" ' + (!canToggle ? 'disabled' : '') + '>' + (paid ? 'Estornar' : 'Marcar paga') + '</button></div></div>');
    }
    $('modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal"><h2>' + escapeHtml(item.name) + '</h2><p class="modal-desc">Histórico do empréstimo CLT. A baixa registra o pagamento sem retirar o desconto da competência.</p><div class="list">' + rows.join('') + '</div><div class="actions"><button type="button" class="secondary-btn" data-action="close-modal">Fechar</button></div></div></div>';
  }

  function openLoanForm(loan) {
    var isNewLoan = !loan;
    loan = loan || { id:'', name:'', direction:'Peguei emprestado', principalAmount:'', installmentAmount:'', installments:12, openEnded:false, calculationMode:'total', firstDueDate: todayBR(), createdDate:todayBR(), interestPercent:0, notes:'', payments:[], adjustments:[], excludedInstallments:[] };
    var termMode = loan.openEnded ? 'Sem data limite' : 'Quantidade definida';
    var calculationMode = loan.calculationMode || (isNewLoan ? 'total' : 'installment');
    var calculationValue = calculationMode === 'installment' ? loan.installmentAmount : loan.principalAmount;
    var modeBlock = '<div class="field span-2 loan-calculation-field"><label>Como deseja controlar o empréstimo?</label><div class="loan-mode-picker"><label class="loan-mode-option" data-loan-mode="total"><input type="radio" name="calculationMode" value="total" ' + (calculationMode === 'total' ? 'checked' : '') + '><span><strong>Valor total</strong><small>Com parcelas, informando o total da dívida.</small></span></label><label class="loan-mode-option" data-loan-mode="installment"><input type="radio" name="calculationMode" value="installment" ' + (calculationMode === 'installment' ? 'checked' : '') + '><span><strong>Valor da parcela</strong><small>Com parcelas, informando o valor de cada uma.</small></span></label><label class="loan-mode-option" data-loan-mode="balance"><input type="radio" name="calculationMode" value="balance" ' + (calculationMode === 'balance' ? 'checked' : '') + '><span><strong>Somente montante</strong><small>Guarde apenas o saldo, sem gerar parcelas.</small></span></label></div></div>';
    var valueBlock = '<div class="field span-2 loan-calculation-value"><label id="loan-value-label" for="loanValue">Valor informado</label><input class="input" id="loanValue" name="loanValue" type="text" value="' + escapeHtml(calculationValue ? money(calculationValue).replace('R$','').trim() : '') + '" required><small id="loan-calculation-preview" class="loan-calculation-preview"></small></div>';
    var body = '<div class="form-grid">' + field('Nome/descrição', 'name', 'text', loan.name, 'required') + selectField('Tipo', 'direction', ['Peguei emprestado','Emprestei para alguém'], loan.direction) + modeBlock + valueBlock + selectField('Prazo', 'loanTermMode', ['Quantidade definida','Sem data limite'], termMode) + '<div class="field" id="loan-installments-field"><label for="installments">Quantidade de parcelas</label><input class="input" id="installments" name="installments" type="number" min="1" value="' + escapeHtml(Math.max(1, loan.installments || 12)) + '"></div><div class="field" id="loan-date-field"><label id="loan-date-label" for="firstDueDate">Primeiro vencimento</label><input class="input" id="firstDueDate" name="firstDueDate" type="date" value="' + escapeHtml(dateInputFromBR(loan.firstDueDate)) + '" required></div>' + field('Juros %', 'interestPercent', 'text', loan.interestPercent || '0') + textareaField('Observação', 'notes', loan.notes || '') + '</div>';
    showModal(loan.id ? 'Editar empréstimo' : 'Novo empréstimo', 'Escolha entre valor total, valor da parcela ou apenas um montante sem parcelas.', body, function(fd){
      var openEnded = fd.get('loanTermMode') === 'Sem data limite';
      var installments = Math.max(1, Number(fd.get('installments') || loan.installments || 1));
      var mode = fd.get('calculationMode') || 'total';
      var informedValue = parseMoney(fd.get('loanValue'));
      var calculatedValues = calculateLoanValues(mode, informedValue, installments, openEnded);
      var obj = { id: loan.id || uid(), name: fd.get('name').trim(), direction: fd.get('direction'), calculationMode:calculatedValues.calculationMode, principalAmount:calculatedValues.principalAmount, installmentAmount:calculatedValues.installmentAmount, installments:calculatedValues.installments, openEnded:openEnded, firstDueDate: dateBRFromInput(fd.get('firstDueDate')), createdDate:loan.createdDate || todayBR(), interestPercent: parseMoney(fd.get('interestPercent')), notes: fd.get('notes') || '', payments: loan.payments || [], adjustments:loan.adjustments || [], excludedInstallments:mode === 'balance' ? [] : (loan.excludedInstallments || []).filter(function(number){ return (openEnded && mode === 'installment') || Number(number) <= calculatedValues.installments; }) };
      if (!obj.name || informedValue <= 0) return toast('Informe o nome e um valor maior que zero.');
      var idx = state.loans.findIndex(function(x){ return x.id === obj.id; });
      if (idx >= 0) state.loans[idx] = obj; else state.loans.push(obj);
      saveState(); closeModal(); render(); toast('Empréstimo salvo.');
    });
    var termModeEl = $('loanTermMode');
    var installmentsFieldEl = $('loan-installments-field');
    var installmentInputEl = $('installments');
    var loanValueEl = $('loanValue');
    var valueLabelEl = $('loan-value-label');
    var dateLabelEl = $('loan-date-label');
    var previewEl = $('loan-calculation-preview');
    var modeInputs = Array.prototype.slice.call(document.querySelectorAll('input[name="calculationMode"]'));
    var selectedCalculationMode = function(){ var selected=modeInputs.find(function(input){return input.checked;}); return selected ? selected.value : 'total'; };
    var syncLoanCalculation = function(){
      var openEnded = termModeEl.value === 'Sem data limite';
      var mode = selectedCalculationMode();
      var value = parseMoney(loanValueEl.value);
      var installments = Math.max(1, Number(installmentInputEl.value || 1));
      installmentsFieldEl.hidden = openEnded || mode === 'balance';
      valueLabelEl.textContent = mode === 'installment' ? 'Valor de cada parcela' : (mode === 'balance' ? 'Valor do montante' : 'Valor total do empréstimo');
      dateLabelEl.textContent = mode === 'balance' ? 'Data de referência' : 'Primeiro vencimento';
      if (value <= 0) previewEl.textContent = 'O resultado do cálculo aparecerá aqui.';
      else if (mode === 'balance') previewEl.textContent = 'Nenhuma parcela será gerada. As baixas serão feitas diretamente no saldo de ' + money(value) + '.';
      else if (openEnded && mode === 'installment') previewEl.textContent = 'A parcela de ' + money(value) + ' será repetida mensalmente, sem data limite.';
      else if (openEnded) previewEl.textContent = 'Será criada uma cobrança única de ' + money(value) + ', aberta até a quitação.';
      else previewEl.textContent = mode === 'total' ? installments + ' parcela(s) de ' + money(roundMoney(value / installments)) : 'Valor total calculado: ' + money(roundMoney(value * installments));
      document.querySelectorAll('[data-loan-mode]').forEach(function(option){ option.classList.toggle('active', option.getAttribute('data-loan-mode') === mode); option.classList.remove('disabled'); });
    };
    var syncLoanTerm = function(){ syncLoanCalculation(); };
    termModeEl.onchange = syncLoanTerm;
    installmentInputEl.oninput = syncLoanCalculation;
    loanValueEl.oninput = syncLoanCalculation;
    modeInputs.forEach(function(input){ input.onchange = syncLoanCalculation; });
    syncLoanTerm();
  }
  function openLoanPayment(loanId, number) {
    var loan = state.loans.find(function(item){ return item.id === loanId; });
    if (!loan) return;
    if (loanIsBalanceOnly(loan)) return openLoanBalancePayment(loanId);
    var installment = loanInstallmentAt(loan, number);
    if (installment.remainingAmount <= 0) return toast('Esta parcela já está quitada.');
    var body = '<div class="grid grid-2" style="margin-bottom:16px">' + metricCard('Valor da parcela', money(installment.amount), 'yellow') + metricCard('Restante', money(installment.remainingAmount), 'red') + '</div><div class="form-grid">' + field('Valor da baixa', 'paymentAmount', 'text', money(installment.remainingAmount).replace('R$','').trim(), 'required') + field('Data do pagamento', 'paymentDate', 'date', dateInputFromBR(todayBR()), 'required') + '</div><p class="form-note">Você pode informar um valor menor para registrar uma baixa parcial.</p>';
    showModal('Baixar parcela ' + installment.number, loan.name + ' · vencimento ' + installment.dueDate, body, function(fd){
      var amount = parseMoney(fd.get('paymentAmount'));
      if (amount <= 0) return toast('Informe um valor maior que zero.');
      if (amount > installment.remainingAmount) return toast('O valor não pode ultrapassar o restante da parcela.');
      loan.payments = loan.payments || [];
      loan.payments.push({ id:uid(), number:installment.number, amount:amount, paidDate:dateBRFromInput(fd.get('paymentDate')) });
      saveState(); closeModal(); render(); toast(amount < installment.remainingAmount ? 'Baixa parcial registrada.' : 'Parcela quitada.');
    }, 'small');
  }
  function openLoanBalancePayment(loanId) {
    var loan = state.loans.find(function(item){ return item.id === loanId; });
    if (!loan || !loanIsBalanceOnly(loan)) return;
    var remaining = loanReportRemaining(loan);
    if (remaining <= 0) return toast('Este montante já está quitado.');
    var body = '<div class="grid grid-2" style="margin-bottom:16px">' + metricCard('Montante total', money(loanTotalDebt(loan)), 'yellow') + metricCard('Saldo restante', money(remaining), 'red') + '</div><div class="form-grid">' + field('Valor da baixa', 'paymentAmount', 'text', money(remaining).replace('R$','').trim(), 'required') + field('Data do pagamento', 'paymentDate', 'date', dateInputFromBR(todayBR()), 'required') + '</div><p class="form-note">A baixa será descontada diretamente do montante, sem criar parcelas.</p>';
    showModal('Baixar montante', loan.name, body, function(fd){
      var amount = parseMoney(fd.get('paymentAmount'));
      if (amount <= 0) return toast('Informe um valor maior que zero.');
      if (amount > remaining) return toast('O valor não pode ultrapassar o saldo restante.');
      loan.payments = loan.payments || [];
      loan.payments.push({ id:uid(), number:0, amount:amount, paidDate:dateBRFromInput(fd.get('paymentDate')) });
      saveState(); closeModal(); render(); toast(amount < remaining ? 'Baixa parcial do montante registrada.' : 'Montante quitado.');
    }, 'small');
  }
  function openLoanAdjustment(loanId) {
    var loan = state.loans.find(function(item){ return item.id === loanId; });
    if (!loan) return;
    var body = '<div class="form-grid">' + field('Valor do aumento', 'adjustmentAmount', 'text', '', 'required') + field('Data', 'adjustmentDate', 'date', dateInputFromBR(todayBR()), 'required') + textareaField('Descrição do movimento', 'adjustmentNotes', '') + '</div><p class="form-note">O valor será somado ao saldo total da dívida e ficará registrado no histórico.</p>';
    showModal('Aumentar dívida', loan.name, body, function(fd){
      var amount = parseMoney(fd.get('adjustmentAmount'));
      if (amount <= 0) return toast('Informe um valor maior que zero.');
      loan.adjustments = loan.adjustments || [];
      loan.adjustments.push({ id:uid(), amount:amount, date:dateBRFromInput(fd.get('adjustmentDate')), notes:(fd.get('adjustmentNotes') || '').trim() });
      saveState(); closeModal(); render(); toast('Aumento registrado no histórico.');
    }, 'small');
  }
  function openLoanDetails(id) {
    var loan = state.loans.find(function(l){ return l.id === id; });
    if (!loan) return;
    var balanceOnly = loanIsBalanceOnly(loan);
    var schedule = loanSchedule(loan, addMonthsKey(selectedMonth, loanRepeatsIndefinitely(loan) ? 3 : 0));
    var rows = schedule.map(function(i){
      var paymentText = i.paidAmount > 0 ? ' · baixado ' + money(i.paidAmount) + (i.paidDate ? ' em ' + i.paidDate : '') : '';
      var installmentPayments = (loan.payments || []).map(function(payment,index){ return {payment:payment,index:index}; }).filter(function(item){ return Number(item.payment.number) === Number(i.number); });
      var transactionRows = installmentPayments.map(function(item,transactionIndex){
        var paymentAmount = item.payment.amount === undefined ? Number(i.amount || 0) : Number(item.payment.amount || 0);
        var transactionType = paymentAmount >= Number(i.amount || 0) && installmentPayments.length === 1 ? 'Quitação' : 'Baixa parcial';
        return '<div class="loan-installment-transaction"><span class="loan-transaction-number">' + (transactionIndex + 1) + '</span><div><strong>' + transactionType + '</strong><small>' + escapeHtml(item.payment.paidDate || 'Sem data') + '</small></div><strong class="green">− ' + money(paymentAmount) + '</strong><button class="secondary-btn compact-btn" data-action="delete-loan-payment" data-id="' + loan.id + '" data-payment-index="' + item.index + '">Estornar</button></div>';
      }).join('');
      var transactions = transactionRows ? '<div class="loan-installment-transactions"><div class="loan-transactions-title"><span>Transações da parcela</span><strong>' + installmentPayments.length + '</strong></div>' + transactionRows + '</div>' : '';
      return '<div class="item loan-installment-card"><div class="loan-installment-head"><label class="loan-installment-check" title="Selecionar parcela ' + i.number + '"><input type="checkbox" name="loan-installment-select" value="' + i.number + '"><span>✓</span></label><div class="item-main"><div class="item-title">Parcela ' + i.number + '</div><div class="item-subtitle">Vencimento ' + i.dueDate + paymentText + (i.remainingAmount > 0 ? ' · restante ' + money(i.remainingAmount) : ' · quitada') + '</div></div><div class="row"><strong class="yellow">' + money(i.amount) + '</strong>' + (i.remainingAmount > 0 ? '<button class="success-btn" data-action="pay-loan-installment" data-id="' + loan.id + '" data-number="' + i.number + '">Baixar</button>' : '') + (installmentPayments.length > 1 ? '<button class="secondary-btn" data-action="clear-loan-installment-payments" data-id="' + loan.id + '" data-number="' + i.number + '">Estornar todas</button>' : '') + '</div></div>' + transactions + '</div>';
    }).join('');
    var progress = loanProgressPercent(loan);
    var movements = loanMovementHistory(loan).map(function(movement){
      var deleteButton = movement.kind === 'adjustment' ? '<button class="danger-btn compact-btn" data-action="delete-loan-adjustment" data-id="' + loan.id + '" data-movement="' + movement.id + '">Excluir</button>' : (balanceOnly && movement.kind === 'payment' ? '<button class="secondary-btn compact-btn" data-action="delete-loan-payment" data-id="' + loan.id + '" data-payment-index="' + movement.paymentIndex + '">Estornar</button>' : '');
      return '<div class="loan-movement"><span class="loan-movement-icon ' + (movement.direction === 'payment' ? 'payment' : 'increase') + '">' + (movement.direction === 'payment' ? '↓' : '↑') + '</span><div><strong>' + escapeHtml(movement.type) + '</strong><small>' + escapeHtml(movement.date) + ' · ' + escapeHtml(movement.notes || '') + '</small></div><strong class="' + (movement.direction === 'payment' ? 'green' : 'red') + '">' + (movement.direction === 'payment' ? '− ' : '+ ') + money(movement.amount) + '</strong>' + deleteButton + '</div>';
    }).join('');
    var deletionTools = balanceOnly ? '' : '<div class="loan-installment-tools"><div><strong>Gerenciar parcelas</strong><small>Exclua da última para a primeira ou selecione várias.</small></div><div class="row wrap"><button class="secondary-btn" data-action="toggle-all-loan-installments">Selecionar todas</button><button class="danger-btn" data-action="delete-selected-loan-installments" data-id="' + loan.id + '">Excluir selecionadas</button><button class="danger-btn" data-action="delete-last-loan-installment" data-id="' + loan.id + '">Excluir última</button><button class="danger-btn" data-action="delete-all-loan-installments" data-id="' + loan.id + '">Excluir todas</button></div></div>';
    var scheduleContent = balanceOnly ? '<div class="loan-balance-only"><strong>Montante sem parcelas</strong><p>Este contrato guarda apenas o saldo total. Use “Baixar montante” para registrar pagamentos integrais ou parciais.</p><button class="success-btn" data-action="pay-loan-balance" data-id="' + loan.id + '" ' + (loanReportRemaining(loan) <= 0 ? 'disabled' : '') + '>Baixar montante</button></div>' : deletionTools + '<div class="list">' + rows + '</div>';
    var detailPaymentButton = balanceOnly ? (loanReportRemaining(loan) > 0 ? '<button class="success-btn" data-action="pay-loan-balance" data-id="' + loan.id + '">Baixar montante</button>' : '') : (nextLoanInstallment(loan) ? '<button class="success-btn" data-action="pay-next-loan" data-id="' + loan.id + '">Baixar próxima parcela</button>' : '');
    $('modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal loan-detail-modal"><div class="modal-title-row"><div><h2>' + escapeHtml(loan.name) + '</h2><p class="modal-desc">Detalhes do contrato e histórico financeiro</p></div><button class="modal-close" data-action="close-modal">×</button></div><div class="loan-detail-summary"><div><span>' + (balanceOnly ? 'Montante total' : 'Dívida total') + '</span><strong>' + money(loanTotalDebt(loan)) + '</strong></div><div><span>Pago</span><strong class="green">' + money(loanTotalPaid(loan)) + '</strong></div><div><span>Restante</span><strong class="red">' + money(loanReportRemaining(loan)) + '</strong></div></div><div class="loan-contract-progress"><div><span>Progresso do contrato</span><strong>' + progress.toLocaleString('pt-BR') + '%</strong></div><div class="loan-progress-track"><span style="width:' + progress + '%"></span></div></div><div class="row wrap loan-detail-actions"><button class="primary-btn" data-action="increase-loan" data-id="' + loan.id + '">+ Aumentar dívida</button>' + detailPaymentButton + '</div><div class="loan-detail-columns"><section><h3>Movimentos</h3><div class="loan-movement-list">' + (movements || '<div class="report-empty">Nenhum movimento.</div>') + '</div></section><section><h3>' + (balanceOnly ? 'Controle do montante' : 'Cronograma de parcelas') + '</h3>' + scheduleContent + '</section></div></div></div>';
  }

  function openSubscriptionForm(sub) {
    sub = sub || { id:'', name:'', kind:'Aplicativo', amount:'', billingCycle:'Mensal', dueDay:String(new Date().getDate()), startDate:todayBR(), active:true, notes:'' };
    var body = '<div class="form-grid">' + field('Nome', 'name', 'text', sub.name, 'required') + selectField('Tipo', 'kind', ['Aplicativo','Jogo','Streaming','Nuvem','Outro'], sub.kind) + field('Valor', 'amount', 'text', sub.amount ? money(sub.amount).replace('R$','').trim() : '', 'required') + selectField('Ciclo', 'billingCycle', ['Mensal','Trimestral','Anual'], sub.billingCycle) + field('Dia vencimento', 'dueDay', 'number', sub.dueDay || 1, 'min="1" max="31"') + field('Data início', 'startDate', 'date', dateInputFromBR(sub.startDate), 'required') + '<div class="field"><label>Status</label><select class="select" name="active"><option value="true" ' + (sub.active !== false ? 'selected' : '') + '>Ativa</option><option value="false" ' + (sub.active === false ? 'selected' : '') + '>Pausada</option></select></div>' + textareaField('Observação', 'notes', sub.notes || '') + '</div>';
    showModal(sub.id ? 'Editar assinatura' : 'Nova assinatura', 'Controle recorrências mensais, trimestrais e anuais.', body, function(fd){
      var obj = { id: sub.id || uid(), name: fd.get('name').trim(), kind: fd.get('kind'), amount: parseMoney(fd.get('amount')), billingCycle: fd.get('billingCycle'), dueDay: Number(fd.get('dueDay') || 1), startDate: dateBRFromInput(fd.get('startDate')), active: fd.get('active') === 'true', notes: fd.get('notes') || '' };
      if (!obj.name || obj.amount <= 0) return toast('Informe nome e valor.');
      var idx = state.subscriptions.findIndex(function(x){ return x.id === obj.id; });
      if (idx >= 0) state.subscriptions[idx] = obj; else state.subscriptions.push(obj);
      saveState(); closeModal(); render(); toast('Assinatura salva.');
    });
  }

  function openCategoryForm(module, existingName) {
    var labels = { income:'Receitas', expense:'Despesas', card:'Cartão', salary:'Salário', loan:'Empréstimos' };
    var suggestedColor = existingName ? categoryColor(module,existingName) : nextCategoryColor();
    var nameField = '<div class="field"><label for="name">Nome da categoria</label><input class="input" id="name" name="name" type="text" value="' + escapeHtml(existingName || '') + '" ' + (existingName ? 'readonly' : 'required') + '></div>';
    var colorField = '<div class="field category-color-field"><label for="categoryColor">Cor da categoria</label><input class="input category-color-input" id="categoryColor" name="categoryColor" type="color" value="' + suggestedColor + '" required><small id="category-color-value">' + suggestedColor + '</small></div>';
    var body = '<div class="form-grid">' + nameField + colorField + '</div><p class="form-note">Cada categoria deve possuir uma cor diferente das demais.</p>';
    showModal(existingName ? 'Definir cor' : 'Nova categoria', labels[module], body, function(fd){
      var name = fd.get('name').trim();
      var color = String(fd.get('categoryColor') || suggestedColor).toUpperCase();
      if (!name) return toast('Informe o nome.');
      if (categoryColorInUse(color,module,existingName || name)) return toast('Esta cor já está sendo usada. Escolha outra.');
      if (!existingName && state.categories[module].map(normalizeText).indexOf(normalizeText(name)) >= 0) return toast('Categoria já cadastrada.');
      if (!existingName) state.categories[module].push(name);
      setCategoryColor(module,name,color); saveState(); closeModal(); render(); toast(existingName ? 'Cor da categoria atualizada.' : 'Categoria criada com cor exclusiva.');
    }, 'small');
    var colorInput = $('categoryColor');
    colorInput.oninput = function(){ $('category-color-value').textContent = colorInput.value.toUpperCase(); };
  }

  function exportBackup() {
    saveState();
    var backupPackage = createBackupPackage();
    var data = JSON.stringify(backupPackage, null, 2);
    var blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    var now=new Date(),pad=function(value){return String(value).padStart(2,'0');};
    var stamp=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())+'_'+pad(now.getHours())+'-'+pad(now.getMinutes())+'-'+pad(now.getSeconds());
    a.download = 'rb-gestao-financeira-perfis-backup-' + stamp + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
    toast('Backup exportado.');
  }
  function chooseBackupFolder() {
    if (!root.rbDesktop || !root.rbDesktop.backup) return toast('Esta opção está disponível no aplicativo Windows instalado.');
    root.rbDesktop.backup.chooseFolder().then(function(status){ if(!status)return; backupStatus=status; render(); toast('Pasta de backup atualizada.'); }).catch(function(){toast('Não foi possível alterar a pasta.');});
  }
  function runAutomaticBackup() {
    if (!root.rbDesktop || !root.rbDesktop.backup) return toast('Esta opção está disponível no aplicativo Windows instalado.');
    saveState();
    root.rbDesktop.backup.runNow(createBackupPackage()).then(function(result){
      if(result && result.ok){backupStatus.lastBackupAt=result.at;backupStatus.lastBackupPath=result.path;backupStatus.lastError='';render();toast('Backup criado com sucesso.');}
      else toast('Não foi possível gerar o backup: '+(result&&result.error||'erro desconhecido'));
    }).catch(function(){toast('Não foi possível gerar o backup.');});
  }
  function updateSetting(target) {
    if (target.id === 'settings-theme') {
      appTheme = normalizeTheme(target.value,'dark');
      reportTheme = appTheme;
      try { if(root.localStorage)root.localStorage.setItem(THEME_STORE_KEY,appTheme); } catch(err){}
      applyAppTheme();
    }
    if (target.id === 'settings-start-month') appSettings.startMonth = target.value === 'current' ? 'current' : 'next';
    if (target.id === 'settings-backup-mode') appSettings.autoBackupMode = target.value;
    if (target.id === 'settings-backup-time') appSettings.backupTime = target.value;
    if (target.id === 'settings-backup-retention') appSettings.backupRetention = Number(target.value);
    appSettings = normalizeAppSettings(appSettings);
    saveAppSettings();
    render();
    toast('Configuração salva.');
  }
  function importBackupFile(file) {
    var reader = new FileReader();
    reader.onload = function(){
      try {
        var parsed = JSON.parse(reader.result);
        if (parsed && parsed.format === 'rb-gestao-profiles-v1' && parsed.profileStore) {
          profileStore = normalizeProfileStore(parsed.profileStore);
          state = profileStore.sharedData;
          saveProfileStore();
          render();
          toast('Backup de perfis importado com sucesso.');
        } else {
          state = normalizeState(parsed);
          saveState(); render(); toast('Backup antigo importado no perfil atual.');
        }
      } catch (err) { toast('Arquivo JSON inválido.'); }
    };
    reader.readAsText(file, 'utf-8');
  }

  function confirmAction(title, text, onYes) {
    $('modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal small"><h2>' + escapeHtml(title) + '</h2><p class="modal-desc">' + escapeHtml(text) + '</p><div class="actions"><button type="button" class="secondary-btn" data-action="close-modal">Cancelar</button><button type="button" class="danger-btn" id="confirm-yes">Confirmar</button></div></div></div>';
    $('confirm-yes').onclick = function(){ onYes(); closeModal(); };
  }
  function actionModule(action, button) {
    action=String(action||'');
    if(action.indexOf('investment')>=0)return 'investments';
    if(action.indexOf('saving')>=0)return 'accounts';
    if(action==='new-entry'||action.indexOf('entry')>=0)return 'entries';
    if(action.indexOf('bank-')>=0||action.indexOf('account')>=0)return 'accounts';
    if(action.indexOf('card')>=0||action==='pay-invoice')return 'cards';
    if(action.indexOf('salary')>=0)return 'salary';
    if(action.indexOf('loan')>=0)return 'loans';
    if(action.indexOf('subscription')>=0)return 'subscriptions';
    if(action.indexOf('home-')>=0)return 'home-expenses';
    if(action.indexOf('category')>=0)return 'categories';
    if(action.indexOf('institution')>=0)return 'institutions';
    if(action==='open-module-report'&&button)return button.getAttribute('data-report-module')||activeScreen;
    if(['choose-backup-folder','run-auto-backup','import-backup','reset-data','save-profile-permissions','save-remote-access','copy-remote-access-link','configure-mobile-connection'].indexOf(action)>=0)return 'settings';
    return activeScreen;
  }
  function actionPermission(action) {
    action=String(action||'');
    if(!action||['mobile-sidebar','toggle-sidebar','close-modal','cancel-profile-unlock','open-profiles','switch-profile','new-profile','edit-profile','delete-profile','open-module-report','open-loan-report','print-loan-report','loan-details','salary-loan-details','export-backup','toggle-all-loan-installments','open-inactive-accounts','open-inactive-cards','saving-history','investment-history','manage-investment-categories','home-bill-history','check-for-updates','force-update','open-permissions-popout','verify-update-modal','download-update-modal','pay-home-bill'].indexOf(action)>=0)return '';
    if(action.indexOf('new-')===0||action==='set-salary')return 'create';
    return 'edit';
  }
  function updateStatus(text,kind){var node=$('update-status');if(node){node.textContent=text;node.className='update-status '+(kind||'');}}
  async function checkForUpdates(force) {
    var api=root.rbDesktop&&root.rbDesktop.updates;if(!api)return updateStatus('A verificação fica disponível no aplicativo Windows instalado.','error');
    updateStatus(force?'Baixando a atualização mais recente...':'Verificando atualizações...','working');var result=await (force?api.force():api.check());
    if(!result||!result.ok)return updateStatus(result&&result.message||'Não foi possível verificar atualizações.','error');
    var newer=result.available&&compareVersions(result.version,APP_VERSION)>0;
    if(newer)updateStatus((force?'Atualização v':'Nova versão disponível: v')+result.version+(force?' baixada. Reinicie para concluir.':''),'success');else updateStatus('Você já está usando a versão mais recente.','success');
  }
  function openUpdateModal(force){
    $('modal-root').innerHTML='<div class="modal-backdrop"><div class="modal update-modal"><div class="modal-title-row"><div><span class="settings-kicker">ATUALIZAÇÃO DO SISTEMA</span><h2>Atualização</h2></div><button class="modal-close" data-action="close-modal">×</button></div><div class="update-summary"><div><span>Versão atual</span><strong>'+APP_VERSION+'</strong></div><div><span>Compilado</span><strong>'+BUILD_DATE+'</strong></div></div><div class="update-options"><label><input type="checkbox" checked disabled> Buscar atualizações automaticamente</label><label><input type="checkbox" checked disabled> Informar quando uma nova versão estiver disponível</label></div><fieldset class="update-actions"><legend>Funções</legend><div class="row wrap"><button class="primary-btn" data-action="verify-update-modal">Verificar atualização</button><button class="secondary-btn" data-action="download-update-modal">Atualizar agora</button></div></fieldset><div id="update-status" class="update-status">Pronto para verificar atualizações.</div><div class="update-source">→ Buscando em: <strong>GitHub Releases (somente versões mais novas)</strong></div></div></div>';
    if(force)checkForUpdates(true);
  }
  function openPermissionsPopout() {
    if(!isAdministrator(getActiveProfile()))return toast('Somente o administrador pode acessar as permissões.');
    $('modal-root').innerHTML='<div class="modal-backdrop"><div class="modal permissions-popout large"><button class="modal-close" data-action="close-modal">×</button>'+renderProfilePermissionsSettings()+'</div></div>';
  }
  function canRunAction(action,button) {
    var permission=actionPermission(action);
    return !permission||hasModulePermission(actionModule(action,button),permission);
  }
  function applyPermissionControls() {
    if(!root.document)return;
    Array.prototype.slice.call($('content').querySelectorAll('button[data-action]')).forEach(function(button){
      var action=button.getAttribute('data-action');
      if(!canRunAction(action,button)){button.disabled=true;button.title='Sem permissão para esta ação';button.classList.add('permission-disabled');}
    });
  }

  function handleClick(ev) {
    if (isMobileSidebar() && $('app-shell').classList.contains('mobile-sidebar-open') && !ev.target.closest('#sidebar')) setMobileSidebar(false);
    var btn = ev.target.closest('button');
    if (!btn) return;
    var screen = btn.getAttribute('data-screen');
    if (screen) return setScreen(screen);
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');
    if (!action) return;
    if (isMobileSidebar() && $('app-shell').classList.contains('mobile-sidebar-open')) setMobileSidebar(true);
    if (action === 'toggle-theme') return toggleAppTheme();
    if (!canRunAction(action,btn)) return toast('Este perfil não possui permissão para esta ação.');
    if (action === 'open-module-report') return openModuleReport(btn.getAttribute('data-report-module'));
    if (action === 'toggle-sidebar') return toggleSidebar();
    if (action === 'mobile-sidebar') return toggleMobileSidebar();
    if (action === 'cancel-profile-unlock') { profileUnlockRequired = false; return closeModal(); }
    if (action === 'close-modal') return closeModal();
    if (action === 'open-profiles') return openProfilesModal();
    if (action === 'new-profile') return openProfileForm();
    if (action === 'save-profile-permissions') return saveProfilePermissions();
    if (action === 'save-remote-access') return saveRemoteAccessSettings();
    if (action === 'check-for-updates') return openUpdateModal(false);
    if (action === 'force-update') return openUpdateModal(true);
    if (action === 'verify-update-modal') return checkForUpdates(false);
    if (action === 'download-update-modal') return checkForUpdates(true);
    if (action === 'open-permissions-popout') return openPermissionsPopout();
    if (action === 'copy-remote-access-link') return copyRemoteAccessLink();
    if (action === 'configure-mobile-connection') { try { root.ReactNativeWebView.postMessage(JSON.stringify({type:'configure-connection'})); } catch (_) {} return; }
    if (action === 'edit-profile') return editProtectedProfile(id);
    if (action === 'delete-profile') return deleteProtectedProfile(id);
    if (action === 'switch-profile') return switchProfile(id);
    if (action === 'new-bank-account') return openBankAccountForm();
    if (action === 'edit-account') return openBankAccountForm(state.bankAccounts.find(function(item){return item.id===id;}));
    if (action === 'open-inactive-accounts') return inactiveManager('accounts');
    if (action === 'inactivate-account') return confirmAction('Inativar conta','A conta sairá da tela principal, mas todo o histórico será preservado.',function(){var account=state.bankAccounts.find(function(item){return item.id===id;});if(account){account.active=false;account.isMain=false;saveState();render();toast('Conta inativada.');}});
    if (action === 'reactivate-account') { var inactiveAccount=state.bankAccounts.find(function(item){return item.id===id;});if(inactiveAccount){inactiveAccount.active=true;saveState();closeModal();render();toast('Conta reativada.');}return; }
    if (action === 'account-details') return openAccountDetails(id);
    if (action === 'new-bank-transaction') return openBankTransactionForm(null,btn.getAttribute('data-account'));
    if (action === 'edit-bank-transaction') { var bankMovement=state.bankTransactions.find(function(item){return item.id===id;});return bankMovement&&bankMovement.transferGroupId?openBankTransfer(bankMovement.transferGroupId):openBankTransactionForm(bankMovement); }
    if (action === 'delete-bank-transaction') { var movement=state.bankTransactions.find(function(item){return item.id===id;});if(!movement)return;return confirmAction('Excluir movimentação',movement.transferGroupId?'As duas pontas da transferência serão removidas.':'O saldo da conta será recalculado.',function(){state.bankTransactions=movement.transferGroupId?state.bankTransactions.filter(function(item){return item.transferGroupId!==movement.transferGroupId;}):state.bankTransactions.filter(function(item){return item.id!==id;});saveState();closeModal();render();toast('Movimentação excluída e saldo atualizado.');}); }
    if (action === 'new-bank-transfer') return openBankTransfer();
    if (action === 'new-saving-box') return openSavingBoxForm();
    if (action === 'edit-saving-box') return openSavingBoxForm(state.savingsBoxes.find(function(item){return item.id===id;}));
    if (action === 'new-saving-movement') return openSavingMovementForm(id);
    if (action === 'saving-history') return openSavingHistory(id);
    if (action === 'delete-saving-box') return confirmAction('Excluir caixinha','O histórico da reserva também será removido. O saldo bancário não será alterado.',function(){state.savingsBoxes=state.savingsBoxes.filter(function(item){return item.id!==id;});state.savingsMovements=state.savingsMovements.filter(function(item){return item.boxId!==id;});saveState();render();toast('Caixinha excluída.');});
    if (action === 'new-investment') return openInvestmentForm();
    if (action === 'edit-investment') return openInvestmentForm(state.investments.find(function(item){return item.id===id;}));
    if (action === 'new-investment-movement') return openInvestmentMovementForm(id);
    if (action === 'investment-history') return openInvestmentHistory(id);
    if (action === 'manage-investment-categories') return manageInvestmentCategories();
    if (action === 'new-investment-category') return openInvestmentCategoryForm();
    if (action === 'delete-investment-category') { var investmentGroup=btn.getAttribute('data-group'),investmentCategory=btn.getAttribute('data-name');if(state.investments.some(function(item){return item.category===investmentGroup&&item.subcategory===investmentCategory;}))return toast('Esta categoria está vinculada a um investimento e não pode ser excluída.');return confirmAction('Excluir categoria','A categoria personalizada será removida.',function(){state.investmentCategories[investmentGroup]=(state.investmentCategories[investmentGroup]||[]).filter(function(name){return name!==investmentCategory;});saveState();closeModal();render();toast('Categoria de investimento excluída.');}); }
    if (action === 'delete-investment') return confirmAction('Excluir investimento','A posição, o histórico, as transferências bancárias vinculadas e as receitas geradas serão removidos.',function(){var movementIds=state.investmentMovements.filter(function(item){return item.investmentId===id||item.destinationInvestmentId===id;}).map(function(item){return item.id;});state.investments=state.investments.filter(function(item){return item.id!==id;});state.investmentMovements=state.investmentMovements.filter(function(item){return item.investmentId!==id&&item.destinationInvestmentId!==id;});state.bankTransactions=state.bankTransactions.filter(function(item){return item.relatedInvestmentId!==id&&movementIds.indexOf(item.relatedInvestmentMovementId)<0;});state.entries=state.entries.filter(function(item){return movementIds.indexOf(item.relatedInvestmentMovementId)<0;});saveState();render();toast('Investimento e vínculos removidos.');});
    if (action === 'new-institution') return openInstitutionForm();
    if (action === 'edit-institution') return openInstitutionForm(institutionById(id));
    if (action === 'delete-institution') { var linked=state.bankAccounts.some(function(item){return item.financialInstitutionId===id;})||state.cards.some(function(item){return item.financialInstitutionId===id;});if(linked)return toast('Esta instituição possui contas ou cartões vinculados e não pode ser excluída.');return confirmAction('Excluir instituição','A instituição será removida do catálogo.',function(){state.financialInstitutions=state.financialInstitutions.filter(function(item){return item.id!==id;});saveState();render();toast('Instituição excluída.');}); }
    if (action === 'new-entry') return openEntryForm();
    if (action === 'edit-entry') return openEntryForm(state.entries.find(function(e){ return e.id === id; }));
    if (action === 'toggle-entry') { var e = state.entries.find(function(x){ return x.id === id; }); if (e) { e.status = e.status === 'Pago' ? 'Previsto' : 'Pago'; saveState(); render(); } return; }
    if (action === 'delete-entry') return confirmAction('Excluir transação', 'Esta ação não pode ser desfeita.', function(){ state.entries = state.entries.filter(function(e){ return e.id !== id; }); saveState(); render(); toast('Transação excluída.'); });
    if (action === 'new-card') return openCardForm();
    if (action === 'edit-card') return openCardForm(state.cards.find(function(c){ return c.id === id; }));
    if (action === 'open-inactive-cards') return inactiveManager('cards');
    if (action === 'inactivate-card') return confirmAction('Inativar cartão','O cartão sairá da tela principal, mas compras e faturas anteriores serão preservadas.',function(){var card=state.cards.find(function(item){return item.id===id;});if(card){card.active=false;saveState();render();toast('Cartão inativado.');}});
    if (action === 'reactivate-card') { var inactiveCard=state.cards.find(function(item){return item.id===id;});if(inactiveCard){inactiveCard.active=true;saveState();closeModal();render();toast('Cartão reativado.');}return; }
    if (action === 'delete-card') {
      var hasHistory=state.cardTransactions.some(function(t){return t.cardId===id;})||state.invoicePayments.some(function(p){return p.cardId===id;})||state.bankTransactions.some(function(t){return t.relatedCardId===id;});
      if(hasHistory)return toast('Este cartão possui histórico. Edite o nome ou deixe-o sem uso para preservar compras, faturas e pagamentos.');
      return confirmAction('Excluir cartão', 'O cartão será removido da lista. Nenhum histórico financeiro será apagado.', function(){ state.cards = state.cards.filter(function(c){ return c.id !== id; }); saveState(); render(); toast('Cartão excluído.'); });
    }
    if (action === 'new-card-transaction') return openCardTransactionForm(null, btn.getAttribute('data-card'));
    if (action === 'edit-card-transaction') return openCardTransactionForm(state.cardTransactions.find(function(t){ return t.id === id; }));
    if (action === 'delete-card-transaction') return confirmAction('Excluir compra', 'A compra será removida das faturas.', function(){ state.cardTransactions = state.cardTransactions.filter(function(t){ return t.id !== id; }); saveState(); render(); toast('Compra excluída.'); });
    if (action === 'pay-invoice') return openInvoicePayment(id);
    if (action === 'set-salary') return openSalaryBaseForm();
    if (action === 'new-salary-item') return openSalaryItemForm();
    if (action === 'edit-salary-item') { var r = salaryRecordForMonth(selectedMonth); return openSalaryItemForm((r.items || []).find(function(i){ return i.id === id; })); }
    if (action === 'salary-loan-details') return openSalaryLoanDetails(id);
    if (action === 'toggle-salary-loan-payment') { var salaryLoan=findSalaryLoan(id); var salaryMonth=btn.getAttribute('data-month'); if(salaryLoan && salaryMonth){ salaryLoan.paidMonths=salaryLoan.paidMonths||[]; salaryLoan.paidMonths=salaryLoan.paidMonths.indexOf(salaryMonth)>=0 ? salaryLoan.paidMonths.filter(function(month){return month!==salaryMonth;}) : salaryLoan.paidMonths.concat([salaryMonth]); saveState(); openSalaryLoanDetails(id); render(); } return; }
    if (action === 'delete-salary-item') return confirmAction('Excluir item', 'O item será removido. Contratos de empréstimo serão excluídos de toda a vigência.', function(){ var r=salaryRecordForMonth(selectedMonth); var target=(r.items||[]).find(function(i){return i.id===id;}); if(salaryItemIsLoan(target)){ state.salaryRecords.forEach(function(record){record.items=(record.items||[]).filter(function(i){return i.id!==id;});}); } else { r.items=(r.items||[]).filter(function(i){return i.id!==id;}); upsertSalaryRecord(r); } saveState(); render(); toast('Item excluído.'); });
    if (action === 'new-loan') return openLoanForm();
    if (action === 'open-loan-report') return openLoanReport(btn.getAttribute('data-kind'));
    if (action === 'print-loan-report') return printLoanReport();
    if (action === 'increase-loan') return openLoanAdjustment(id);
    if (action === 'edit-loan') return openLoanForm(state.loans.find(function(l){ return l.id === id; }));
    if (action === 'delete-loan') return confirmAction('Excluir empréstimo', 'O contrato e suas baixas serão removidos.', function(){ state.loans = state.loans.filter(function(l){ return l.id !== id; }); saveState(); render(); toast('Empréstimo excluído.'); });
    if (action === 'pay-loan-balance') return openLoanBalancePayment(id);
    if (action === 'pay-next-loan') { var l=state.loans.find(function(x){return x.id===id;}); var n=l&&nextLoanInstallment(l); if(n) return openLoanPayment(id,n.number); return; }
    if (action === 'loan-details') return openLoanDetails(id);
    if (action === 'pay-loan-installment') return openLoanPayment(id,Number(btn.getAttribute('data-number')));
    if (action === 'toggle-all-loan-installments') { var installmentChecks=Array.prototype.slice.call(document.querySelectorAll('input[name="loan-installment-select"]')); var shouldSelect=installmentChecks.some(function(input){return !input.checked;}); installmentChecks.forEach(function(input){input.checked=shouldSelect;}); btn.textContent=shouldSelect?'Desmarcar todas':'Selecionar todas'; return; }
    if (action === 'delete-selected-loan-installments') { var selectedLoan=state.loans.find(function(x){return x.id===id;}); var selectedNumbers=Array.prototype.slice.call(document.querySelectorAll('input[name="loan-installment-select"]:checked')).map(function(input){return Number(input.value);}); if(!selectedLoan || !selectedNumbers.length) return toast('Selecione pelo menos uma parcela.'); return confirmAction('Excluir parcelas selecionadas','Serão excluídas '+selectedNumbers.length+' parcela(s) e suas respectivas baixas.',function(){ var remaining=applyLoanInstallmentDeletion(selectedLoan,selectedNumbers); if(!selectedLoan.openEnded && remaining===0) state.loans=state.loans.filter(function(item){return item.id!==selectedLoan.id;}); saveState(); render(); toast('Parcelas selecionadas excluídas.'); }); }
    if (action === 'delete-last-loan-installment') { var lastLoan=state.loans.find(function(x){return x.id===id;}); if(!lastLoan)return; var activeSchedule=loanSchedule(lastLoan,addMonthsKey(selectedMonth,lastLoan.openEnded?3:0)); var lastInstallment=activeSchedule[activeSchedule.length-1]; if(!lastInstallment)return toast('Não há parcelas para excluir.'); return confirmAction('Excluir última parcela','A parcela '+lastInstallment.number+' e suas baixas serão removidas.',function(){ var remaining=applyLoanInstallmentDeletion(lastLoan,[lastInstallment.number]); if(!lastLoan.openEnded && remaining===0) state.loans=state.loans.filter(function(item){return item.id!==lastLoan.id;}); saveState(); render(); toast('Última parcela excluída.'); }); }
    if (action === 'delete-all-loan-installments') { var allLoan=state.loans.find(function(x){return x.id===id;}); if(!allLoan)return; return confirmAction('Excluir todas as parcelas','Isso removerá o contrato completo, todas as parcelas e todas as baixas.',function(){ state.loans=state.loans.filter(function(item){return item.id!==allLoan.id;}); saveState(); render(); toast('Contrato e parcelas excluídos.'); }); }
    if (action === 'clear-loan-installment-payments') { var loan=state.loans.find(function(x){return x.id===id;}); var number=Number(btn.getAttribute('data-number')); if(loan){ loan.payments=(loan.payments||[]).filter(function(payment){return Number(payment.number)!==number;}); saveState(); openLoanDetails(id); render(); toast('Baixas da parcela estornadas.'); } return; }
    if (action === 'delete-loan-payment') { var paymentLoan=state.loans.find(function(x){return x.id===id;}); var paymentIndex=Number(btn.getAttribute('data-payment-index')); if(paymentLoan && paymentLoan.payments && paymentLoan.payments[paymentIndex]){ paymentLoan.payments.splice(paymentIndex,1); saveState(); openLoanDetails(id); render(); toast('Transação parcial estornada.'); } return; }
    if (action === 'delete-loan-adjustment') { var adjustmentLoan=state.loans.find(function(x){return x.id===id;}); var movementId=btn.getAttribute('data-movement'); if(adjustmentLoan){ adjustmentLoan.adjustments=(adjustmentLoan.adjustments||[]).filter(function(item){return item.id!==movementId;}); saveState(); openLoanDetails(id); render(); toast('Aumento removido do histórico.'); } return; }
    if (action === 'new-subscription') return openSubscriptionForm();
    if (action === 'edit-subscription') return openSubscriptionForm(state.subscriptions.find(function(s){ return s.id === id; }));
    if (action === 'toggle-subscription') { var s=state.subscriptions.find(function(x){return x.id===id;}); if(s){s.active = s.active === false; saveState(); render();} return; }
    if (action === 'delete-subscription') return confirmAction('Excluir assinatura', 'A assinatura será removida.', function(){ state.subscriptions = state.subscriptions.filter(function(s){ return s.id !== id; }); saveState(); render(); toast('Assinatura excluída.'); });
    if (action === 'new-home-resident') return openHomeResidentForm();
    if (action === 'edit-home-resident') return openHomeResidentForm(homeResident(id));
    if (action === 'toggle-home-resident') { var resident=homeResident(id); if(resident){resident.active=resident.active===false;saveState();render();toast(resident.active?'Morador ativado.':'Morador desativado.');} return; }
    if (action === 'delete-home-resident') return confirmAction('Excluir morador','Ele será removido das contas, confirmações e dívidas compartilhadas.',function(){var home=homeExpensesData();home.residents=home.residents.filter(function(item){return item.id!==id;});home.bills.forEach(function(bill){bill.participantIds=(bill.participantIds||[]).filter(function(item){return item!==id;});if(bill.payerId===id)bill.payerId='';if(bill.confirmations)delete bill.confirmations[id];Object.keys(bill.monthlyRecords||{}).forEach(function(month){var record=bill.monthlyRecords[month];if(record.payerId===id)record.payerId='';if(record.confirmations)delete record.confirmations[id];});});home.residentDebts=home.residentDebts.filter(function(debt){return debt.debtorId!==id&&debt.creditorId!==id;});if(home.currentResidentId===id)home.currentResidentId='';saveState();render();toast('Morador excluído.');});
    if (action === 'new-home-bill') return openHomeBillForm();
    if (action === 'edit-home-bill') return openHomeBillForm(homeExpensesData().bills.find(function(item){return item.id===id;}));
    if (action === 'delete-home-bill') return confirmAction('Excluir conta','A conta compartilhada será removida.',function(){homeExpensesData().bills=homeExpensesData().bills.filter(function(item){return item.id!==id;});saveState();render();toast('Conta excluída.');});
    if (action === 'toggle-home-payment') { var bill=homeExpensesData().bills.find(function(item){return item.id===id;}), residentId=btn.getAttribute('data-resident-id'); if(bill&&residentId){var monthRecord=homeBillMonthRecord(bill,selectedMonth,true);monthRecord.confirmations=monthRecord.confirmations||{};monthRecord.confirmations[residentId]=!monthRecord.confirmations[residentId];monthRecord.paidDate=Object.keys(monthRecord.confirmations).some(function(key){return monthRecord.confirmations[key];})?todayBR():'';monthRecord.updatedAt=new Date().toISOString();saveState();render();toast(monthRecord.confirmations[residentId]?'Pagamento confirmado em '+todayBR()+' para a competência '+monthTitle(selectedMonth)+'.':'Confirmação de '+monthTitle(selectedMonth)+' removida.');} return; }
    if (action === 'home-bill-history') return openHomeBillHistory(homeExpensesData().bills.find(function(item){return item.id===id;}));
    if (action === 'pay-home-bill') return openHomeBillPayment(homeExpensesData().bills.find(function(item){return item.id===id;}));
    if (action === 'new-home-debt') return openHomeDebtForm();
    if (action === 'edit-home-debt') return openHomeDebtForm(homeDebt(id));
    if (action === 'toggle-home-debt') { var debt=homeDebt(id);if(debt){var settled=debt.status!=='Quitada';debt.status=settled?'Quitada':'Pendente';debt.paidDate=settled?todayBR():'';debt.updatedAt=new Date().toISOString();saveState();render();toast(settled?'Dívida marcada como quitada.':'Dívida reaberta.');}return; }
    if (action === 'delete-home-debt') return confirmAction('Excluir dívida entre moradores','O registro do acerto será removido permanentemente.',function(){homeExpensesData().residentDebts=homeExpensesData().residentDebts.filter(function(item){return item.id!==id;});saveState();render();toast('Dívida entre moradores excluída.');});
    if (action === 'new-category') return openCategoryForm(btn.getAttribute('data-module'));
    if (action === 'edit-category-color') return openCategoryForm(btn.getAttribute('data-module'),btn.getAttribute('data-name'));
    if (action === 'delete-category') return confirmAction('Excluir categoria', 'Os lançamentos existentes continuam com o texto antigo.', function(){ var m=btn.getAttribute('data-module'); var n=btn.getAttribute('data-name'); state.categories[m]=state.categories[m].filter(function(c){return c!==n;}); if(!state.categories[m].length) state.categories[m]=clone(defaultCategories[m]); state.categoryColors=ensureCategoryColors(state.categories,state.categoryColors); saveState(); render(); toast('Categoria excluída.'); });
    if (action === 'export-backup') return exportBackup();
    if (action === 'import-backup') return $('import-file').click();
    if (action === 'choose-backup-folder') return chooseBackupFolder();
    if (action === 'run-auto-backup') return runAutomaticBackup();
    if (action === 'reset-data') return confirmAction('Zerar base financeira', 'Todos os dados financeiros compartilhados por todos os usuários serão apagados.', function(){ state = defaultState(); saveState(); render(); toast('Base financeira zerada.'); });
  }

  function init() {
    if (!root.document) return;
    if ($('app-version')) $('app-version').textContent='Versão '+APP_VERSION;
    loadAppSettings();
    loadState();
    loadUiState();
    loadThemeState();
    loadSidebarState();
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape') closeModal(); });
    $('prev-month').addEventListener('click', function(){ selectedMonth = addMonthsKey(selectedMonth, -1); saveUiState(); render(); });
    $('next-month').addEventListener('click', function(){ selectedMonth = addMonthsKey(selectedMonth, 1); saveUiState(); render(); });
    $('month-label').addEventListener('click', function(){ selectedMonth = addMonthsKey(monthKey(new Date()), 1); saveUiState(); render(); toast('Voltou para o próximo mês.'); });
    $('nav-search').addEventListener('input', function(ev){ navSearchText = ev.target.value; renderNav(); });
    $('content').addEventListener('input', function(ev){ if (ev.target && ev.target.id === 'search-box') { searchText = ev.target.value; render(); var box=$('search-box'); if(box){ box.focus(); box.selectionStart = box.selectionEnd = box.value.length; } } });
    $('content').addEventListener('change', function(ev){
      var target = ev.target;
      if (!target || !target.id) return;
      if (target.id === 'permissions-profile-select') { permissionsProfileId=target.value; render(); return; }
      if (target.id.indexOf('settings-') === 0) { if(!hasModulePermission('settings','edit')){toast('Este perfil não pode editar configurações.');render();return;} return updateSetting(target); }
      if (target.id === 'home-current-resident') { homeExpensesData().currentResidentId=target.value; saveState(); render(); return; }
      var bindings = {
        'cards-status-filter':['cards','status'], 'cards-sort':['cards','sort'],
        'cards-purchase-card-filter':['cards','purchaseCard'], 'cards-purchase-category-filter':['cards','purchaseCategory'], 'cards-purchase-sort':['cards','purchaseSort'],
        'dashboard-type-filter':['dashboard','type'], 'dashboard-category-filter':['dashboard','category'], 'dashboard-sort':['dashboard','sort'],
        'entries-type-filter':['entries','type'], 'entries-status-filter':['entries','status'], 'entries-category-filter':['entries','category'], 'entries-sort':['entries','sort'],
        'salary-type-filter':['salary','type'], 'salary-sort':['salary','sort'],
        'loans-direction-filter':['loans','direction'], 'loans-status-filter':['loans','status'], 'loans-sort':['loans','sort'],
        'subscriptions-status-filter':['subscriptions','status'], 'subscriptions-cycle-filter':['subscriptions','cycle'], 'subscriptions-sort':['subscriptions','sort'],
        'categories-module-filter':['categories','module'], 'categories-sort':['categories','sort'],
        'investment-category-filter':['investments','category'], 'investment-status-filter':['investments','status'], 'investment-movement-filter':['investments','movementType'], 'patrimony-period-filter':['investments','patrimonyPeriod']
      };
      var binding = bindings[target.id];
      if (!binding) return;
      viewOptions[binding[0]][binding[1]] = target.value;
      saveUiState();
      render();
    });
    $('import-file').addEventListener('change', function(ev){ if (ev.target.files && ev.target.files[0]) importBackupFile(ev.target.files[0]); ev.target.value = ''; });
    saveAppSettings();
    refreshBackupStatus();
    refreshRemoteAccessStatus();
    if (root.rbDesktop && root.rbDesktop.backup) root.rbDesktop.backup.onCompleted(function(result){ backupStatus=Object.assign({},backupStatus,{lastBackupAt:result.at,lastBackupPath:result.path,lastError:''}); if(activeScreen==='settings')render(); toast('Backup automático concluído.'); });
    root.addEventListener('rb-profile-store-updated',function(event){
      if(!event || !event.detail)return;
      var localActiveProfileId=profileStore&&profileStore.activeProfileId;
      profileStore=normalizeProfileStore(event.detail);
      if(localActiveProfileId&&profileStore.profiles.some(function(profile){return profile.id===localActiveProfileId;}))profileStore.activeProfileId=localActiveProfileId;
      state=profileStore.sharedData;
      render();
    });
    if (root.rbDesktop && root.rbDesktop.sync) root.rbDesktop.sync.onIncoming(function(payload){
      if (payload && payload.profileStore) {
        var desktopActiveProfileId = profileStore && profileStore.activeProfileId;
        profileStore = normalizeProfileStore(payload.profileStore);
        if (desktopActiveProfileId && profileStore.profiles.some(function(profile){return profile.id===desktopActiveProfileId;})) profileStore.activeProfileId=desktopActiveProfileId;
        state = profileStore.sharedData;
        saveProfileStore(false);
        render();
        toast('Dados atualizados pelo aplicativo mobile.');
        return;
      }
      var transactions = payload && Array.isArray(payload.transactions) ? payload.transactions : [];
      if (!transactions.length) return;
      var imported = 0;
      transactions.forEach(function(item){
        var id = 'mobile-' + String(item.id || uid());
        if (state.entries.some(function(entry){ return entry.id === id; })) return;
        state.entries.push({ id:id, title:String(item.title || 'Lançamento móvel'), amount:Number(item.amount || 0), type:item.kind === 'Receita' ? 'Receita' : 'Despesa', category:String(item.category || state.categories.expense[0]), date:String(item.date || todayBR()), status:item.status === 'Confirmado' ? 'Pago' : 'Previsto', notes:'Enviado pelo RB Gestão Mobile' });
        imported++;
      });
      if (imported) { saveState(); render(); toast(imported + ' lançamento(s) recebido(s) do aplicativo mobile.'); }
    });
    render();
    lockActiveProfileOnStart();
  }

  var Core = {
    defaultState: defaultState,
    normalizeState: normalizeState,
    ensureCategoryColors: ensureCategoryColors,
    categoryPaletteColor: categoryPaletteColor,
    createProfileStoreFromLegacy: createProfileStoreFromLegacy,
    normalizeProfileStore: normalizeProfileStore,
    parseMoney: parseMoney,
    toCents: toCents,
    moneyFromCents: moneyFromCents,
    identifyFinancialInstitution: function(description,customState){var old=state;state=normalizeState(customState||defaultState());var found=identifyFinancialInstitution(description,state.financialInstitutions);state=old;return found;},
    accountFinancials: function(customState,accountId){var old=state;state=normalizeState(customState);var account=state.bankAccounts.find(function(item){return item.id===accountId;}),out=account?accountFinancials(account):null;state=old;return out;},
    bankingSummary: function(customState){var old=state;state=normalizeState(customState);var out=bankingSummary();state=old;return out;},
    savingsBoxBalanceCents: function(customState,boxId){var old=state;state=normalizeState(customState);var out=savingsBoxBalanceCents(boxId);state=old;return out;},
    investmentStats: function(customState){var old=state;state=normalizeState(customState);var out=investmentStats();state=old;return out;},
    patrimonySummary: function(customState){var old=state;state=normalizeState(customState);var out=patrimonySummary();state=old;return out;},
    money: money,
    parseDateBR: parseDateBR,
    formatDateBR: formatDateBR,
    monthFromBR: monthFromBR,
    addMonthsKey: addMonthsKey,
    buildRecurringEntries: buildRecurringEntries,
    applyRecurringEntryEdit: applyRecurringEntryEdit,
    loanSchedule: loanSchedule,
    calculateLoanValues: calculateLoanValues,
    applyLoanInstallmentDeletion: applyLoanInstallmentDeletion,
    loanTotalDebt: loanTotalDebt,
    loanTotalPaid: loanTotalPaid,
    loanReportRemaining: loanReportRemaining,
    loanMovementHistory: loanMovementHistory,
    loanPortfolioStats: loanPortfolioStats,
    loanEvolutionPoints: loanEvolutionPoints,
    nextSubscriptionDue: nextSubscriptionDue,
    subscriptionMonthlyEquivalent: subscriptionMonthlyEquivalent,
    subscriptionAmountForMonth: subscriptionAmountForMonth,
    monthlyMovements: function(customState, key) { var old=state; state=normalizeState(customState); var out=monthlyMovements(key); state=old; return out; },
    cardTransactionIsBilledIn: cardTransactionIsBilledIn,
    cardBilledAmount: cardBilledAmount,
    cardSummary: function(customState, key) {
      var old=state;
      state=normalizeState(customState);
      var transactions=state.cardTransactions.filter(function(t){ return cardTransactionIsBilledIn(t,key); });
      var out=cardSummary(state.cards,key,transactions);
      state=old;
      return out;
    },
    dashboard: function(customState, key) { var old = state; state = normalizeState(customState); var out = dashboard(key); state = old; return out; },
    _setStateForTest: function(customState){ state = normalizeState(customState); }
  };

  root.RBFinanceCore = Core;
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  if (root.document) document.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);
