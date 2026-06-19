import React, { useMemo, useRef, useState } from 'react';
import { X, Upload, FileText, Check, AlertTriangle, Save } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Currency, Transaction } from '../../types';
import {
  parseCSV, parseAmountCell, normalizeDate, dedupeHash,
  CsvPreset, loadPresets, savePreset, deletePreset,
} from '../../utils/csvImport';
import { snapshotRate, toKRW, toUSD } from '../../utils/currency';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  onClose: () => void;
}

export default function CsvImportModal({ onClose }: Props) {
  const { categories, accounts, importTransactionsBulk, rates } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);

  const [dateCol, setDateCol] = useState(0);
  const [amountCol, setAmountCol] = useState(1);
  const [merchantCol, setMerchantCol] = useState(2);
  const [memoCol, setMemoCol] = useState(-1);
  const [typeCol, setTypeCol] = useState(-1);

  const [defaultType, setDefaultType] = useState<'expense' | 'income'>('expense');
  const [currency, setCurrency] = useState<Currency>('KRW');
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<CsvPreset[]>(loadPresets());
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  const columns = rows.length > 0 ? rows[0].length : 0;
  const colOptions = Array.from({ length: columns }, (_, i) => i);

  function colLabel(i: number) {
    if (i < 0) return '사용 안함';
    const headerName = hasHeader && rows[0] ? rows[0][i] : '';
    return headerName ? `${i + 1}열: ${headerName}` : `${i + 1}열`;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCSV(text);
      setRows(parsed);
      // 자동 추정: 첫 행에 헤더가 있으면 컬럼명으로 매핑 추정
      if (parsed.length > 0) {
        const header = parsed[0].map((h) => h.trim());
        const findCol = (keywords: string[]) =>
          header.findIndex((h) => keywords.some((k) => h.includes(k)));
        const d = findCol(['날짜', '거래일', '일자', '승인일', 'date']);
        const a = findCol(['금액', '승인금액', '출금', '이용금액', 'amount']);
        const m = findCol(['가맹점', '내용', '적요', '거래처', '상호', 'memo', '비고']);
        if (d >= 0) setDateCol(d);
        if (a >= 0) setAmountCol(a);
        if (m >= 0) setMerchantCol(m);
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  const dataRows = useMemo(() => (hasHeader ? rows.slice(1) : rows), [rows, hasHeader]);

  // 미리보기용 파싱 결과
  const parsedItems = useMemo(() => {
    return dataRows.map((r) => {
      const dateRaw = dateCol >= 0 ? r[dateCol] || '' : '';
      const date = normalizeDate(dateRaw);
      const amount = Math.abs(parseAmountCell(amountCol >= 0 ? r[amountCol] || '' : ''));
      const merchant = merchantCol >= 0 ? (r[merchantCol] || '').trim() : '';
      const memoExtra = memoCol >= 0 ? (r[memoCol] || '').trim() : '';
      let type: 'expense' | 'income' = defaultType;
      if (typeCol >= 0) {
        const tv = (r[typeCol] || '').trim();
        if (/입금|수입|\+|받음/.test(tv)) type = 'income';
        else if (/출금|지출|결제|승인|−|-/.test(tv)) type = 'expense';
      }
      const memo = [merchant, memoExtra].filter(Boolean).join(' / ');
      const hash = dedupeHash(date, amount, merchant);
      return { date, amount, merchant, memo, type, hash, valid: !!date && amount > 0 };
    });
  }, [dataRows, dateCol, amountCol, merchantCol, memoCol, typeCol, defaultType]);

  const validItems = parsedItems.filter((p) => p.valid);

  function applyPreset(p: CsvPreset) {
    setDateCol(p.dateCol);
    setAmountCol(p.amountCol);
    setMerchantCol(p.merchantCol);
    setMemoCol(p.memoCol);
    setTypeCol(p.typeCol);
    setHasHeader(p.hasHeader);
    setDefaultType(p.defaultType);
    setCurrency(p.currency);
    setPresetName(p.name);
  }

  function handleSavePreset() {
    if (!presetName.trim()) return;
    const p: CsvPreset = {
      name: presetName.trim(),
      dateCol, amountCol, merchantCol, memoCol, typeCol,
      hasHeader, defaultType, currency,
    };
    savePreset(p);
    setPresets(loadPresets());
  }

  function handleDeletePreset(name: string) {
    deletePreset(name);
    setPresets(loadPresets());
  }

  function handleImport() {
    const fxRate = snapshotRate(currency, rates);
    const items: Omit<Transaction, 'id'>[] = validItems.map((p) => {
      const amountKRW = Math.round(toKRW(p.amount, currency, rates));
      const amountUSD = Math.round(toUSD(p.amount, currency, rates) * 100) / 100;
      return {
        date: p.date,
        type: p.type,
        amount: p.amount,
        currency,
        fxRate,
        amountKRW,
        amountUSD,
        categoryId: defaultCategoryId,
        paymentMethod: paymentMethod || 'CSV 가져오기',
        memo: p.memo,
        dedupeHash: p.hash,
      };
    });
    const res = importTransactionsBulk(items);
    setResult(res);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload size={18} /> CSV 가져오기
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Step 1: file */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">1. 파일 선택 (은행·카드사에서 받은 CSV)</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
            >
              <FileText size={16} />
              {fileName || 'CSV 파일 선택'}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">
              ⚠️ 한글이 깨지면, 엑셀에서 파일을 열어 "다른 이름으로 저장 → CSV UTF-8" 형식으로 저장 후 올려주세요.
            </p>
          </div>

          {rows.length > 0 && (
            <>
              {/* Presets */}
              {presets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">저장된 기관 프리셋</p>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <div key={p.name} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs">
                        <button onClick={() => applyPreset(p)} className="font-medium">{p.name}</button>
                        <button onClick={() => handleDeletePreset(p.name)} className="hover:text-rose-500"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: mapping */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">2. 열 매핑 (어느 칸이 무슨 정보인지)</p>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
                    첫 줄은 제목
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MapSelect label="날짜" value={dateCol} onChange={setDateCol} options={colOptions} colLabel={colLabel} />
                  <MapSelect label="금액" value={amountCol} onChange={setAmountCol} options={colOptions} colLabel={colLabel} />
                  <MapSelect label="가맹점/내용" value={merchantCol} onChange={setMerchantCol} options={colOptions} colLabel={colLabel} allowNone />
                  <MapSelect label="추가 메모" value={memoCol} onChange={setMemoCol} options={colOptions} colLabel={colLabel} allowNone />
                  <MapSelect label="구분 칸(수입/지출)" value={typeCol} onChange={setTypeCol} options={colOptions} colLabel={colLabel} allowNone />
                </div>
              </div>

              {/* Step 3: defaults */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">3. 기본값 설정</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">기본 구분</label>
                    <select value={defaultType} onChange={(e) => setDefaultType(e.target.value as 'expense' | 'income')}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                      <option value="expense">지출</option>
                      <option value="income">수입</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">통화</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                      <option value="KRW">₩ KRW</option>
                      <option value="USD">$ USD</option>
                      <option value="VND">₫ VND</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">기본 카테고리</label>
                    <select value={defaultCategoryId} onChange={(e) => setDefaultCategoryId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                      <option value="">미분류</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">결제수단/계좌</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                      <option value="">CSV 가져오기</option>
                      {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Save preset */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">이 매핑을 기관 프리셋으로 저장 (선택)</label>
                  <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="예: 하나카드"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                </div>
                <button onClick={handleSavePreset} disabled={!presetName.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40">
                  <Save size={14} /> 저장
                </button>
              </div>

              {/* Preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  4. 미리보기 — 전체 {dataRows.length}건 중 유효 {validItems.length}건
                </p>
                <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-750 sticky top-0">
                        <tr className="text-left text-gray-500 dark:text-gray-400">
                          <th className="px-3 py-2">날짜</th>
                          <th className="px-3 py-2">금액</th>
                          <th className="px-3 py-2">내용</th>
                          <th className="px-3 py-2">구분</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedItems.slice(0, 30).map((p, i) => (
                          <tr key={i} className={`border-t border-gray-50 dark:border-gray-700/50 ${!p.valid ? 'opacity-40' : ''}`}>
                            <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300">{p.date || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-900 dark:text-white">{formatCurrency(p.amount, currency)}</td>
                            <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 max-w-[160px] truncate">{p.memo || '—'}</td>
                            <td className="px-3 py-1.5">{p.type === 'income' ? '수입' : '지출'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Result / actions */}
              {result ? (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-start gap-3">
                  <Check size={18} className="text-emerald-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">{result.added}건 추가 완료</p>
                    {result.skipped > 0 && (
                      <p className="text-emerald-600 dark:text-emerald-500 text-xs mt-0.5">
                        중복 {result.skipped}건은 자동으로 건너뛰었습니다.
                      </p>
                    )}
                    <button onClick={onClose} className="mt-2 text-indigo-600 text-xs hover:underline">닫기</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 pt-1">
                  <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                    취소
                  </button>
                  <button onClick={handleImport} disabled={validItems.length === 0}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40">
                    {validItems.length}건 가져오기
                  </button>
                </div>
              )}

              {validItems.length === 0 && (
                <p className="flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertTriangle size={13} /> 유효한 거래가 없습니다. 날짜·금액 열 매핑을 확인해주세요.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MapSelect({ label, value, onChange, options, colLabel, allowNone }: {
  label: string; value: number; onChange: (v: number) => void;
  options: number[]; colLabel: (i: number) => string; allowNone?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
        {allowNone && <option value={-1}>사용 안함</option>}
        {options.map((i) => <option key={i} value={i}>{colLabel(i)}</option>)}
      </select>
    </div>
  );
}
