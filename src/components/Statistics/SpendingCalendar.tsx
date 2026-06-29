import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { txKRW } from '../../utils/calculations';
import { formatCurrency, getYearMonth } from '../../utils/formatters';
import { fromKRW } from '../../utils/currency';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function SpendingCalendar() {
  const { transactions, rates, displayCurrency } = useApp();
  const [month, setMonth] = useState(getYearMonth()); // YYYY-MM
  const [y, m] = month.split('-').map(Number);

  const fmt = (krw: number) => formatCurrency(fromKRW(krw, displayCurrency, rates), displayCurrency);

  // 일별 지출 합계 (KRW)
  const daily = useMemo(() => {
    const map: Record<number, number> = {};
    transactions.forEach((t) => {
      if (t.type !== 'expense') return;
      if (!t.date.startsWith(month)) return;
      const day = Number(t.date.slice(8, 10));
      map[day] = (map[day] || 0) + txKRW(t);
    });
    return map;
  }, [transactions, month]);

  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDow = new Date(y, m - 1, 1).getDay(); // 0=일
  const maxDaily = Math.max(1, ...Object.values(daily));
  const totalExpense = Object.values(daily).reduce((s, v) => s + v, 0);
  const spentDays = Object.keys(daily).length;
  const busiest = Object.entries(daily).sort((a, b) => b[1] - a[1])[0];
  const todayStr = getYearMonth() === month ? new Date().getDate() : -1;

  // 색상 강도 (지출 클수록 진하게)
  function cellStyle(amount: number) {
    if (!amount) return {};
    const ratio = amount / maxDaily; // 0~1
    const opacity = 0.18 + ratio * 0.72;
    return { background: `rgba(244, 63, 94, ${opacity.toFixed(2)})` };
  }

  function shiftMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(getYearMonth(d));
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-5">
      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 mb-1">이번 달 총지출</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{fmt(totalExpense)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 mb-1">지출한 날</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{spentDays}일</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 mb-1">최다 지출일</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {busiest ? `${busiest[0]}일` : '-'}
            {busiest && <span className="text-xs font-normal text-gray-400 ml-1">{fmt(busiest[1])}</span>}
          </p>
        </div>
      </div>

      {/* 캘린더 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><ChevronLeft size={18} /></button>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{y}년 {m}월 소비 캘린더</h3>
          <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {WEEK.map((w, i) => (
            <div key={w} className={`text-center text-xs font-medium ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} />;
            const amount = daily[d] || 0;
            const isToday = d === todayStr;
            return (
              <div key={d}
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-1 ${
                  isToday ? 'border-indigo-500 border-2' : 'border-gray-100 dark:border-gray-700'
                }`}
                style={cellStyle(amount)}
                title={amount ? fmt(amount) : '지출 없음'}
              >
                <span className={`text-[11px] font-semibold ${amount > maxDaily * 0.55 ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>{d}</span>
                {amount > 0 && (
                  <span className={`text-[9px] leading-tight text-center ${amount > maxDaily * 0.55 ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
                    {fmt(amount)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-400">
          <span>적음</span>
          {[0.2, 0.4, 0.6, 0.8, 1].map((r) => (
            <span key={r} className="w-4 h-4 rounded" style={{ background: `rgba(244, 63, 94, ${r})` }} />
          ))}
          <span>많음</span>
        </div>
      </div>
    </div>
  );
}
