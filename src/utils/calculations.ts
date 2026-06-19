import { Transaction, Account, Card, Budget, Category, Holding } from '../types';
import { getMonthRange } from './formatters';
import { FxRates, toKRW } from './currency';

// 거래의 KRW 환산액 (입력 시점 스냅샷 우선, 없으면 KRW로 간주 — 기존 데이터 호환)
export function txKRW(t: Transaction): number {
  return t.amountKRW ?? t.amount;
}

export function getMonthTransactions(transactions: Transaction[], yearMonth: string): Transaction[] {
  const { start, end } = getMonthRange(yearMonth);
  return transactions.filter((t) => t.date >= start && t.date <= end);
}

// 기간(날짜 범위) 내 거래
export function getRangeTransactions(transactions: Transaction[], start: string, end: string): Transaction[] {
  return transactions.filter((t) => t.date >= start && t.date <= end);
}

export function getRangeIncome(transactions: Transaction[], start: string, end: string): number {
  return getRangeTransactions(transactions, start, end)
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + txKRW(t), 0);
}

export function getRangeExpense(transactions: Transaction[], start: string, end: string): number {
  return getRangeTransactions(transactions, start, end)
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + txKRW(t), 0);
}

export function getRangeCategoryExpenses(transactions: Transaction[], start: string, end: string): Record<string, number> {
  const result: Record<string, number> = {};
  getRangeTransactions(transactions, start, end)
    .filter((t) => t.type === 'expense')
    .forEach((t) => { result[t.categoryId] = (result[t.categoryId] || 0) + txKRW(t); });
  return result;
}

export function getMonthIncome(transactions: Transaction[], yearMonth: string): number {
  return getMonthTransactions(transactions, yearMonth)
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + txKRW(t), 0);
}

export function getMonthExpense(transactions: Transaction[], yearMonth: string): number {
  return getMonthTransactions(transactions, yearMonth)
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + txKRW(t), 0);
}

export function getTotalAssets(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.balance, 0);
}

// 계좌 잔액을 KRW로 환산 (기준 잔액만)
export function accountKRW(a: Account, rates: FxRates): number {
  return toKRW(a.balance, a.currency, rates);
}

// 특정 계좌로 인한 거래 증감 합계 (KRW) — 수입 +, 지출 −, 이체 입출금 반영
export function accountDeltaKRW(accountId: string, transactions: Transaction[]): number {
  let d = 0;
  for (const t of transactions) {
    const v = txKRW(t);
    if (t.type === 'income' && t.accountId === accountId) d += v;
    else if (t.type === 'expense' && t.accountId === accountId) d -= v;
    else if (t.type === 'transfer') {
      if (t.isExchange) {
        // 환전: 출금 = 출금액 + 수수료, 입금 = 입금액 (각자 통화 KRW 스냅샷)
        if (t.fromAccountId === accountId) d -= (v + (t.feeKRW ?? 0));
        if (t.toAccountId === accountId) d += (t.toAmountKRW ?? v);
      } else {
        if (t.toAccountId === accountId) d += v;
        if (t.fromAccountId === accountId) d -= v;
      }
    }
  }
  return d;
}

// 거래까지 반영한 계좌의 현재 잔액 (KRW)
export function accountCurrentKRW(a: Account, transactions: Transaction[], rates: FxRates): number {
  return accountKRW(a, rates) + accountDeltaKRW(a.id, transactions);
}

// 거래까지 반영한 계좌의 현재 잔액 (계좌 통화 기준)
export function accountCurrentNative(a: Account, transactions: Transaction[], rates: FxRates): number {
  const deltaKRW = accountDeltaKRW(a.id, transactions);
  if (a.currency === 'USD') return a.balance + (rates.USD > 0 ? deltaKRW / rates.USD : 0);
  if (a.currency === 'VND') return a.balance + (rates.VND > 0 ? deltaKRW / rates.VND : 0);
  return a.balance + deltaKRW;
}

