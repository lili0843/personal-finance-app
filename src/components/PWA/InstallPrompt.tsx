import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pf_install_dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    // 이미 설치(standalone)된 경우 숨김
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS는 beforeinstallprompt가 없으므로 안내 배너 표시
    if (ios) setShow(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, '1');
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Download size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white">홈 화면에 앱으로 추가</p>
          {isIOS ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              하단의 <Share size={12} className="inline -mt-0.5" /> 공유 버튼 → <span className="font-medium">"홈 화면에 추가"</span>를 누르면 앱처럼 사용할 수 있어요.
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              설치하면 전체화면 앱처럼 빠르게 열리고, 오프라인에서도 동작합니다.
            </p>
          )}
          {!isIOS && (
            <button
              onClick={install}
              className="mt-2.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
            >
              앱 설치하기
            </button>
          )}
        </div>
        <button onClick={dismiss} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 flex-shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
