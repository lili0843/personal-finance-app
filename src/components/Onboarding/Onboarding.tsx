import React, { useState } from 'react';
import { Wallet, Plus, Trash2, Camera, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Account, AccountType, Currency } from '../../types';
import { formatAmountInput, parseAmount } from '../../utils/formatters';
import ScreenshotAssetImport from './ScreenshotAssetImport';

const TYPE_LABELS: Record<AccountType, string> = {
  bank: '은행', cash: '현금', securities: '증권', savings: '적금', deposit: '예금', card: '신용카드',
};
const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#F97316'];
const QUICK = ['우리은행', '신한은행', '하나은행', '기업은행', '국민은행', '현금', '증권계좌', '베트남 우리은행'];

interface Row {
  name: string;
  type: AccountType;
  currency: Currency;
  balanceStr: string;
}

function emptyRow(): Row {
  return { name: '', type: 'bank', currency: 'KRW', balanceStr: '' };
}

export default function Onboarding() {
  const { user, applyInitialSetup, updateSettings } = useApp();
  const flagKey = user ? `pf_onboarded_${user.uid}` : 'pf_onboarded';
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(flagKey) === '1');
  const [step, setStep] = useState<'choose' | 'accounts'>('choose');
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [showShot, setShowShot] = useState(false);

  if (dismissed) return null;

  function finish() {
    localStorage.setItem(flagKey, '1');
    setDismissed(true);
  }

  function chooseSample() {
    // 샘플 데이터 유지하고 종료
    finish();
  }

  function addRow() {
    setRows((r) => [...r, emptyRow()]);
  }
  function quickAdd(name: string) {
    setRows((r) => {
      // 빈 첫 행이 있으면 거기에, 아니면 새로 추가
      const idx = r.findIndex((x) => !x.name.trim());
      const type: AccountType = name === '현금' ? 'cash' : name === '증권계좌' ? 'securities' : 'bank';
      const currency: Currency = name.includes('베트남') ? 'VND' : 'KRW';
      if (idx >= 0) {
        return r.map((x, i) => i === idx ? { ...x, name, type, currency } : x);
      }
      return [...r, { name, type, currency, balanceStr: '' }];
    });
  }
  function update(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  }
  function remove(i: number) {
    setRows((r) => r.length > 1 ? r.filter((_, idx) => idx !== i) : r);
  }

  function saveAccounts() {
    const valid = rows.filter((r) => r.name.trim());
    const accs: Omit<Account, 'id'>[] = valid.map((r, i) => ({
      name: r.name.trim(),
      type: r.type,
      currency: r.currency,
      balance: parseAmount(r.balanceStr),
      color: COLORS[i % COLORS.length],
      isLiability: r.type === 'card',
    }));
    applyInitialSetup(accs);
    updateSettings({}); // 저장 트리거
    finish();
  }

  function onShotAccounts(found: { name: string; balance: number; currency: Currency }[]) {
    setShowShot(false);
    setRows((r) => {
      const base = r.filter((x) => x.name.trim());
      const added: Row[] = found.map((f) => ({
        name: f.name,
        type: 'bank',
        currency: f.currency,
        balanceStr: f.balance ? f.balance.toLocaleString('ko-KR') : '',
      }));
      const merged = [...base, ...added];
      return merged.length ? merged : [emptyRow()];
    });
    setStep('accounts');
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 dark:bg-gray-950 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-8 min-h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mb-3">
            <Wallet size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">가계부 시작하기</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {step === 'choose' ? '어떻게 시작할까요?' : '현재 가진 자산을 등록해주세요'}
          </p>
        </div>

        {step === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('accounts')}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <Plus size={22} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 dark:text-white">내 자산 직접 등록</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">은행·현금·증권 잔액을 입력해 깨끗하게 시작</p>
                </div>
                <ArrowRight size={18} className="text-gray-300" />
              </div>
            </button>

            <button
              onClick={() => setShowShot(true)}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-violet-200 dark:border-violet-800 hover:border-violet-400 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <Camera size={22} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    은행 스크린샷으로 등록 <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">베타</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">잔액 화면을 캡처해 올리면 자동으로 인식</p>
                </div>
                <ArrowRight size={18} className="text-gray-300" />
              </div>
            </button>

            <button
              onClick={chooseSample}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Sparkles size={22} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 dark:text-white">샘플 데이터로 둘러보기</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">예시 데이터로 기능을 먼저 살펴보기</p>
                </div>
                <ArrowRight size={18} className="text-gray-300" />
              </div>
            </button>
          </div>
        )}

        {step === 'accounts' && (
          <div className="flex-1 flex flex-col">
            {/* Quick chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK.map((q) => (
                <button key={q} onClick={() => quickAdd(q)}
                  className="px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-500">
                  + {q}
                </button>
              ))}
              <button onClick={() => setShowShot(true)}
                className="px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 text-xs text-violet-600 dark:text-violet-400 flex items-center gap-1">
                <Camera size={12} /> 스크린샷
              </button>
            </div>

            <div className="space-y-3 flex-1">
              {rows.map((r, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex gap-2">
                    <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="계좌 이름 (예: 우리은행)"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                    <button onClick={() => remove(i)} className="p-2 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={r.type} onChange={(e) => update(i, { type: e.target.value as AccountType })}
                      className="px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                      {(Object.keys(TYPE_LABELS) as AccountType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                    </select>
                    <select value={r.currency} onChange={(e) => update(i, { currency: e.target.value as Currency })}
                      className="px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                      <option value="KRW">₩</option>
                      <option value="USD">$</option>
                      <option value="VND">₫</option>
                    </select>
                    <input value={r.balanceStr} inputMode="decimal" onChange={(e) => update(i, { balanceStr: formatAmountInput(e.target.value) })} placeholder="잔액"
                      className="px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addRow}
              className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-500 flex items-center justify-center gap-1.5">
              <Plus size={16} /> 계좌 추가
            </button>

            <div className="flex gap-3 mt-5 sticky bottom-0 bg-gray-50 dark:bg-gray-950 py-3">
              <button onClick={() => setStep('choose')}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium">
                뒤로
              </button>
              <button onClick={saveAccounts} disabled={!rows.some((r) => r.name.trim())}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40">
                등록하고 시작하기
              </button>
            </div>
          </div>
        )}

        <button onClick={finish} className="mt-6 text-center text-xs text-gray-400 hover:text-gray-500">
          나중에 하기 (건너뛰기)
        </button>
      </div>

      {showShot && <ScreenshotAssetImport onClose={() => setShowShot(false)} onConfirm={onShotAccounts} />}
    </div>
  );
}
