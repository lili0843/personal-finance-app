import React from 'react';
import { Currency } from '../../types';

// 통화별 통일 색상
export const CURRENCY_BADGE: Record<Currency, { bg: string; text: string }> = {
  USD: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400' },
  KRW: { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-400' },
  VND: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-400' },
};

export default function CurrencyBadge({ currency, className = '' }: { currency: Currency; className?: string }) {
  const c = CURRENCY_BADGE[currency] || CURRENCY_BADGE.KRW;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${c.bg} ${c.text} ${className}`}>
      {currency}
    </span>
  );
}
