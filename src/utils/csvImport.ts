// 범용 CSV 파서 — 따옴표로 감싼 필드(내부 콤마 포함)와 개행을 처리
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // BOM 제거
  const clean = text.replace(/^﻿/, '');

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\r') {
        // skip — handled by \n
      } else {
        field += ch;
      }
    }
  }
  // 마지막 필드/행
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // 완전히 빈 행 제거
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// 금액 문자열 → 숫자 (콤마/통화기호/괄호(음수) 처리)
export function parseAmountCell(raw: string): number {
  if (!raw) return 0;
  let s = raw.trim();
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.includes('-')) negative = true;
  s = s.replace(/[^0-9.]/g, '');
  const n = parseFloat(s) || 0;
  return negative ? -n : n;
}

// 날짜 문자열 정규화 → YYYY-MM-DD
export function normalizeDate(raw: string): string {
  if (!raw) return '';
  const s = raw.trim();
  // 2026-06-18, 2026.06.18, 2026/06/18, 20260618
  let m = s.match(/(\d{4})[.\-/]?(\d{1,2})[.\-/]?(\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s;
}

// 중복 방지 해시 (날짜 + 금액 + 가맹점/메모)
export function dedupeHash(date: string, amount: number, merchant: string): string {
  const key = `${date}|${Math.round(Math.abs(amount))}|${(merchant || '').trim().toLowerCase()}`;
  // 간단한 문자열 해시
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return `${date}_${Math.round(Math.abs(amount))}_${h}`;
}

// 매핑 프리셋 (기관별 컬럼 매칭 저장)
export interface CsvPreset {
  name: string; // 기관명 (예: 하나카드)
  dateCol: number;
  amountCol: number;
  merchantCol: number;
  memoCol: number;
  typeCol: number; // -1 이면 미사용
  hasHeader: boolean;
  defaultType: 'expense' | 'income';
  currency: 'KRW' | 'USD' | 'VND';
}

const PRESET_KEY = 'pf_csv_presets';

export function loadPresets(): CsvPreset[] {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    return raw ? (JSON.parse(raw) as CsvPreset[]) : [];
  } catch {
    return [];
  }
}

export function savePreset(preset: CsvPreset): void {
  const presets = loadPresets().filter((p) => p.name !== preset.name);
  presets.push(preset);
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}

export function deletePreset(name: string): void {
  const presets = loadPresets().filter((p) => p.name !== name);
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}
