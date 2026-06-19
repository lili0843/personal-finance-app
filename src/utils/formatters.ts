import { Currency } from '../types';

export function formatCurrency(amount: number, currency: Currency = 'KRW'): string {
  const symbols: Record<Currency, string> = {
    KRW: '₩',
    VND: '₫',
    USD: '$',
  };

  const locales: Record<Currency, string> = {
    KRW: 'ko-KR',
    VND: 'vi-VN',
    USD: 'en-US',
  };

  const options: Intl.NumberFormatOptions = {
    style: 'decimal',
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
  };

  const formatted = new Intl.NumberFormat(locales[currency], options).format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';

  if (currency === 'USD') {
    return `${sign}${symbols[currency]}${formatted}`;
  }
  return `${sign}${formatted}${symbols[currency]}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatMonth(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  return `${year}년 ${parseInt(month)}월`;
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getYearMonth(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseAmount(value: string): number {
  const cleaned = value.replace(/,/g, '').replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

// 금액 입력 포맷 — 정수부는 천단위 콤마, 소수점(센트) 최대 2자리 허용
export function formatAmountInput(value: string): string {
  // 콤마 제거 후 숫자와 점만 남김
  let v = value.replace(/,/g, '').replace(/[^0-9.]/g, '');
  // 점은 하나만 허용
  const firstDot = v.indexOf('.');
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
  }
  if (!v) return '';

  const hasDot = v.includes('.');
  const [intPart, decPart = ''] = v.split('.');
  const intFmt = intPart ? parseInt(intPart, 10).toLocaleString('ko-KR') : '0';
  if (hasDot) {
    return `${intFmt}.${decPart.slice(0, 2)}`;
  }
  return intFmt;
}

export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getMonthRange(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function getPastMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getYearMonth(d));
  }
  return months;
}

// ── 급여일(payday) 기준 기간 계산 ─────────────────────────────
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface Period { start: string; end: string; label: string; key: string; }

// payday를 그 달 마지막 날로 보정 (예: 31일 설정 → 2월은 28/29일)
function clampDay(year: number, monthIdx: number, day: number): Date {
  const last = new Date(year, monthIdx + 1, 0).getDate();
  return new Date(year, monthIdx, Math.min(day, last));
}

// 실제 급여일: 주말이면 직전 금요일로 앞당김 (월급을 미리 받는 경우 반영)
function paydayDate(year: number, monthIdx: number, payday: number, weekendAdjust: boolean): Date {
  const d = clampDay(year, monthIdx, payday);
  if (weekendAdjust) {
    const dow = d.getDay(); // 0=일, 6=토
    if (dow === 6) d.setDate(d.getDate() - 1);      // 토 → 금
    else if (dow === 0) d.setDate(d.getDate() - 2); // 일 → 금
  }
  return d;
}

// refDate가 속한 급여 기간 (급여일부터 다음 급여일 전날까지)
export function getPayPeriod(payday: number, refDate: Date = new Date(), weekendAdjust = true): Period {
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  const thisPay = paydayDate(y, m, payday, weekendAdjust);

  let start: Date;
  let sy: number;
  let sm: number;
  if (refDate >= thisPay) {
    start = thisPay; sy = y; sm = m;
  } else {
    start = paydayDate(y, m - 1, payday, weekendAdjust); sy = y; sm = m - 1;
  }
  const next = paydayDate(sy, sm + 1, payday, weekendAdjust);
  const end = new Date(next);
  end.setDate(end.getDate() - 1);

  const label = `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`;
  return { start: ymd(start), end: ymd(end), label, key: ymd(start) };
}

// 최근 count개 급여 기간 (오래된 것부터)
export function getPastPayPeriods(count: number, payday: number, weekendAdjust = true): Period[] {
  const periods: Period[] = [];
  const cur = getPayPeriod(payday, new Date(), weekendAdjust);
  const curStart = new Date(cur.start);
  for (let i = count - 1; i >= 0; i--) {
    const ref = new Date(curStart);
    ref.setDate(ref.getDate() + 3); // 기간 안쪽으로 살짝 이동해 경계 오인 방지
    ref.setMonth(ref.getMonth() - i);
    periods.push(getPayPeriod(payday, ref, weekendAdjust));
  }
  return periods;
}
