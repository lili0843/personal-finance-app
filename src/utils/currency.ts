import { Currency } from '../types';

// 일자별 환율 테이블. KRW를 기준(1)으로, 1단위 외화 = ? KRW
// 예: rates.USD = 1380 → 1달러 = 1380원, rates.VND = 0.054 → 1동 = 0.054원
export interface FxRates {
  base: 'KRW';
  date: string; // YYYY-MM-DD
  USD: number; // 1 USD = ? KRW
  VND: number; // 1 VND = ? KRW
  source: 'api' | 'manual' | 'fallback';
}

// API 실패 시에도 앱이 동작하도록 하는 기본 환율 (대략값)
export const FALLBACK_RATES: FxRates = {
  base: 'KRW',
  date: '2026-01-01',
  USD: 1380,
  VND: 0.054,
  source: 'fallback',
};

// 무료 환율 API (open.er-api.com) — KRW 기준 1회 호출로 USD/VND 환산
export async function fetchRates(): Promise<FxRates> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/KRW');
    if (!res.ok) throw new Error('rate fetch failed');
    const data = await res.json();
    const r = data.rates as Record<string, number>;
    // API는 "1 KRW = ? 외화" 형태 → 역수로 "1 외화 = ? KRW" 변환
    const usd = r.USD ? 1 / r.USD : FALLBACK_RATES.USD;
    const vnd = r.VND ? 1 / r.VND : FALLBACK_RATES.VND;
    const date =
      typeof data.time_last_update_utc === 'string'
        ? new Date(data.time_last_update_utc).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    return { base: 'KRW', date, USD: usd, VND: vnd, source: 'api' };
  } catch {
    return { ...FALLBACK_RATES, date: new Date().toISOString().slice(0, 10) };
  }
}

// 임의 통화 금액 → KRW 환산
export function toKRW(amount: number, currency: Currency, rates: FxRates): number {
  if (currency === 'KRW') return amount;
  if (currency === 'USD') return amount * rates.USD;
  if (currency === 'VND') return amount * rates.VND;
  return amount;
}

// 임의 통화 금액 → USD 환산
export function toUSD(amount: number, currency: Currency, rates: FxRates): number {
  const krw = toKRW(amount, currency, rates);
  return rates.USD > 0 ? krw / rates.USD : 0;
}

// KRW 금액 → 표시 통화로 환산 (표시 토글용)
export function fromKRW(amountKRW: number, display: Currency, rates: FxRates): number {
  if (display === 'KRW') return amountKRW;
  if (display === 'USD') return rates.USD > 0 ? amountKRW / rates.USD : 0;
  if (display === 'VND') return rates.VND > 0 ? amountKRW / rates.VND : 0;
  return amountKRW;
}

// 거래 입력 시 스냅샷으로 함께 저장할 환율 (과거 숫자 고정용)
export function snapshotRate(currency: Currency, rates: FxRates): number {
  if (currency === 'KRW') return 1;
  if (currency === 'USD') return rates.USD;
  if (currency === 'VND') return rates.VND;
  return 1;
}
