import React, { useState } from 'react';
import { Sun, Moon, Bell, LogOut, Menu } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatMonth, getYearMonth } from '../../utils/formatters';

const pageTitles: Record<string, string> = {
  dashboard: '대시보드',
  transactions: '거래내역',
  statistics: '통계',
  assets: '자산관리',
  securities: '증권관리',
  cards: '카드관리',
  budget: '예산관리',
  goals: '목표관리',
  recurring: '반복거래',
  data: '데이터관리',
  settings: '설정',
};

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { currentPage, settings, updateSettings, transactions, budgets, cards, user, logout, displayCurrency, setDisplayCurrency } = useApp();
  const currentMonth = getYearMonth();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user?.displayName || user?.email || '사용자';
  const initial = displayName.charAt(0).toUpperCase();

  const alerts: string[] = [];

  const budget = budgets.find((b) => b.month === currentMonth);
  if (budget) {
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth))
      .reduce((s, t) => s + t.amount, 0);
    if (spent > budget.totalBudget * 0.9) {
      alerts.push('이번달 예산의 90%를 사용했습니다');
    }
  }

  cards.forEach((card) => {
    const used = transactions
      .filter((t) => t.cardId === card.id && t.type === 'expense' && t.date.startsWith(currentMonth))
      .reduce((s, t) => s + t.amount, 0);
    if (used > card.limit * 0.8) {
      alerts.push(`${card.name} 한도의 80%를 초과했습니다`);
    }
  });

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-4 sm:px-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 safe-top">
      <div className="flex items-center gap-2 min-w-0">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{pageTitles[currentPage]}</h1>
          <p className="text-xs text-gray-400 hidden sm:block">{formatMonth(currentMonth)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Display currency toggle ₩ / $ / ₫ */}
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
          {(['KRW', 'USD', 'VND'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setDisplayCurrency(c)}
              className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                displayCurrency === c
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {c === 'KRW' ? '₩' : c === 'USD' ? '$' : '₫'}
            </button>
          ))}
        </div>

        {/* Alert bell */}
        <div className="relative">
          <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
            <Bell size={20} />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>
          {alerts.length > 0 && (
            <div className="absolute right-0 top-10 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50 hidden group-hover:block">
              {alerts.map((a, i) => (
                <p key={i} className="text-xs text-rose-600 dark:text-rose-400 py-1">{a}</p>
              ))}
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => updateSettings({ darkMode: !settings.darkMode })}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
        >
          {settings.darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Avatar + menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              initial
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                  {user?.email && <p className="text-xs text-gray-400 truncate">{user.email}</p>}
                </div>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                  <LogOut size={16} />
                  로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
