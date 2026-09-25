const {app,BrowserWindow}=require('electron');
const fs=require('fs/promises');const path=require('path');
const root=path.resolve(__dirname,'../..'),out=path.resolve(__dirname,'../microsoft-store/imagens');
app.setPath('userData',path.join(__dirname,'demo-user-data'));
const Core=require(path.join(root,'app/app.js'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const s=Core.defaultState();
 s.entries=[['Consultoria',1800,'Receita','Vendas','08','Pago'],['Mercado',640,'Despesa','Mercado','05','Pago'],['Energia elétrica',185,'Despesa','Casa','12','Pago'],['Internet residencial',120,'Despesa','Casa','15','Pago'],['Plano de saúde',350,'Despesa','Plano de saúde','25','Previsto'],['Manutenção do carro',280,'Despesa','Mecânico','28','Previsto']].map((a,i)=>({id:'e'+i,title:a[0],amount:a[1],type:a[2],category:a[3],date:a[4]+'/09/2026',status:a[5],notes:''}));
 s.salaryRecords=[{month:'2026-09',grossSalary:6500,items:[{id:'s1',name:'Descontos em folha',type:'Desconto',valueMode:'Valor',value:780,fixedMonthly:true}],notes:''}];
 s.bankAccounts=[{id:'a1',name:'Conta do dia a dia',financialInstitutionId:'bank-itau',initialBalanceCents:845000,type:'Conta corrente',isMain:true,active:true},{id:'a2',name:'Conta de reserva',financialInstitutionId:'bank-inter',initialBalanceCents:1230000,type:'Conta corrente',active:true}];
 s.savingsBoxes=[{id:'b1',name:'Reserva de emergência',bankAccountId:'a2',initialBalanceCents:1000000,targetCents:1500000,status:'Ativa',category:'Reserva'},{id:'b2',name:'Próximas férias',bankAccountId:'a1',initialBalanceCents:250000,targetCents:600000,status:'Ativa',category:'Viagem'}];
 s.investments=[{id:'i1',name:'CDB de longo prazo',bankAccountId:'a2',category:'Renda Fixa',subcategory:'CDB',investedCents:1800000,currentValueCents:1935000,status:'Ativo'},{id:'i2',name:'Carteira de fundos',bankAccountId:'a2',category:'Fundos',subcategory:'Fundo Multimercado',investedCents:750000,currentValueCents:792000,status:'Ativo'}];
 s.cards=[{id:'c1',name:'Cartão principal',financialInstitutionId:'bank-itau',bankAccountId:'a1',lastFourDigits:'1234',limit:4000,closingDay:25,dueDay:5,colorName:'Laranja',brandName:'Visa',cardBrand:'Visa',active:true},{id:'c2',name:'Cartão de compras',financialInstitutionId:'bank-inter',bankAccountId:'a2',lastFourDigits:'5678',limit:5000,closingDay:20,dueDay:10,colorName:'Laranja',brandName:'Mastercard',cardBrand:'Mastercard',active:true}];
 s.cardTransactions=[{id:'ct1',cardId:'c1',title:'Notebook para estudos',amount:3600,category:'Compras',date:'03/09/2026',billingMonthOffset:0,installments:6,recurrenceMonths:0,consumeTotalLimit:true},{id:'ct2',cardId:'c2',title:'Compras do mês',amount:485,category:'Mercado',date:'09/09/2026',billingMonthOffset:0,installments:1,recurrenceMonths:0}];
 s.subscriptions=[{id:'sub1',name:'Streaming de filmes',kind:'Streaming',amount:39.9,billingCycle:'Mensal',dueDay:10,startDate:'10/09/2026',active:true},{id:'sub2',name:'Armazenamento digital',kind:'Aplicativo',amount:14.9,billingCycle:'Mensal',dueDay:18,startDate:'18/09/2026',active:true}];
 s.loans=[{id:'l1',name:'Reforma planejada',direction:'Peguei emprestado',principalAmount:4800,installmentAmount:400,installments:12,firstDueDate:'10/09/2026',payments:[]}];
 s.homeExpenses.residents=[{id:'r1',name:'Ana',color:'#b7ff3c'},{id:'r2',name:'Bruno',color:'#7c9cff'}];s.homeExpenses.currentResidentId='r1';
 const store=Core.createProfileStoreFromLegacy(s);store.profiles[0].name='Demonstração';
 const win=new BrowserWindow({width:1920,height:1080,useContentSize:true,show:false,webPreferences:{contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',(_e,_l,msg)=>{if(msg.includes('Error'))console.log(msg)});
 win.setContentSize(1920,1080);win.webContents.setZoomFactor(0.85);await win.loadFile(path.join(root,'app/index.html'));
 await win.webContents.executeJavaScript(`localStorage.setItem('rb_gestao_financeira_profiles_v1',${JSON.stringify(JSON.stringify(store))});sessionStorage.setItem('rb_gestao_financeira_windows_ui_v120',JSON.stringify({activeScreen:'dashboard',selectedMonth:'2026-09'}));`);
 await win.reload();await wait(600);
 await win.webContents.executeJavaScript(`document.querySelector('#profile-login-form')?.requestSubmit();`);await wait(400);
 await win.webContents.executeJavaScript(`document.querySelector('[data-screen="home-expenses"]').click();document.querySelector('[data-action="new-home-bill"]').click();document.querySelector('#title').value='Aluguel';document.querySelector('#amount').value='1800';document.querySelector('#billingType').value='Fixa mensal';document.querySelector('#dueDay').value='10';document.querySelector('#startMonth').value='2026-09';document.querySelectorAll('.participant-percentage').forEach(e=>e.value='50');document.querySelector('#modal-form').requestSubmit();`);
 await wait(4500);for(const [i,screen] of ['dashboard','accounts','investments','cards','home-expenses','reports'].entries()){
  await win.webContents.executeJavaScript(`document.querySelector('[data-screen="${screen}"]').click()`);await wait(1500);
  const title=await win.webContents.executeJavaScript(`document.querySelector('#screen-title').textContent`);
  await fs.writeFile(path.join(out,`${String(i+1).padStart(2,'0')}-${screen}.png`),(await win.webContents.capturePage()).toPNG());console.log(screen+': '+title);
 }
 await fs.writeFile(path.join(__dirname,'demo-state.json'),JSON.stringify(store,null,2));win.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1)});


