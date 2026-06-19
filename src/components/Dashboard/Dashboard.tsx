import React from 'react';
import {
  TrendingUp, TrendingDown, Minus, Landmark, CreditCard, Banknote,
  ArrowUpRight, ArrowDownRight, LineChart,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { useApp } from '../../contexts/AppContext';
import {
  getMonthIncome, getMonthExpense, getTotalAssetsKRW, getCashBalance,
  getTotalCardUsage, getAssetTrend, getNetWorth, getCardOutstanding,
  getRangeIncome, getRangeExpense, accountCurrentKRW,
  getCurrencyBreakdownKRW, getAssetClassBreakdownKRW, getNetWorthTrend,
} from '../../utils/calculations';
import { formatCurrency, getYearMonth, getPastMonths, formatMonth, getPayPeriod, getPastPayPeriods } from '../../utils/formatters';
import { fromKRW, toKRW } from '../../utils/currency';
import { totalHoldingsKRW } from '../../utils/pricing';

function SummaryCard({
  title, value, subtitle, icon: Icon, color, trend,
}: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType; color: string; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
            trend === 'up' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400'
            : trend === 'down' ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400'
            : 'text-gray-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {trend === 'up' ? <ArrowUpRight size={12} /> : trend === 'down' ? <ArrowDownRight size={12} /> : <Minus size={12} />}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

const CHART_COLORS = { income: '#10B981', expense: '#F43F5E', assets: '#6366F1' };

function DonutCard({ title, data, fmt }: {
  title: string;
  data: { name: string; value: number; color: string }[];
  fmt: (n: number) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
      {total <= 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">표시할 데이터가 없습니다</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-28 h-28 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={34} outerRadius={52} paddingAngle={2} stroke="none">
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {data.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {((d.value / total) * 100).toFixed(1)}%
                  <span className="text-gray-400 text-xs font-normal ml-1.5">{fmt(d.value)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label, currency }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>;
  label?: string; currency: string;
}) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) => formatCurrency(v, currency as 'KRW' | 'VND' | 'USD');
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600 dark:text-gray-300">{
            p.name === 'income' ? '수입' : p.name === 'expense' ? '지출' : '자산'
          }:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { transactions, accounts, cards, budgets, holdings, settings, setCurrentPage, rates, displayCurrency } = useApp();
  const currentMonth = getYearMonth();
  const currency = displayCurrency;
  // KRW 기준 금액을 표시 통화로 환산해 포맷
  const fmt = (krw: number) => formatCurrency(fromKRW(krw, displayCurrency, rates), displayCurrency);
  // 차트용: KRW → 표시 통화 숫자
  const conv = (krw: number) => Math.round(fromKRW(krw, displayCurrency, rates));

  const payday = settings.payday;
  const weekendAdjust = settings.paydayWeekendAdjust !== false;
  const period = payday ? getPayPeriod(payday, new Date(), weekendAdjust) : null;
  const income = period ? getRangeIncome(transactions, period.start, period.end) : getMonthIncome(transactions, currentMonth);
  const expense = period ? getRangeExpense(transactions, period.start, period.end) : getMonthExpense(transactions, currentMonth);
  const net = income - expense;
  const holdingsKRW = totalHoldingsKRW(holdings, rates);
  const totalAssets = getTotalAssetsKRW(accounts, rates, transactions) + holdingsKRW;
  const cardOutstanding = getCardOutstanding(transactions, cards, currentMonth);
  const netWorth = getNetWorth(accounts, cards, transactions, rates, currentMonth) + holdingsKRW;
  const cashBalance = getCashBalance(accounts, rates, transactions);
  const cardUsage = getTotalCardUsage(transactions, currentMonth);

  const months = getPastMonths(6);
  const assetTrend = getAssetTrend(transactions, accounts, months, rates);

  const monthlyStats = payday
    ? getPastPayPeriods(6, payday, weekendAdjust).map((p) => ({
        month: `${new Date(p.start).getMonth() + 1}월`,
        income: conv(getRangeIncome(transactions, p.start, p.end)),
        expense: conv(getRangeExpense(transactions, p.start, p.end)),
      }))
    : months.map((m) => ({
        month: formatMonth(m).replace('년 ', '\n').replace('월', ''),
        income: conv(getMonthIncome(transactions, m)),
        expense: conv(getMonthExpense(transactions, m)),
      }));

  // 차트 Y축 라벨 (표시 통화에 맞게)
  const axisFmt = (v: number) =>
    displayCurrency === 'KRW' ? `${(v / 10000).toFixed(0)}만`
    : displayCurrency === 'USD' ? `$${(v / 1000).toFixed(0)}k`
    : `${(v / 1000000).toFixed(0)}M`;

  const budget = budgets.find((b) => b.month === currentMonth);
  const budgetTotalKRW = budget ? toKRW(budget.totalBudget, budget.currency ?? 'KRW', rates) : 0;
  const budgetUsed = budget && budgetTotalKRW > 0 ? Math.round((expense / budgetTotalKRW) * 100) : null;

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // [4] 순자산 전월 대비 / 이번 기간 저축액
  const thisSavings = net;
  const prevNetWorth = netWorth - thisSavings;
  const momPct = prevNetWorth !== 0 ? (thisSavings / Math.abs(prevNetWorth)) * 100 : 0;

  // [6.1] 순자산 추이 (최근 12개월)
  const months12 = getPastMonths(12);
  const nwTrend = getNetWorthTrend(netWorth, transactions, months12).map((p) => ({
    month: `${new Date(p.month + '-01').getMonth() + 1}월`,
    net: conv(p.net),
  }));

  // [1] 통화별 자산 비중
  const curBreak = getCurrencyBreakdownKRW(accounts, holdings, transactions, rates);
  const currencyPie = [
    { name: 'KRW', value: Math.max(0, Math.round(curBreak.KRW)), color: '#6366F1' },
    { name: 'USD', value: Math.max(0, Math.round(curBreak.USD)), color: '#10B981' },
    { name: 'VND', value: Math.max(0, Math.round(curBreak.VND)), color: '#F59E0B' },
  ].filter((d) => d.value > 0);

  // [6.2] 자산 클래스 비중
  const cls = getAssetClassBreakdownKRW(accounts, holdings, cards, transactions, rates, currentMonth);
  const classPie = [
    { name: '현금', value: Math.max(0, Math.round(cls.cash)), color: '#3B82F6' },
    { name: '예금', value: Math.max(0, Math.round(cls.deposit)), color: '#10B981' },
    { name: '투자', value: Math.max(0, Math.round(cls.investment)), color: '#8B5CF6' },
    { name: '카드', value: Math.max(0, Math.round(cls.card)), color: '#EF4444' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {period && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">급여일 기준</span>
          이번 기간 {period.label}
        </div>
      )}

      {/* [4] 순자산 히어로 카드 */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-indigo-200 text-sm mb-1">총 순자산</p>
        <p className="text-3xl sm:text-4xl font-bold">{fmt(netWorth)}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4">
          <div>
            <p className="text-indigo-200 text-xs mb-0.5">전월 대비</p>
            <p className={`text-sm font-semibold ${thisSavings >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
              {thisSavings >= 0 ? '+' : ''}{fmt(thisSavings)} ({momPct >= 0 ? '+' : ''}{momPct.toFixed(1)}%)
            </p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs mb-0.5">이번 달 저축액</p>
            <p className={`text-sm font-semibold ${net >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
              {net >= 0 ? '+' : ''}{fmt(net)}
            </p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs mb-0.5">총자산 / 카드</p>
            <p className="text-sm font-semibold">{fmt(totalAssets)} / -{fmt(cardOutstanding)}</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard
          title="이번달 수입" value={fmt(income)}
          icon={TrendingUp} color="bg-emerald-500" trend="up"
        />
        <SummaryCard
          title="이번달 지출" value={fmt(expense)}
          icon={TrendingDown} color="bg-rose-500" trend="down"
        />
        <SummaryCard
          title="순이익" value={fmt(net)}
          icon={Minus} color={net >= 0 ? 'bg-indigo-500' : 'bg-orange-500'}
          trend={net > 0 ? 'up' : net < 0 ? 'down' : 'neutral'}
        />
        <SummaryCard
          title="총 자산" value={fmt(totalAssets)}
          icon={Landmark} color="bg-blue-500"
        />
        <SummaryCard
          title="카드 사용액" value={fmt(cardUsage)}
          icon={CreditCard} color="bg-purple-500"
          subtitle="이번달 미결제"
        />
        <SummaryCard
          title="현금 보유액" value={fmt(cashBalance)}
          icon={Banknote} color="bg-amber-500"
        />
        <SummaryCard
          title="증권 평가액" value={fmt(holdingsKRW)}
          icon={LineChart} color="bg-violet-500"
        />
      </div>

      {/* [6.1] 순자산 추이 (최근 12개월) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          순자산 추이 <span className="text-xs font-normal text-gray-400">최근 12개월</span>
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={nwTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:opacity-20" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={axisFmt} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip currency={displayCurrency} />} />
            <Area type="monotone" dataKey="net" name="순자산" stroke="#6366F1" strokeWidth={2.5} fill="url(#nwGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* [1] 통화별 비중 + [6.2] 자산 비중 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <DonutCard title="통화별 자산 비중" data={currencyPie} fmt={fmt} />
        <DonutCard title="자산 비중 (유형별)" data={classPie} fmt={fmt} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Asset trend chart */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">월별 수입/지출 추이</h2>
              <p className="text-xs text-gray-400 mt-0.5">최근 6개월</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyStats} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.income} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.income} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.expense} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.expense} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={axisFmt} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Legend formatter={(v) => v === 'income' ? '수입' : '지출'} />
              <Area type="monotone" dataKey="income" stroke={CHART_COLORS.income} strokeWidth={2.5} fill="url(#incomeGrad)" />
              <Area type="monotone" dataKey="expense" stroke={CHART_COLORS.expense} strokeWidth={2.5} fill="url(#expenseGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Budget */}
          {budget && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">이번달 예산</h3>
                <button onClick={() => setCurrentPage('budget')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">자세히</button>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(expense)}</span>
                <span className="text-sm text-gray-400">/ {fmt(budgetTotalKRW)}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetUsed && budgetUsed > 90 ? 'bg-rose-500' : budgetUsed && budgetUsed > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(budgetUsed || 0, 100)}%` }}
                />
              </div>
              <p className={`text-xs mt-1.5 ${budgetUsed && budgetUsed > 90 ? 'text-rose-500' : 'text-gray-400'}`}>
                {budgetUsed !== null ? `예산의 ${budgetUsed}% 사용` : '예산 미설정'}
              </p>
            </div>
          )}

          {/* Asset breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">자산 현황</h3>
              <button onClick={() => setCurrentPage('assets')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">자세히</button>
            </div>
            <div className="space-y-2.5">
              {[...accounts.filter((a) => a.type !== 'securities')]
                .map((acc) => ({ acc, krw: accountCurrentKRW(acc, transactions, rates) }))
                .sort((a, b) => Math.abs(b.krw) - Math.abs(a.krw))
                .slice(0, 4)
                .map(({ acc, krw }) => (
                  <div key={acc.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: acc.color }} />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{acc.name}</span>
                    </div>
                    <span className={`text-sm font-semibold ${acc.isLiability ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                      {acc.isLiability ? '-' : ''}{fmt(Math.abs(krw))}
                    </span>
                  </div>
                ))}
              {accounts.filter((a) => a.type !== 'securities').length > 4 && (
                <p className="text-xs text-gray-400 text-center">외 {accounts.filter((a) => a.type !== 'securities').length - 4}개</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">최근 거래</h2>
          <button onClick={() => setCurrentPage('transactions')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">전체보기</button>
        </div>
        <div className="space-y-3">
          {recentTransactions.map((t) => (
            <RecentTransactionRow key={t.id} transaction={t} currency={currency} />
          ))}
          {recentTransactions.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">거래 내역이 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentTransactionRow({ transaction: t }: {
  transaction: import('../../types').Transaction;
  currency: string;
}) {
  const { categories, rates, displayCurrency } = useApp();
  const cat = categories.find((c) => c.id === t.categoryId);
  const isIncome = t.type === 'income';
  const isTransfer = t.type === 'transfer';
  const krw = t.amountKRW ?? t.amount;
  const amountStr = formatCurrency(fromKRW(krw, displayCurrency, rates), displayCurrency);
  const sign = isTransfer ? '' : isIncome ? '+' : '-';
  const color = isTransfer
    ? 'text-gray-500 dark:text-gray-400'
    : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const label = isTransfer ? '이체' : (cat?.name || '기타');
  const icon = isTransfer ? '⇄' : isIncome ? '↑' : '↓';
  const iconColor = isTransfer ? '#6B7280' : (cat?.color || '#6B7280');

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconColor + '20' }}
        >
          <span className="text-base" style={{ color: iconColor }}>{icon}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-xs text-gray-400">{t.paymentMethod} · {t.date}</p>
        </div>
      </div>
      <span className={`text-sm font-bold ${color}`}>
        {sign}{amountStr}
        {t.currency && t.currency !== 'KRW' && (
          <span className="ml-1 text-xs text-gray-400">({formatCurrency(t.amount, t.currency)})</span>
        )}
      </span>
    </div>
  );
}
