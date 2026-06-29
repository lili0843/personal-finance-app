import React, { useState } from 'react';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useApp } from '../../contexts/AppContext';
import {
  getNetWorth, getRangeIncome, getRangeExpense, accountValueKRW, accountCurrentNative,
  getCurrencyBreakdownKRW, getAssetClassBreakdownKRW, getNetWorthTrend,
  getMonthIncome, getMonthExpense,
} from '../../utils/calculations';
import { formatCurrency, getYearMonth, getPastMonths, getPayPeriod, getTodayString } from '../../utils/formatters';
import { fromKRW } from '../../utils/currency';
import { Transaction, Currency } from '../../types';
import CurrencyBadge from '../common/CurrencyBadge';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 미니 KPI 카드
function KpiCard({ title, value, icon: Icon, color }: {
  title: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

// 기간 요약(오늘/이번주/이번달)
function PeriodCard({ label, inc, exp, fmt }: { label: string; inc: number; exp: number; fmt: (n: number) => string }) {
  const net = inc - exp;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2.5">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">수입</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmt(inc)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">지출</span>
          <span className="font-medium text-rose-600 dark:text-rose-400">{fmt(exp)}</span>
        </div>
        <div className="flex justify-between text-sm pt-1.5 border-t border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-300 font-medium">순변동</span>
          <span className={`font-bold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {net >= 0 ? '+' : '-'}{fmt(Math.abs(net))}
          </span>
        </div>
      </div>
    </div>
  );
}

function Donut({ data, fmt }: { data: { name: string; value: number; color: string }[]; fmt: (n: number) => string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <p className="text-sm text-gray-400 py-10 text-center">표시할 데이터가 없습니다</p>;
  return (
    <div className="flex items-center gap-5">
      <div className="w-32 h-32 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={2} stroke="none">
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
  );
}

function NwTooltip({ active, payload, label, fmt }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string; fmt: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{fmt(payload[0].value)}</p>
    </div>
  );
}

const TYPE_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'income', label: '수입' },
  { key: 'expense', label: '지출' },
  { key: 'exchange', label: '환전' },
  { key: 'transfer', label: '이체' },
];

export default function Dashboard() {
  const { transactions, accounts, cards, settings, setCurrentPage, rates, displayCurrency } = useApp();
  const currentMonth = getYearMonth();
  const fmt = (krw: number) => formatCurrency(fromKRW(krw, displayCurrency, rates), displayCurrency);
  const fmtDisp = (disp: number) => formatCurrency(disp, displayCurrency);

  const [allocView, setAllocView] = useState<'currency' | 'class'>('currency');
  const [recentFilter, setRecentFilter] = useState<string>('all');

  // 이번 기간(급여일/월) 수입·지출·저축
  const payday = settings.payday;
  const weekendAdjust = settings.paydayWeekendAdjust !== false;
  const period = payday ? getPayPeriod(payday, new Date(), weekendAdjust) : null;
  const income = period ? getRangeIncome(transactions, period.start, period.end) : getMonthIncome(transactions, currentMonth);
  const expense = period ? getRangeExpense(transactions, period.start, period.end) : getMonthExpense(transactions, currentMonth);
  const net = income - expense;

  const netWorth = getNetWorth(accounts, cards, transactions, rates, currentMonth);
  const prevNetWorth = netWorth - net;
  const momPct = prevNetWorth !== 0 ? (net / Math.abs(prevNetWorth)) * 100 : 0;

  // 오늘 / 이번주 / 이번달
  const today = getTodayString();
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 월=0
  const monday = new Date(now); monday.setDate(now.getDate() - dow);
  const periods = [
    { label: '오늘', start: today, end: today },
    { label: '이번주', start: ymd(monday), end: today },
    { label: '이번달', start: `${currentMonth}-01`, end: today },
  ].map((r) => ({
    ...r,
    inc: getRangeIncome(transactions, r.start, r.end),
    exp: getRangeExpense(transactions, r.start, r.end),
  }));

  // 순자산 추이 (12개월)
  const conv = (krw: number) => Math.round(fromKRW(krw, displayCurrency, rates));
  const months12 = getPastMonths(12);
  const nwTrend = getNetWorthTrend(netWorth, transactions, months12).map((p) => ({
    month: `${new Date(p.month + '-01').getMonth() + 1}월`,
    net: conv(p.net),
  }));
  const axisFmt = (v: number) =>
    displayCurrency === 'KRW' ? `${(v / 10000).toFixed(0)}만`
    : displayCurrency === 'USD' ? `$${(v / 1000).toFixed(0)}k`
    : `${(v / 1000000).toFixed(0)}M`;

  // 자산 비중 (통화 / 유형)
  const curBreak = getCurrencyBreakdownKRW(accounts, transactions, rates);
  const currencyPie = [
    { name: 'USD', value: Math.max(0, Math.round(curBreak.USD)), color: '#10B981' },
    { name: 'KRW', value: Math.max(0, Math.round(curBreak.KRW)), color: '#6366F1' },
    { name: 'VND', value: Math.max(0, Math.round(curBreak.VND)), color: '#F59E0B' },
  ].filter((d) => d.value > 0);

  const cls = getAssetClassBreakdownKRW(accounts, cards, transactions, rates, currentMonth);
  const classPie = [
    { name: '현금성 자산', value: Math.max(0, Math.round(cls.cash)), color: '#3B82F6' },
    { name: '예금', value: Math.max(0, Math.round(cls.deposit)), color: '#10B981' },
    { name: '투자', value: Math.max(0, Math.round(cls.investment)), color: '#8B5CF6' },
  ].filter((d) => d.value > 0);

  // 최근 거래 (필터)
  const recent = [...transactions]
    .filter((t) => {
      if (recentFilter === 'all') return true;
      if (recentFilter === 'exchange') return !!t.isExchange;
      if (recentFilter === 'transfer') return t.type === 'transfer' && !t.isExchange;
      return t.type === recentFilter;
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const assetRows = [...accounts]
    .map((acc) => ({
      acc,
      krw: accountValueKRW(acc, transactions, rates),
      native: acc.type === 'securities' ? (acc.valuation ?? 0) : accountCurrentNative(acc, transactions, rates),
    }))
    .sort((a, b) => Math.abs(b.krw) - Math.abs(a.krw));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. 순자산 히어로 */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <p className="text-indigo-200 text-sm mb-1">총 순자산</p>
        <p className="text-4xl sm:text-5xl font-bold tracking-tight">{fmt(netWorth)}</p>
        <div className="flex flex-wrap gap-x-10 gap-y-3 mt-6">
          <div>
            <p className="text-indigo-200 text-xs mb-1">전월 대비</p>
            <p className={`text-base font-semibold ${net >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
              {net >= 0 ? '+' : '-'}{fmt(Math.abs(net))} ({momPct >= 0 ? '+' : ''}{momPct.toFixed(1)}%)
            </p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs mb-1">이번 달 저축액</p>
            <p className={`text-base font-semibold ${net >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
              {net >= 0 ? '+' : '-'}{fmt(Math.abs(net))}
            </p>
          </div>
        </div>
      </div>

      {/* 3. 오늘 / 이번주 / 이번달 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {periods.map((p) => (
          <PeriodCard key={p.label} label={p.label} inc={p.inc} exp={p.exp} fmt={fmt} />
        ))}
      </div>

      {/* 2. KPI 3개 */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard title="이번달 수입" value={fmt(income)} icon={TrendingUp} color="bg-emerald-500" />
        <KpiCard title="이번달 지출" value={fmt(expense)} icon={TrendingDown} color="bg-rose-500" />
        <KpiCard title="이번달 저축" value={fmt(net)} icon={PiggyBank} color="bg-indigo-500" />
      </div>

      {/* 4. 순자산 추이 */}
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
            <YAxis tickFormatter={axisFmt} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<NwTooltip fmt={fmtDisp} />} />
            <Area type="monotone" dataKey="net" stroke="#6366F1" strokeWidth={2.5} fill="url(#nwGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 5. 자산 비중 (토글) + 6. 자산 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">자산 비중</h3>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-xs">
              <button onClick={() => setAllocView('currency')}
                className={`px-3 py-1.5 ${allocView === 'currency' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>통화</button>
              <button onClick={() => setAllocView('class')}
                className={`px-3 py-1.5 ${allocView === 'class' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>유형</button>
            </div>
          </div>
          <Donut data={allocView === 'currency' ? currencyPie : classPie} fmt={fmt} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">자산 현황</h3>
            <button onClick={() => setCurrentPage('assets')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">자세히</button>
          </div>
          <div className="space-y-3">
            {assetRows.slice(0, 5).map(({ acc, krw, native }) => (
              <div key={acc.id} className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CurrencyBadge currency={acc.currency} />
                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{acc.name}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${acc.isLiability ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                    {acc.isLiability ? '-' : ''}{formatCurrency(native, acc.currency)}
                  </p>
                  <p className="text-xs text-gray-400">({fmt(Math.abs(krw))})</p>
                </div>
              </div>
            ))}
            {assetRows.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">등록된 계좌가 없습니다</p>}
            {assetRows.length > 5 && <p className="text-xs text-gray-400 text-center">외 {assetRows.length - 5}개</p>}
          </div>
        </div>
      </div>

      {/* 7. 최근 거래 + 필터 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">최근 거래</h3>
          <button onClick={() => setCurrentPage('transactions')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">전체보기</button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {TYPE_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setRecentFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                recentFilter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          {recent.map((t) => <RecentRow key={t.id} t={t} />)}
          {recent.length === 0 && <p className="text-center text-sm text-gray-400 py-6">거래 내역이 없습니다</p>}
        </div>
      </div>
    </div>
  );
}

function RecentRow({ t }: { t: Transaction }) {
  const { categories, rates, displayCurrency } = useApp();
  const cat = categories.find((c) => c.id === t.categoryId);
  const isIncome = t.type === 'income';
  const isTransfer = t.type === 'transfer';
  const isExchange = !!t.isExchange;
  const krw = t.amountKRW ?? t.amount;
  const amountStr = formatCurrency(fromKRW(krw, displayCurrency, rates), displayCurrency);

  const typeLabel = isExchange ? '환전' : isTransfer ? '이체' : isIncome ? '수입' : '지출';
  const typeChip =
    isExchange ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
    : isTransfer ? 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300'
    : isIncome ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400';
  const sign = (isTransfer || isExchange) ? '' : isIncome ? '+' : '-';
  const color = (isTransfer || isExchange) ? 'text-gray-500 dark:text-gray-400'
    : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const label = isExchange ? '환전' : isTransfer ? '이체' : (cat?.name || '기타');
  const iconColor = (isExchange || isTransfer) ? '#94A3B8' : (cat?.color || '#6B7280');

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconColor + '20' }}>
          <span className="text-base" style={{ color: iconColor }}>{isExchange ? '💱' : isTransfer ? '⇄' : isIncome ? '↑' : '↓'}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{label}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeChip}`}>{typeLabel}</span>
            <CurrencyBadge currency={(t.currency || 'KRW') as Currency} />
          </div>
          <p className="text-xs text-gray-400 truncate">{t.paymentMethod} · {t.date}</p>
        </div>
      </div>
      <span className={`text-sm font-bold flex-shrink-0 ${color}`}>
        {sign}{amountStr}
      </span>
    </div>
  );
}
