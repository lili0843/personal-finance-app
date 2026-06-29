import React, { useState } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, X, LineChart } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Account, Currency } from '../../types';
import { formatCurrency, formatAmountInput, parseAmount } from '../../utils/formatters';
import { fromKRW, toKRW } from '../../utils/currency';
import { accountCurrentNative } from '../../utils/calculations';

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#6366F1'];

function SecAccountForm({ onClose, edit }: { onClose: () => void; edit?: Account }) {
  const { addAccount, updateAccount, transactions, rates } = useApp();
  const isEdit = !!edit;
  // 누적 투자원금 = 초기 원금 + 입금 이체. 입력칸은 초기 원금.
  const delta = edit ? accountCurrentNative(edit, transactions, rates) - edit.balance : 0;

  const [name, setName] = useState(edit?.name || '');
  const [currency, setCurrency] = useState<Currency>(edit?.currency || 'KRW');
  const [principalStr, setPrincipalStr] = useState(edit ? edit.balance.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : '');
  const [valuationStr, setValuationStr] = useState(edit?.valuation != null ? edit.valuation.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : '');
  const [color, setColor] = useState(edit?.color || COLORS[0]);
  const [err, setErr] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr('증권사/계좌명을 입력해주세요'); return; }
    const data = {
      name: name.trim(),
      type: 'securities' as const,
      currency,
      balance: parseAmount(principalStr), // 초기 투자원금
      valuation: parseAmount(valuationStr),
      color,
    };
    if (isEdit) updateAccount(edit.id, data);
    else addAccount(data);
    onClose();
  }

  const principalPreview = parseAmount(principalStr) + delta;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{isEdit ? '증권계좌 수정' : '증권계좌 추가'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">증권사 / 계좌명</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 키움증권(미국주식), 토스(국내), 미래에셋 ISA"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">통화</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
              <option value="KRW">₩ KRW</option>
              <option value="USD">$ USD</option>
              <option value="VND">₫ VND</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">초기 투자원금</label>
              <input value={principalStr} inputMode="decimal" onChange={(e) => setPrincipalStr(formatAmountInput(e.target.value))} placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">현재 평가액 (수동)</label>
              <input value={valuationStr} inputMode="decimal" onChange={(e) => setValuationStr(formatAmountInput(e.target.value))} placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            누적 투자원금은 <b>초기 원금 + 입금 이체</b>로 자동 집계됩니다{isEdit && delta !== 0 && <> (현재 {formatCurrency(Math.round(principalPreview), currency)})</>}.
            일반 계좌에서 이 증권계좌로 <b>이체</b>하면 원금이 늘고, 순자산에는 영향이 없습니다.
          </p>
          {err && <p className="text-xs text-rose-500">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300">취소</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">{isEdit ? '수정' : '추가'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SecuritiesManager() {
  const { accounts, transactions, deleteAccount, rates, displayCurrency } = useApp();
  const secAccounts = accounts.filter((a) => a.type === 'securities');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fmt = (krw: number) => formatCurrency(fromKRW(krw, displayCurrency, rates), displayCurrency);

  const totalValKRW = secAccounts.reduce((s, a) => s + toKRW(a.valuation ?? 0, a.currency, rates), 0);
  const totalPrincipalKRW = secAccounts.reduce((s, a) => s + toKRW(accountCurrentNative(a, transactions, rates), a.currency, rates), 0);
  const totalGainKRW = totalValKRW - totalPrincipalKRW;
  const totalRtn = totalPrincipalKRW > 0 ? (totalGainKRW / totalPrincipalKRW) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-violet-200 text-sm mb-1">총 평가액</p>
        <p className="text-3xl font-bold">{fmt(totalValKRW)}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4">
          <div>
            <p className="text-violet-200 text-xs mb-0.5">누적 투자원금</p>
            <p className="text-sm font-semibold">{fmt(totalPrincipalKRW)}</p>
          </div>
          <div>
            <p className="text-violet-200 text-xs mb-0.5">평가손익</p>
            <p className={`text-sm font-semibold ${totalGainKRW >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
              {totalGainKRW >= 0 ? '+' : ''}{fmt(totalGainKRW)} ({totalRtn >= 0 ? '+' : ''}{totalRtn.toFixed(1)}%)
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => { setEditTarget(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
          <Plus size={16} /> 증권계좌 추가
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {secAccounts.map((a) => {
          const principal = accountCurrentNative(a, transactions, rates);
          const valuation = a.valuation ?? 0;
          const gain = valuation - principal;
          const rtn = principal > 0 ? (gain / principal) * 100 : 0;
          return (
            <div key={a.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: a.color + '20' }}>
                    <LineChart size={20} style={{ color: a.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{a.name}</p>
                    <p className="text-xs text-gray-400">증권계좌 · {a.currency}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditTarget(a); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                  {deleteConfirm === a.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { deleteAccount(a.id); setDeleteConfirm(null); }} className="px-2 py-1 rounded text-xs bg-rose-500 text-white">확인</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">취소</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(a.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-0.5">현재 평가액</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">{formatCurrency(valuation, a.currency)}</p>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-[11px] text-gray-400">누적 원금</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(Math.round(principal), a.currency)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">평가손익 (수익률)</p>
                  <p className={`font-semibold flex items-center gap-1 ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {gain >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {gain >= 0 ? '+' : ''}{formatCurrency(Math.round(gain), a.currency)} ({rtn >= 0 ? '+' : ''}{rtn.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {secAccounts.length === 0 && (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <LineChart size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">등록된 증권계좌가 없습니다</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-indigo-600 text-sm hover:underline">증권계좌 추가하기</button>
          </div>
        )}
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
        💡 <b>사용법</b> — 일반 계좌에서 증권계좌로 돈을 넣을 땐 <b>거래내역 → 이체</b>로 처리하세요 (지출 아님, 순자산 변화 없음).
        주식 매도 후 일반 계좌로 뺄 때도 <b>이체</b>로 처리합니다. 평가손익은 <b>현재 평가액</b>만 수동으로 갱신하면 자동 계산됩니다.
      </div>

      {showForm && <SecAccountForm onClose={() => { setShowForm(false); setEditTarget(undefined); }} edit={editTarget} />}
    </div>
  );
}