// 자산성 계좌 합계 (부채 + 증권 제외 — 증권은 증권관리(보유종목)에서 따로 합산), KRW
// transactions를 넘기면 거래까지 반영한 현재 잔액으로 합산
export function getTotalAssetsKRW(accounts: Account[], rates: FxRates, transactions?: Transaction[]): number {
  return accounts
    .filter((a) => !a.isLiability && a.type !== 'securities')
    .reduce((sum, a) => sum + (transactions ? accountCurrentKRW(a, transactions, rates) : accountKRW(a, rates)), 0);
}

// 부채성 계좌 합계 (예: 카드형 계좌), KRW
export function getLiabilitiesKRW(accounts: Account[], rates: FxRates, transactions?: Transaction[]): number {
  return accounts
    .filter((a) => a.isLiability)
    .reduce((sum, a) => sum + (transactions ? accountCurrentKRW(a, transactions, rates) : accountKRW(a, rates)), 0);
}

// 카드 미결제액 합계 (이번 달 카드 사용액), KRW
export function getCardOutstanding(transactions: Transaction[], cards: Card[], yearMonth: string): number {
  return cards.reduce((sum, c) => sum + getCardUsage(transactions, c.id, yearMonth), 0);
}

// 순자산 = 자산 − 부채계좌 − 카드미결제액, KRW
export function getNetWorth(
  accounts: Account[],
  cards: Card[],
  transactions: Transaction[],
  rates: FxRates,
  yearMonth: string
): number {
  return (
    getTotalAssetsKRW(accounts, rates, transactions)
    - getLiabilitiesKRW(accounts, rates, transactions)
    - getCardOutstanding(transactions, cards, yearMonth)
  );
}

// 통화별 자산 비중 (KRW 환산) — 계좌 현재잔액 + 보유종목, 부채 제외
export function getCurrencyBreakdownKRW(
  accounts: Account[],
  holdings: Holding[],
  transactions: Transaction[],
  rates: FxRates,
): Record<string, number> {
  const out: Record<string, number> = { KRW: 0, USD: 0, VND: 0 };
  accounts.filter((a) => !a.isLiability).forEach((a) => {
    out[a.currency] = (out[a.currency] || 0) + accountCurrentKRW(a, transactions, rates);
  });
  holdings.forEach((h) => {
    const v = (h.lastPrice ?? 0) * h.quantity; // native
    const krw = h.currency === 'USD' ? v * rates.USD : h.currency === 'VND' ? v * rates.VND : v;
    out[h.currency] = (out[h.currency] || 0) + krw;
  });
  return out;
}

// 자산 클래스별 비중 (KRW): 현금 / 예금 / 투자 / 카드(부채)
export function getAssetClassBreakdownKRW(
  accounts: Account[],
  holdings: Holding[],
  cards: Card[],
  transactions: Transaction[],
  rates: FxRates,
  yearMonth: string,
): { cash: number; deposit: number; investment: number; card: number } {
  let cash = 0, deposit = 0, investment = 0, card = 0;
  accounts.forEach((a) => {
    const v = accountCurrentKRW(a, transactions, rates);
    if (a.isLiability || a.type === 'card') card += v;
    else if (a.type === 'cash' || a.type === 'bank') cash += v;
    else if (a.type === 'deposit' || a.type === 'savings') deposit += v;
    else if (a.type === 'securities') investment += v;
    else cash += v;
  });
  investment += totalHoldingsKRWInternal(holdings, rates);
  card += getCardOutstanding(transactions, cards, yearMonth);
  return { cash, deposit, investment, card };
}

// 순자산 추이 (KRW) — 현재 순자산에서 매월 저축(수입-지출)을 역산
export function getNetWorthTrend(
  currentNetWorthKRW: number,
  transactions: Transaction[],
  months: string[],
): Array<{ month: string; net: number }> {
  const result: Array<{ month: string; net: number }> = [];
  let running = currentNetWorthKRW;
  const reversed = [...months].reverse();
  for (const m of reversed) {
    result.unshift({ month: m, net: Math.round(running) });
    running -= (getMonthIncome(transactions, m) - getMonthExpense(transactions, m));
  }
  return result;
}

// 보유종목 평가액 합계(KRW) — pricing.ts 의존 없이 내부 계산
function totalHoldingsKRWInternal(holdings: Holding[], rates: FxRates): number {
  return holdings.reduce((s, h) => {
    const v = (h.lastPrice ?? 0) * h.quantity;
    return s + (h.currency === 'USD' ? v * rates.USD : h.currency === 'VND' ? v * rates.VND : v);
  }, 0);
}

