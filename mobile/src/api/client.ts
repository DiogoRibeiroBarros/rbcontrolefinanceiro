import { DashboardSummary, Transaction } from '../types';
import { SyncConfiguration, synchronize } from './sync';

// O aplicativo inicia vazio e só apresenta dados recebidos do desktop ou
// criados pelo próprio usuário. Não há registros financeiros de demonstração.
const summary: DashboardSummary = {
  profileName: 'Perfil não sincronizado',
  period: '',
  expectedBalance: 0,
  netSalary: 0,
  expectedIncome: 0,
  expectedExpenses: 0,
  cardsLimit: 0,
  cardsAvailable: 0,
  cardsInvoices: 0,
};

let transactions: Transaction[] = [];

const pause = () => new Promise((resolve) => setTimeout(resolve, 350));

export const mobileApi = {
  async signIn(email: string, password: string) {
    await pause();
    if (!email.trim() || !password.trim()) throw new Error('Informe e-mail e senha.');
    return { token: 'demo-mobile-token', name: 'DiogoRB' };
  },
  async getDashboard() {
    await pause();
    return summary;
  },
  async getTransactions() {
    await pause();
    return [...transactions];
  },
  async createTransaction(transaction: Transaction) {
    await pause();
    transactions = [transaction, ...transactions];
    return transaction;
  },
  async sync(config: SyncConfiguration, pendingTransactions: Transaction[] = []) {
    return synchronize(config, pendingTransactions);
  },
};
