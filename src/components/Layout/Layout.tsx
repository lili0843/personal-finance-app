import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { useApp } from '../../contexts/AppContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import Dashboard from '../Dashboard/Dashboard';
import TransactionList from '../Transactions/TransactionList';
import Statistics from '../Statistics/Statistics';
import AssetManager from '../Assets/AssetManager';
import SecuritiesManager from '../Securities/SecuritiesManager';
import CardManager from '../Cards/CardManager';
import BudgetManager from '../Budget/BudgetManager';
import GoalManager from '../Goals/GoalManager';
import RecurringManager from '../Recurring/RecurringManager';
import DataManagement from '../DataManagement/DataManagement';
import Settings from '../Settings/Settings';
import InstallPrompt from '../PWA/InstallPrompt';

const pageComponents: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  transactions: TransactionList,
  statistics: Statistics,
  assets: AssetManager,
  securities: SecuritiesManager,
  cards: CardManager,
  budget: BudgetManager,
  goals: GoalManager,
  recurring: RecurringManager,
  data: DataManagement,
  settings: Settings,
};

export default function Layout() {
  const { currentPage, settings } = useApp();
  const PageComponent = pageComponents[currentPage] || Dashboard;
  const collapsed = settings.sidebarCollapsed;
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* 모바일 드로어 배경 */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isMobile ? 'ml-0' : collapsed ? 'ml-16' : 'ml-60'}`}>
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-auto pb-24 lg:pb-6">
          <PageComponent />
        </main>
      </div>

      {/* 모바일 하단 탭바 */}
      <BottomNav onMore={() => setMobileOpen(true)} />

      <InstallPrompt />
    </div>
  );
}
