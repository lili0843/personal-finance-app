import React, { useState } from 'react';
import { X, MessageSquare, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Currency, Transaction } from '../../types';
import { parseSms } from '../../utils/smsParse';
import { snapshotRate, toKRW, toUSD } from '../../utils/currency';
import { dedupeHash } from '../../utils/csvImport';
import { formatAmountInput, parseAmount } from '../../utils/formatters';

interface Props {
  onClose: () => void;
}

interface EditableRow {
  include: boolean;
  amountStr: string;
  currency: Currency;
  merchant: string;
  date: string;
  type: 'expense' | 'income';
  categoryId: string;
}

const SAMPLE = `[Web발신] 하나카드 승인 홍*동님 12,500원 일시불 06/18 14:30 스타벅스코리아`;

export default function SmsParseModal({ onClose }: Props) {
  const { categories, importTransactionsBulk, rates } = useApp();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<EditableRow[] | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  function handleParse() {
    const parsed = parseSms(text);
    setResult(null);
    setRows(parsed.map((p) => ({
      include: true,
      amountStr: p.amount.toLocaleString('ko-KR'),
      currency: p.currency,
      merchant: p.merchant,
      date: p.date,
      type: p.type,
      categoryId: '',
    })));
  }

  function updateRow(i: number, patch: Partial<EditableRow>) {
    setRows((prev) => prev ? prev.map((r, idx) => idx === i ? { ...r, ...patch } : r) : prev);
  }

  function handleAdd() {
    if (!rows) return;
    const selected = rows.filter((r) => r.include && parseAmount(r.amountStr) > 0 && r.date);
    const items: Omit<Transaction, 'id'>[] = selected.map((r) => {
      const amount = parseAmount(r.amountStr);
      const fxRate = snapshotRate(r.currency, rates);
      return {
        date: r.date,
        type: r.type,
        amount,
        currency: r.currency,
        fxRate,
        amountKRW: Math.round(toKRW(amount, r.currency, rates)),
        amountUSD: Math.round(toUSD(amount, r.currency, rates) * 100) / 100,
        categoryId: r.categoryId,
        paymentMethod: '문자 인식',
        memo: r.merchant,
        dedupeHash: dedupeHash(r.date, amount, r.merchant),
      };
    });
    const res = importTransactionsBulk(items);
    setResult(res);
  }

  const validCount = rows ? rows.filter((r) => r.include && parseAmount(r.amountStr) > 0).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={18} /> 문자 인식으로 추가
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            카드 결제 문자를 복사해서 아래에 붙여넣으세요. 금액·가맹점·날짜를 자동으로 인식합니다.
            여러 건은 빈 줄로 구분하면 한 번에 인식됩니다.
          </p>

          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={`결제 문자를 붙여넣으세요.\n예) ${SAMPLE}`}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <button onClick={() => setText(SAMPLE)} className="text-xs text-gray-400 hover:text-indigo-500">예시 넣기</button>
              <button
                onClick={handleParse}
                disabled={!text.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40"
              >
                <Sparkles size={14} /> 인식하기
              </button>
            </div>
          </div>

          {rows && rows.length === 0 && (
            <p className="flex items-center gap-1.5 text-xs text-amber-500">
              <AlertTriangle size={13} /> 인식된 거래가 없습니다. 금액(원/＄/동)이 포함됐는지 확인하거나, 수동으로 입력해주세요.
            </p>
          )}

          {rows && rows.length > 0 && !result && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                인식 결과 {rows.length}건 — 확인 후 수정하세요
              </p>
              {rows.map((r, i) => (
                <div key={i} className={`rounded-xl border p-3 space-y-2 ${r.include ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-gray-700 opacity-50'}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                      <input type="checkbox" checked={r.include} onChange={(e) => updateRow(i, { include: e.target.checked })} />
                      포함
                    </label>
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-xs">
                      <button onClick={() => updateRow(i, { type: 'expense' })} className={`px-2.5 py-1 ${r.type === 'expense' ? 'bg-rose-500 text-white' : 'text-gray-500'}`}>지출</button>
                      <button onClick={() => updateRow(i, { type: 'income' })} className={`px-2.5 py-1 ${r.type === 'income' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}>수입</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={r.amountStr} onChange={(e) => updateRow(i, { amountStr: formatAmountInput(e.target.value) })}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" placeholder="금액" />
                    <select value={r.currency} onChange={(e) => updateRow(i, { currency: e.target.value as Currency })}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                      <option value="KRW">₩ KRW</option>
                      <option value="USD">$ USD</option>
                      <option value="VND">₫ VND</option>
                    </select>
                    <input type="date" value={r.date} onChange={(e) => updateRow(i, { date: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                    <select value={r.categoryId} onChange={(e) => updateRow(i, { categoryId: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                      <option value="">카테고리</option>
                      {categories.filter((c) => c.type === r.type || c.type === 'both').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input value={r.merchant} onChange={(e) => updateRow(i, { merchant: e.target.value })}
                      className="col-span-2 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" placeholder="가맹점/메모" />
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                  취소
                </button>
                <button onClick={handleAdd} disabled={validCount === 0}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40">
                  {validCount}건 추가
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-start gap-3">
              <Check size={18} className="text-emerald-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">{result.added}건 추가 완료</p>
                {result.skipped > 0 && (
                  <p className="text-emerald-600 dark:text-emerald-500 text-xs mt-0.5">중복 {result.skipped}건은 건너뛰었습니다.</p>
                )}
                <button onClick={onClose} className="mt-2 text-indigo-600 text-xs hover:underline">닫기</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
