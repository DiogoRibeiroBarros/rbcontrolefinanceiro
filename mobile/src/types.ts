export type TransactionKind = 'Receita' | 'Despesa';

export type Transaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  kind: TransactionKind;
  date: string;
  status: 'Confirmado' | 'Pendente';
};

export type DashboardSummary = {
  profileName: string;
  period: string;
  expectedBalance: number;
  netSalary: number;
  expectedIncome: number;
  expectedExpenses: number;
  cardsLimit: number;
  cardsAvailable: number;
  cardsInvoices: number;
};
