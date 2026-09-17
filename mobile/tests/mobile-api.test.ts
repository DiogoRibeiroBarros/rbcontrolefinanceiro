import assert from 'node:assert/strict';
import { mobileApi } from '../src/api/client';

async function run() {
  await assert.rejects(() => mobileApi.signIn('', ''), /Informe e-mail e senha/);
  const session = await mobileApi.signIn('diogo@rbgestao.com', '123456');
  assert.equal(session.name, 'DiogoRB');
  assert.ok(session.token.length > 0);

  const dashboard = await mobileApi.getDashboard();
  assert.equal(dashboard.profileName, 'Perfil não sincronizado');
  assert.ok(Number.isFinite(dashboard.expectedBalance));

  const before = await mobileApi.getTransactions();
  assert.equal(before.length, 0);
  const created = await mobileApi.createTransaction({ id: 'test-transaction', title: 'Teste de lançamento', category: 'Teste', amount: 42.5, kind: 'Receita', date: '11/09/2026', status: 'Pendente' });
  assert.equal(created.amount, 42.5);
  const after = await mobileApi.getTransactions();
  assert.equal(after.length, before.length + 1);
  assert.equal(after[0].id, 'test-transaction');

  const sync = await mobileApi.sync({ baseUrl: '', accessToken: '' }, []);
  assert.equal(sync.mode, 'offline');
  assert.match(sync.message, /não configurada/i);
  console.log('API móvel: autenticação, painel, lançamento e sincronização aprovados.');
}

run().catch((error) => { console.error(error); process.exit(1); });
