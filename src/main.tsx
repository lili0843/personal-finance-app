import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// PWA 서비스워커 등록 — 하위 경로(/budget-app/) 배포 대응
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL; // 예: '/budget-app/'
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // 등록 실패해도 앱은 정상 동작
    });
  });
}
