import React from 'react';
import {
  LayoutDashboard, ArrowLeftRight, BarChart2, Landmark, CreditCard,
  Target, Repeat, Database, Settings, Wallet, ChevronLeft, ChevronRight, BookMarked, LineChart,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Page } from '../../types';

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'transactions', label: '거래내역', icon: ArrowLeftRight },
  { id: 'statistics', label: '통계', icon: BarChart2 },
  { id: 'assets', label: '자산관리', icon: Landmark },
  { id: 'securities', label: '증권관리', icon: LineChart },
  { id: 'cards', label: '카드관리', icon: CreditCard },
  { id: 'budget', label: '예산관리', icon: BookMarked },
  { id: 'goals', label: '목표관리', icon: Target },
  { id: 'recurring', label: '반복거래', icon: Repeat },
  { id: 'data', label: '데이터관리', icon: Database },
  { id: 'settings', label: '설정', icon: Settings },
];

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: Props) {
  const { currentPage, setCurrentPage, settings, updateSettings } = useApp();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const collapsed = settings.sidebarCollapsed;
  // 모바일에서는 항상 펼친 형태로 표시
  const showCollapsed = !isMobile && collapsed;

  function handleNav(id: Page) {
    setCurrentPage(id);
    if (isMobile) onClose();
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full z-40 flex flex-col
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
        transition-transform duration-300 ease-in-out
        ${isMobile
          ? `w-64 ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`
          : `${collapsed ? 'w-16' : 'w-60'} translate-x-0`
        }
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700 ${showCollapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Wallet size={20} className="text-white" />
        </div>
        {!showCollapsed && (
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">가계부</p>
            <p className="text-xs text-gray-400">자산관리</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className={`
                w-full flex items-center rounded-xl mb-1 transition-all duration-150
                ${showCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'}
                ${active
                  ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }
              `}
              title={showCollapsed ? label : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!showCollapsed && (
                <span className={`text-sm font-medium ${active ? 'font-semibold' : ''}`}>{label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle — 데스크톱에서만 */}
      {!isMobile && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
            className="w-full flex items-center justify-center py-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      )}
    </aside>
  );
}
