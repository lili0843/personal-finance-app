import React from 'react';
import { LayoutDashboard, ArrowLeftRight, Landmark, BarChart2, Menu } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Page } from '../../types';

const items: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: '홈', icon: LayoutDashboard },
  { id: 'transactions', label: '거래', icon: ArrowLeftRight },
  { id: 'assets', label: '자산', icon: Landmark },
  { id: 'statistics', label: '통계', icon: BarChart2 },
];

export default function BottomNav({ onMore }: { onMore: () => void }) {
  const { currentPage, setCurrentPage } = useApp();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 safe-bottom">
      <div className="flex items-stretch">
        {items.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
        <button
          onClick={onMore}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-gray-400 dark:text-gray-500"
        >
          <Menu size={21} strokeWidth={1.8} />
          <span className="text-[10px] font-medium">전체</span>
        </button>
      </div>
    </nav>
  );
}
