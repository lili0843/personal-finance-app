import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { useApp } from '../../contexts/AppContext';
import {
  getMonthIncome, getMonthExpense, getCategoryRanking,
} from '../../utils/calculations';
import {
  formatCurrency, getPastMonths, formatMonth, getYearMonth,
} from '../../utils/formatters';

type Tab = 'monthly' | 'category' | 'annual' | 'trend';

const TABS: { id: Tab; label: string }[] = [
  { id: 'monthly', label: '월별 현황' },
  { id: 'category', label: '카테고리별' },
  { id: 'annual', label: '연간 통계' },
  { id: 'trend', label: '6개월 추세' },
];

function CustomTooltip({ active, payload, label, currency }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>;
  label?: string; currency: string;
}) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) => formatCurrency(v, currency as 'KRW');
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400">{
            p.name === 'income' ? '수입' : p.name === 'expense' ? '지출' : p.name === 'net' ? '순이익' : p.name
          }:</span>
          <span className="font-bold text-gray-900 dark:text-white">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Statistics() {
  const { transactions, categories, settings } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(getYearMonth());
  const currency = settings.currency;

  const months6 = getPastMonths(6);
  const months12 = getPastMonths(12);

  const monthly6 = months6.map((m) => ({
    month: formatMonth(m).replace('년 ', '/').replace('월', ''),
    income: getMonthIncome(transactions, m),
    expense: getMonthExpense(transactions, m),
    net: getMonthIncome(transactions, m) - getMonthExpense(transactions, m),
  }));

  const monthly12 = months12.map((m) => ({
    month: formatMonth(m).replace('년 ', '/').replace('월', ''),
    income: getMonthIncome(transactions, m),
    expense: getMonthExpense(transactions, m),
    net: getMonthIncome(transactions, m) - getMonthExpense(transactions, m),
  }));

  const categoryRanking = getCategoryRanking(transactions, categories, selectedMonth);

  const yearMonths = getPastMonths(12);
  const yearIncome = yearMonths.reduce((s, m) => s + getMonthIncome(transactions, m), 0);
  const yearExpense = yearMonths.reduce((s, m) => s + getMonthExpense(transactions, m), 0);
  const yearNet = yearIncome - yearExpense;

  const avgMonthlyIncome = yearIncome / 12;
  const avgMonthlyExpense = yearExpense / 12;

  const PIE_COLORS = categoryRanking.map((r) => r.category.color);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* Monthly */}
      {activeTab === 'monthly' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5">월별 수입/지출 비교 (최근 6개월)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly6} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Legend formatter={(v) => v === 'income' ? '수입' : '지출'} />
                <Bar dataKey="income" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" fill="#F43F5E" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5">순이익 추이</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly6} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Bar dataKey="net" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {monthly6.map((entry, i) => (
                    <Cell key={i} fill={entry.net >= 0 ? '#6366F1' : '#F97316'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category */}
      {activeTab === 'category' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">월 선택:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5">카테고리별 지출 비율</h3>
              {categoryRanking.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryRanking.slice(0, 8)}
                      dataKey="amount"
                      nameKey={(e: { category: { name: string } }) => e.category.name}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={55}
                      paddingAngle={3}
                    >
                      {categoryRanking.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i] || '#6B7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value, currency), '']}
                    />
                    <Legend
                      formatter={(_, entry) => {
                        const e = entry as { payload?: { category?: { name?: string } } };
                        return e.payload?.category?.name || '';
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">데이터가 없습니다</div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">카테고리 순위</h3>
              <div className="space-y-3">
                {categoryRanking.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-8">이 달의 지출 데이터가 없습니다</p>
                )}
                {categoryRanking.map((r, i) => (
                  <div key={r.category.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.category.color }} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{r.category.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(r.amount, currency)}</span>
                        <span className="text-xs text-gray-400 ml-2">{r.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${r.percentage}%`, background: r.category.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Annual */}
      {activeTab === 'annual' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: '연간 수입', value: formatCurrency(yearIncome, currency), color: 'text-emerald-600 dark:text-emerald-400' },
              { label: '연간 지출', value: formatCurrency(yearExpense, currency), color: 'text-rose-600 dark:text-rose-400' },
              { label: '연간 순이익', value: formatCurrency(yearNet, currency), color: yearNet >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-500' },
              { label: '저축률', value: yearIncome > 0 ? `${((yearNet / yearIncome) * 100).toFixed(1)}%` : '-', color: 'text-blue-600 dark:text-blue-400' },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-2">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 mb-1">월평균 수입</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(avgMonthlyIncome, currency)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 mb-1">월평균 지출</p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(avgMonthlyExpense, currency)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5">연간 월별 현황 (최근 12개월)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly12} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Legend formatter={(v) => v === 'income' ? '수입' : '지출'} />
                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Trend */}
      {activeTab === 'trend' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5">최근 6개월 추세</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly6} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Legend formatter={(v) => v === 'income' ? '수입' : v === 'expense' ? '지출' : '순이익'} />
                <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: '#10B981' }} />
                <Line type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2.5} dot={{ r: 4, fill: '#F43F5E' }} />
                <Line type="monotone" dataKey="net" stroke="#6366F1" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4, fill: '#6366F1' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">월별 상세 데이터</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">월</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">수입</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">지출</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">순이익</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">저축률</th>
                  </tr>
                </thead>
                <tbody>
                  {months6.map((m) => {
                    const inc = getMonthIncome(transactions, m);
                    const exp = getMonthExpense(transactions, m);
                    const net = inc - exp;
                    const rate = inc > 0 ? ((net / inc) * 100).toFixed(1) : '-';
                    return (
                      <tr key={m} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="py-2.5 px-3 text-sm text-gray-700 dark:text-gray-200">{formatMonth(m)}</td>
                        <td className="py-2.5 px-3 text-sm text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(inc, currency)}</td>
                        <td className="py-2.5 px-3 text-sm text-right font-medium text-rose-600 dark:text-rose-400">{formatCurrency(exp, currency)}</td>
                        <td className={`py-2.5 px-3 text-sm text-right font-bold ${net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-500'}`}>{formatCurrency(net, currency)}</td>
                        <td className="py-2.5 px-3 text-sm text-right text-gray-500 dark:text-gray-400">{rate !== '-' ? `${rate}%` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