export function getCashBalance(accounts: Account[], rates?: FxRates, transactions?: Transaction[]): number {
  return accounts
    .filter((a) => a.type === 'cash')
    .reduce((sum, a) => {
      if (rates && transactions) return sum + accountCurrentKRW(a, transactions, rates);
      if (rates) return sum + accountKRW(a, rates);
      return sum + a.balance;
    }, 0);
}

export function getCardUsage(transactions: Transaction[], cardId: string, yearMonth: string): number {
  return getMonthTransactions(transactions, yearMonth)
    .filter((t) => t.cardId === cardId && t.type === 'expense')
    .reduce((sum, t) => sum + txKRW(t), 0);
}

export function getTotalCardUsage(transactions: Transaction[], yearMonth: string): number {
  return getMonthTransactions(transactions, yearMonth)
    .filter((t) => t.cardId && t.type === 'expense')
    .reduce((sum, t) => sum + txKRW(t), 0);
}

export function getCategoryExpenses(
  transactions: Transaction[],
  yearMonth: string
): Record<string, number> {
  const result: Record<string, number> = {};
  getMonthTransactions(transactions, yearMonth)
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      result[t.categoryId] = (result[t.categoryId] || 0) + txKRW(t);
    });
  return result;
}

export function getBudgetUsage(
  budget: Budget | undefined,
  transactions: Transaction[]
): { total: number; byCategory: Record<string, number> } {
  if (!budget) return { total: 0, byCategory: {} };
  const totalSpent = getMonthExpense(transactions, budget.month);
  const byCategory = getCategoryExpenses(transactions, budget.month);
  return { total: totalSpent, byCategory };
}

export function getMonthlyStats(
  transactions: Transaction[],
  months: string[]
): Array<{ month: string; income: number; expense: number; net: number }> {
  return months.map((m) => {
    const income = getMonthIncome(transactions, m);
    const expense = getMonthExpense(transactions, m);
    return { month: m, income, expense, net: income - expense };
  });
}

export function getCategoryRanking(
  transactions: Transaction[],
  categories: Category[],
  yearMonth: string
): Array<{ category: Category; amount: number; percentage: number }> {
  const expenses = getCategoryExpenses(transactions, yearMonth);
  const total = Object.values(expenses).reduce((s, v) => s + v, 0);

  return Object.entries(expenses)
    .map(([categoryId, amount]) => {
      const category = categories.find((c) => c.id === categoryId);
      if (!category) return null;
      return { category, amount, percentage: total > 0 ? (amount / total) * 100 : 0 };
    })
    .filter(Boolean)
    .sort((a, b) => b!.amount - a!.amount) as Array<{
    category: Category;
    amount: number;
    percentage: number;
  }>;
}

export function getGoalProgress(targetAmount: number, currentAmount: number): number {
  if (targetAmount <= 0) return 0;
  return Math.min((currentAmount / targetAmount) * 100, 100);
}

export function estimateGoalDate(
  targetAmount: number,
  currentAmount: number,
  monthlyNet: number
): Date | null {
  const remaining = targetAmount - currentAmount;
  if (monthlyNet <= 0 || remaining <= 0) return null;
  const monthsNeeded = Math.ceil(remaining / monthlyNet);
  const date = new Date();
  date.setMonth(date.getMonth() + monthsNeeded);
  return date;
}

export function getAssetTrend(
  transactions: Transaction[],
  accounts: Account[],
  months: string[],
  rates?: FxRates
): Array<{ month: string; assets: number }> {
  const currentTotal = rates ? getTotalAssetsKRW(accounts, rates) : getTotalAssets(accounts);
  const result: Array<{ month: string; assets: number }> = [];

  let runningTotal = currentTotal;
  const reversedMonths = [...months].reverse();

  for (const month of reversedMonths) {
    result.unshift({ month, assets: Math.max(0, runningTotal) });
    const income = getMonthIncome(transactions, month);
    const expense = getMonthExpense(transactions, month);
    runningTotal -= income - expense;
  }
  return result;
}
