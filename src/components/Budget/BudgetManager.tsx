import React, { useState } from 'react';
import { Save, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Currency } from '../../types';
import { formatCurrency, formatAmountInput, parseAmount, getYearMonth, formatMonth } from '../../utils/formatters';
import { getMonthExpense, getCategoryExpenses } from '../../utils/calculations';
import { fromKRW, toKRW } from '../../utils/currency';

export default function BudgetManager() {
  const { transactions, categories, budgets, setBudget, rates } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(getYearMonth());

  const existingBudget = budgets.find((b) => b.month === selectedMonth);
  const [currency, setCurrency] = useState<Currency>(existingBudget?.currency || 'KRW');

  // KRW 기준 금액 → 예산 통화로 표시
  const inCur = (krw: number) => formatCurrency(fromKRW(krw, currency, rates), currency);

  const [totalBudgetStr, setTotalBudgetStr] = useState(
    existingBudget ? existingBudget.totalBudget.toLocaleString('ko-KR') : ''
  );
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>(
    existingBudget
      ? Object.fromEntries(existingBudget.categoryBudgets.map((cb) => [cb.categoryId, cb.amount.toLocaleString('ko-KR')]))
      : {}
  );
  const [saved, setSaved] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const actualExpenses = getCategoryExpenses(transactions, selectedMonth); // KRW
  const totalActual = getMonthExpense(transactions, selectedMonth); // KRW
  const totalBudget = parseAmount(totalBudgetStr); // 예산 통화
  const totalBudgetKRW = toKRW(totalBudget, currency, rates);
  const totalPct = totalBudgetKRW > 0 ? (totalActual / totalBudgetKRW) * 100 : 0;

  function handleMonthChange(m: string) {
    setSelectedMonth(m);
    const b = budgets.find((bgt) => bgt.month === m);
    setTotalBudgetStr(b ? b.totalBudget.toLocaleString('ko-KR') : '');
    setCurrency(b?.currency || 'KRW');
    setCategoryBudgets(
      b ? Object.fromEntries(b.categoryBudgets.map((cb) => [cb.categoryId, cb.amount.toLocaleString('ko-KR')])) : {}
    );
    setSaved(false);
  }

  function handleSave() {
    const data = {
      month: selectedMonth,
      totalBudget: parseAmount(totalBudgetStr),
      currency,
      categoryBudgets: expenseCategories
        .filter((c) => categoryBudgets[c.id] && parseAmount(categoryBudgets[c.id]) > 0)
        .map((c) => ({ categoryId: c.id, amount: parseAmount(categoryBudgets[c.id]) })),
    };
    setBudget(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const isOver = value > max && max > 0;
    const isWarn = pct >= 80 && !isOver;
    const barColor = isOver ? '#EF4444' : isWarn ? '#F59E0B' : color || '#6366F1';
    return (
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">월 선택:</label>
        <div className="relative">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Total budget */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          {formatMonth(selectedMonth)} 전체 예산
        </h3>

        <div className="flex gap-2 mb-5">
          <div className="flex-1 relative">
            <input
              type="text"
              inputMode="decimal"
              value={totalBudgetStr}
              onChange={(e) => setTotalBudgetStr(formatAmountInput(e.target.value))}
              placeholder="월 예산 입력"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="w-20 px-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="KRW">₩</option>
            <option value="USD">$</option>
            <option value="VND">₫</option>
          </select>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? '저장됨' : '저장'}
          </button>
        </div>

        {totalBudget > 0 && (
          <div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">사용액</p>
                <p className={`text-2xl font-bold ${totalActual > totalBudgetKRW ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                  {inCur(totalActual)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">예산</p>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{formatCurrency(totalBudget, currency)}</p>
              </div>
            </div>
            <ProgressBar value={totalActual} max={totalBudgetKRW} />
            <div className="flex items-center justify-between mt-1.5">
              <p className={`text-xs font-medium ${totalActual > totalBudgetKRW ? 'text-rose-500' : totalPct >= 80 ? 'text-amber-500' : 'text-gray-400'}`}>
                {totalPct.toFixed(1)}% 사용
                {totalActual > totalBudgetKRW && (
                  <span className="ml-1.5 inline-flex items-center gap-1">
                    <AlertTriangle size={12} /> {inCur(totalActual - totalBudgetKRW)} 초과
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400">잔여: {inCur(Math.max(0, totalBudgetKRW - totalActual))}</p>
            </div>
          </div>
        )}
      </div>

      {/* Category budgets */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5">카테고리별 예산</h3>
        <div className="space-y-4">
          {expenseCategories.map((cat) => {
            const budgetAmt = parseAmount(categoryBudgets[cat.id] || ''); // 예산 통화
            const budgetAmtKRW = toKRW(budgetAmt, currency, rates);
            const actual = actualExpenses[cat.id] || 0; // KRW
            const pct = budgetAmtKRW > 0 ? (actual / budgetAmtKRW) * 100 : 0;
            const isOver = actual > budgetAmtKRW && budgetAmtKRW > 0;
            const isWarn = pct >= 80 && !isOver;

            return (
              <div key={cat.id} className="pb-4 border-b border-gray-50 dark:border-gray-700/50 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{cat.name}</span>
                    {isOver && <AlertTriangle size={13} className="text-rose-500" />}
                    {isWarn && <AlertTriangle size={13} className="text-amber-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{inCur(actual)}</span>
                    <span className="text-xs text-gray-300">/</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={categoryBudgets[cat.id] || ''}
                      onChange={(e) => {
                        setCategoryBudgets((prev) => ({ ...prev, [cat.id]: formatAmountInput(e.target.value) }));
                      }}
                      placeholder="예산 미설정"
                      className="w-28 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-right text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {budgetAmt > 0 && (
                  <>
                    <ProgressBar value={actual} max={budgetAmtKRW} color={cat.color} />
                    <div className="flex justify-between mt-1">
                      <span className={`text-xs ${isOver ? 'text-rose-500' : isWarn ? 'text-amber-500' : 'text-gray-400'}`}>
                        {pct.toFixed(0)}% {isOver ? '초과' : '사용'}
                      </span>
                      {isOver && (
                        <span className="text-xs text-rose-500">
                          {inCur(actual - budgetAmtKRW)} 초과
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={handleSave}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}>
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? '저장 완료!' : '예산 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
