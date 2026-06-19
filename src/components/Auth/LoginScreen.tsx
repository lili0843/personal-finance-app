import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function LoginScreen() {
  const { login } = useApp();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setError('');
    setBusy(true);
    try {
      await login();
    } catch (e) {
      setError('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-200 dark:shadow-none">
              <Wallet size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">가계부</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">개인 자산관리</p>
          </div>

          <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            로그인하면 휴대폰·노트북 등<br />
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">어느 기기에서나 같은 가계부</span>를 볼 수 있어요.
          </p>

          {/* Google login button */}
          <button
            onClick={handleLogin}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-100 transition-colors disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            {busy ? '로그인 중...' : 'Google 계정으로 로그인'}
          </button>

          {error && (
            <p className="text-center text-xs text-rose-500 mt-4">{error}</p>
          )}

          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            로그인하면 데이터가 안전하게 클라우드에 저장됩니다.<br />
            본인만 자신의 가계부를 볼 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
