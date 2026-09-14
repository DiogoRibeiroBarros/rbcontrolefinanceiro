const assert = require('node:assert/strict');
const core = require('../app/app.js');

const state = core.defaultState();
state.bankAccounts = [
  { id:'a', name:'Principal', type:'Conta corrente', initialBalanceCents:150000, overdraftLimitCents:200000, active:true },
  { id:'b', name:'Reserva', type:'Conta digital', initialBalanceCents:100000, overdraftLimitCents:0, active:true }
];
state.bankTransactions = [
  { id:'t1', bankAccountId:'a', type:'Despesa', direction:'debit', amountCents:200000, transactionDate:'01/09/2026' },
  { id:'t2', bankAccountId:'a', relatedAccountId:'b', type:'Transferência', direction:'debit', amountCents:50000, transferGroupId:'g1', transactionDate:'02/09/2026' },
  { id:'t3', bankAccountId:'b', relatedAccountId:'a', type:'Transferência', direction:'credit', amountCents:50000, transferGroupId:'g1', transactionDate:'02/09/2026' }
];

const account = core.accountFinancials(state,'a');
assert.equal(account.balance,-100000);
assert.equal(account.used,100000);
assert.equal(account.available,100000);
assert.equal(account.total,100000);

const summary = core.bankingSummary(state);
assert.equal(summary.balance,50000, 'transferência não pode alterar o patrimônio total');
assert.equal(summary.patrimony,50000, 'cheque especial não pode compor patrimônio');
assert.equal(summary.overdraft,100000, 'somente limite especial ainda disponível');

assert.equal(core.identifyFinancialInstitution('Meu cartão pessoal NUBANK Mastercard',state).id,'bank-nubank');
assert.equal(core.identifyFinancialInstitution('Cartão Visa Click Itaú',state).id,'bank-itau');
assert.equal(core.identifyFinancialInstitution('Inter Mastercard Black',state).id,'bank-inter');

const migrated=core.normalizeState({cards:[{id:'c1',name:'Nubank Ultravioleta',brandName:'Mastercard',lastDigits:'1234'}]});
assert.equal(migrated.cards[0].financialInstitutionId,'bank-nubank');
assert.equal(migrated.cards[0].cardBrand,'Mastercard');
assert.equal(migrated.cards[0].lastFourDigits,'1234');

assert.equal(core.toCents('1.234,56'),123456);

const wealth = core.defaultState();
wealth.bankAccounts = [{ id:'main', name:'Principal', type:'Conta corrente', initialBalanceCents:1000000, overdraftLimitCents:0, active:true }];
wealth.savingsBoxes = [{ id:'box', name:'Reserva', bankAccountId:'main', initialBalanceCents:250000, targetCents:500000, status:'Ativa' }];
wealth.savingsMovements = [{ id:'save', boxId:'box', type:'Guardar', direction:'in', amountCents:50000, date:'10/09/2026' }];
wealth.investments = [{ id:'inv', name:'CDB', category:'Renda Fixa', subcategory:'CDB', investedCents:400000, currentValueCents:430000, status:'Ativo' }];
wealth.investmentMovements = [{ id:'application', investmentId:'inv', type:'Aplicação', amountCents:400000, date:'10/09/2026', realized:false }];
assert.equal(core.savingsBoxBalanceCents(wealth,'box'),300000,'caixinha deve manter saldo reservado próprio');
const investments=core.investmentStats(wealth);
assert.equal(investments.invested,400000);
assert.equal(investments.current,430000);
assert.equal(investments.result,30000,'aporte não pode ser tratado como rentabilidade');
const patrimony=core.patrimonySummary(wealth);
assert.equal(patrimony.available,700000,'disponível deve descontar caixinhas do saldo bancário');
assert.equal(patrimony.reserved,300000);
assert.equal(patrimony.total,1430000,'caixinha não pode ser somada novamente ao patrimônio');
console.log('Núcleo bancário: saldos, cheque especial, transferências e migração aprovados.');
