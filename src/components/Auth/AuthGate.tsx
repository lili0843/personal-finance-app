import React from 'react';
import { Wallet } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import LoginScreen from './LoginScreen';
import Layout from '../Layout/Layout';
import Onboarding from '../Onboarding/Onboarding';

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center animate-pulse">
        <Wallet size={28} className="text-white" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

export default function AuthGate() {
  const { user, authLoading, dataLoading } = useApp();

  if (authLoading) return <LoadingScreen message="불러오는 중..." />;
  if (!user) return <LoginScreen />;
  if (dataLoading) return <LoadingScreen message="가계부를 불러오는 중..." />;

  return (
    <>
      <Layout />
      <Onboarding />
    </>
  );
}
