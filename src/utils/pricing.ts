import { Holding, StockMarket, Currency } from '../types';
import { FxRates, toKRW } from './currency';

export interface Quote {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  currency: string | null;
  marketState: string | null;
}

// 종목 + 시장 → Yahoo 심볼
export function yahooSymbol(symbol: string, market: StockMarket): string {
  const s = symbol.trim().toUpperCase();
  if (market === 'KR') {
    // 6자리 숫자코드면 .KS(코스피) 기본. 이미 접미사가 있으면 그대로.
    if (/^\d{6}$/.test(s)) return `${s}.KS`;
    return s;
  }
  return s; // 미국은 티커 그대로
}

// 시세 1건 조회 (Netlify 함수 경유). 실패 시 null.
export async function fetchQuote(symbol: string, market: StockMarket): Promise<Quote | null> {
  const sym = yahooSymbol(symbol, market);
  try {
    const res = await fetch(`/.netlify/functions/quote?symbol=${encodeURIComponent(sym)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Quote;
    if (data.price == null && data.previousClose == null) return null;
    return data;
  } catch {
    return null;
  }
}

// 코스피(.KS) 실패 시 코스닥(.KQ) 재시도
export async function fetchQuoteSmart(symbol: string, market: StockMarket): Promise<Quote | null> {
  const first = await fetchQuote(symbol, market);
  if (first) return first;
  if (market === 'KR' && /^\d{6}$/.test(symbol.trim())) {
    try {
      const res = await fetch(`/.netlify/functions/quote?symbol=${encodeURIComponent(symbol.trim() + '.KQ')}`);
      if (res.ok) {
        const data = (await res.json()) as Quote;
        if (data.price != null || data.previousClose != null) return data;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

// 보유 종목의 현재 평가액 (종목 통화 기준)
export function holdingValueNative(h: Holding): number {
  const price = h.lastPrice ?? 0;
  return price * h.quantity;
}

// 보유 종목 평가액 → KRW
export function holdingValueKRW(h: Holding, rates: FxRates): number {
  return toKRW(holdingValueNative(h), h.currency, rates);
}

// 손익 (종목 통화 기준). 평단가 없으면 null
export function holdingGain(h: Holding): number | null {
  if (h.avgPrice == null || h.avgPrice <= 0 || h.lastPrice == null) return null;
  return (h.lastPrice - h.avgPrice) * h.quantity;
}

// 전체 보유 평가액 합계 → KRW
export function totalHoldingsKRW(holdings: Holding[], rates: FxRates): number {
  return holdings.reduce((sum, h) => sum + holdingValueKRW(h, rates), 0);
}

export function marketCurrency(market: StockMarket): Currency {
  return market === 'US' ? 'USD' : 'KRW';
}
