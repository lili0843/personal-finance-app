import { useApp } from '../contexts/AppContext';
import { formatCurrency } from '../utils/formatters';
import { fromKRW } from '../utils/currency';
import { Transaction } from '../types';
import { txKRW } from '../utils/calculations';

// KRW 기준 금액을 현재 표시 통화로 환산해 문자열로 포맷하는 도우미
export function useMoney() {
  const { rates, displayCurrency } = useApp();

  // KRW 숫자 → 표시 통화 문자열
  const fmtKRW = (krw: number) => formatCurrency(fromKRW(krw, displayCurrency, rates), displayCurrency);

  // 거래 1건 → 표시 통화 문자열 (스냅샷 환율 사용)
  const fmtTx = (t: Transaction) => fmtKRW(txKRW(t));

  // 원래 통화 그대로 표기 (예: "$1,200", "₫500,000")
  const fmtOriginal = (amount: number, currency = displayCurrency) => formatCurrency(amount, currency);

  return { fmtKRW, fmtTx, fmtOriginal, displayCurrency, rates };
}
