import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Repeat, Play, X, ChevronDown } from 'lucide-react';
import { RecurringTransaction, TransactionType, Currency } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency, formatAmountInput, parseAmount } from '../../utils/formatters';

interface RecurringFormProps {
  onClose: () => void;
  editRecurring?: RecurringTransaction;
}

function RecurringForm({ onClose, editRecurring }: RecurringFormProps) {
  const { categories, accounts, cards, addRecurring, updateRecurring } = useApp();
  const isEdit = !!editRecurring;

  const [name, setName] = useState(editRecurring?.name || '');
  const [type, setType] = useState<TransactionType>(editRecurring?.type || 'expense');
  const [amountStr, setAmountStr] = useState(editRecurring ? editRecurring.amount.toLocaleString('ko-KR') : '');
  const [currency, setCurrency] = useState<Currency>(editRecurring?.currency || 'KRW');
  const [categoryId, setCategoryId] = useState(editRecurring?.categoryId || '');
  const [dayOfMonth, setDayOfMonth] = useState(editRecurring?.dayOfMonth || 1);
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'account'>(
    editRecurring?.cardId ? 'card' : editRecurring?.accountId ? 'account' : 'cash'
  );
  const [selectedCardId, setSelectedCardId] = useState(editRecurring?.cardId || '');
  const [selectedAccountId, setSelectedAccountId] = useState(editRecurring?.accountId || '');
  const [memo, setMemo] = useState(editRecurring?.memo || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredCategories = categories.filter((c) => c.type === type || c.type === 'both');

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = '이름을 입력해주세요';
    if (!amountStr || parseAmount(amountStr) <= 0) errs.amount = '금액을 입력해주세요';
    if (!categoryId) errs.categoryId = '카테고리를 선택해주세요';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function getPaymentInfo() {
    if (paymentType === 'card') {
      const card = cards.find((c) => c.id === selectedCardId);
      return { paymentMethod: card?.name || '', cardId: selectedCardId, accountId: undefined };
    }
    if (paymentType === 'account') {
      const acc = accounts.find((a) => a.id === selectedAccountId);
      return { paymentMethod: acc?.name || '', cardId: undefined, accountId: selectedAccountId };
    }
    return { paymentMethod: '현금', cardId: undefined, accountId: undefined };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payment = getPaymentInfo();
    const data = {
      name: name.trim(),
      type,
      amount: parseAmount(amountStr),
      currency,
      categoryId,
      dayOfMonth,
      memo,
      isActive: editRecurring?.isActive ?? true,
      lastApplied: editRecurring?.lastApplied,
      ...payment,
    };
    if (isEdit) updateRecurring(editRecurring.id, data);
    else addRecurring(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{isEdit ? '반복거래 수정' : '반복거래 추가'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">이름</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 월급, 월세"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
            <button type="button" onClick={() => setType('income')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${type === 'income' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>수입</button>
            <button type="button" onClick={() => setType('expense')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${type === 'expense' ? 'bg-rose-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>지출</button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">금액</label>
            <div className="flex gap-2">
              <input type="text" inputMode="decimal" value={amountStr} onChange={(e) => setAmountStr(formatAmountInput(e.target.value))} placeholder="0"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-24 px-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="KRW">₩ KRW</option>
                <option value="USD">$ USD</option>
                <option value="VND">₫ VND</option>
              </select>
            </div>
            {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">카테고리</label>
            <div className="relative">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                <option value="">카테고리 선택</option>
                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {errors.categoryId && <p className="text-xs text-rose-500 mt-1">{errors.categoryId}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">매월 {dayOfMonth}일</label>
            <input type="number" min={1} max={31} value={dayOfMonth} onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">결제수단</label>
            <div className="flex gap-2 mb-2">
              {(['cash', 'card', 'account'] as const).map((pt) => (
                <button key={pt} type="button" onClick={() => setPaymentType(pt)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${paymentType === pt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>
                  {pt === 'cash' ? '현금' : pt === 'card' ? '카드' : '계좌'}
                </button>
              ))}
            </div>
            {paymentType === 'card' && (
              <select value={selectedCardId} onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">카드 선택</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {paymentType === 'account' && (
              <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">계좌 선택</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">메모 (선택)</label>
            <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">취소</button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">{isEdit ? '수정' : '추가'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RecurringManager() {
  const { recurringTransactions, categories, updateRecurring, deleteRecurring, applyRecurringNow, settings } = useApp();
  const currency = settings.currency;
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringTransaction | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  function handleApply(id: string) {
    applyRecurringNow(id);
    setApplySuccess(id);
    setTimeout(() => setApplySuccess(null), 2000);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">매월 자동으로 등록되는 거래를 관리합니다</p>
        <button onClick={() => { setEditTarget(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
          <Plus size={16} /> 반복거래 추가
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recurringTransactions.map((rec) => {
          const cat = categories.find((c) => c.id === rec.categoryId);
          const isIncome = rec.type === 'income';

          return (
            <div key={rec.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border transition-all ${
              rec.isActive ? 'border-gray-100 dark:border-gray-700' : 'border-gray-200 dark:border-gray-600 opacity-60'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: (cat?.color || '#6B7280') + '20' }}>
                    <Repeat size={18} style={{ color: cat?.color || '#6B7280' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{rec.name}</p>
                    <p className="text-xs text-gray-400">매월 {rec.dayOfMonth}일</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateRecurring(rec.id, { isActive: !rec.isActive })}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      rec.isActive
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {rec.isActive ? '활성' : '비활성'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">금액</p>
                  <p className={`text-lg font-bold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isIncome ? '+' : '-'}{formatCurrency(rec.amount, rec.currency || 'KRW')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">카테고리</p>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: cat?.color || '#6B7280' }} />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{cat?.name || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                <span>{isIncome ? '수입' : '지출'}</span>
                <span>·</span>
                <span>{rec.paymentMethod}</span>
                {rec.memo && <><span>·</span><span>{rec.memo}</span></>}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApply(rec.id)}
                  disabled={!rec.isActive}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    applySuccess === rec.id
                      ? 'bg-emerald-500 text-white'
                      : rec.isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <Play size={12} />
                  {applySuccess === rec.id ? '등록됨!' : '지금 등록'}
                </button>
                <button onClick={() => { setEditTarget(rec); setShowForm(true); }}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Edit2 size={13} />
                </button>
                {deleteConfirm === rec.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => { deleteRecurring(rec.id); setDeleteConfirm(null); }} className="px-2 py-2 rounded-xl text-xs bg-rose-500 text-white">확인</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-2 py-2 rounded-xl text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">취소</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(rec.id)}
                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {recurringTransactions.length === 0 && (
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <Repeat size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">등록된 반복거래가 없습니다</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-indigo-600 text-sm hover:underline">반복거래 추가하기</button>
          </div>
        )}
      </div>

      {showForm && <RecurringForm onClose={() => { setShowForm(false); setEditTarget(undefined); }} editRecurring={editTarget} />}
    </div>
  );
}
