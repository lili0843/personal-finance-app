import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CreditCard, X } from 'lucide-react';
import { Card } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency, formatAmountInput, parseAmount, getYearMonth, getPastMonths, formatMonth, getDaysUntil } from '../../utils/formatters';
import { getCardUsage } from '../../utils/calculations';
import { fromKRW } from '../../utils/currency';

const COLORS = ['#1F2937', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1'];

interface CardFormProps {
  onClose: () => void;
  editCard?: Card;
}

function CardForm({ onClose, editCard }: CardFormProps) {
  const { addCard, updateCard } = useApp();
  const isEdit = !!editCard;
  const [name, setName] = useState(editCard?.name || '');
  const [limitStr, setLimitStr] = useState(editCard ? editCard.limit.toLocaleString('ko-KR') : '');
  const [color, setColor] = useState(editCard?.color || COLORS[0]);
  const [lastFour, setLastFour] = useState(editCard?.lastFour || '');
  const [cardKind, setCardKind] = useState<'credit' | 'debit'>(editCard?.cardKind || 'credit');
  const [paymentDayStr, setPaymentDayStr] = useState(editCard?.paymentDay ? String(editCard.paymentDay) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = '카드명을 입력해주세요';
    if (!limitStr || parseAmount(limitStr) <= 0) errs.limit = '한도를 입력해주세요';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const pd = parseInt(paymentDayStr, 10);
    const data = {
      name: name.trim(),
      limit: parseAmount(limitStr),
      color, lastFour, cardKind,
      paymentDay: !isNaN(pd) && pd >= 1 && pd <= 31 ? pd : undefined,
    };
    if (isEdit) updateCard(editCard.id, data);
    else addCard(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{isEdit ? '카드 수정' : '카드 추가'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">카드명</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 신한카드"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
            {([['credit', '신용카드'], ['debit', '체크카드']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setCardKind(k)}
                className={`flex-1 py-2.5 text-sm font-semibold ${cardKind === k ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">카드 뒷 4자리 (선택)</label>
              <input type="text" value={lastFour} onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" maxLength={4}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">결제 예정일 (선택)</label>
              <input type="text" inputMode="numeric" value={paymentDayStr}
                onChange={(e) => setPaymentDayStr(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="예: 14" maxLength={2}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">한도</label>
            <div className="relative">
              <input type="text" inputMode="decimal" value={limitStr} onChange={(e) => setLimitStr(formatAmountInput(e.target.value))} placeholder="0"
                className="w-full px-3 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
            </div>
            {errors.limit && <p className="text-xs text-rose-500 mt-1">{errors.limit}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">카드 색상</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
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

function nextPaymentInfo(paymentDay?: number): { dateStr: string; dday: number } | null {
  if (!paymentDay) return null;
  const now = new Date();
  const mkDate = (y: number, mIdx: number) => {
    const last = new Date(y, mIdx + 1, 0).getDate();
    return new Date(y, mIdx, Math.min(paymentDay, last));
  };
  let d = mkDate(now.getFullYear(), now.getMonth());
  if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    d = mkDate(now.getFullYear(), now.getMonth() + 1);
  }
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dateStr, dday: getDaysUntil(dateStr) };
}

export default function CardManager() {
  const { cards, transactions, deleteCard, rates, displayCurrency } = useApp();
  const currency = displayCurrency;
  const fmt = (krw: number) => formatCurrency(fromKRW(krw, displayCurrency, rates), displayCurrency);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Card | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const currentMonth = getYearMonth();
  const months3 = getPastMonths(3);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => { setEditTarget(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
          <Plus size={16} /> 카드 추가
        </button>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map((card) => {
          const usage = getCardUsage(transactions, card.id, currentMonth);
          const pct = card.limit > 0 ? (usage / card.limit) * 100 : 0;
          const isOver80 = pct >= 80;
          const isOver100 = pct >= 100;
          const pay = nextPaymentInfo(card.paymentDay);
          const kindLabel = card.cardKind === 'debit' ? '체크카드' : '신용카드';

          return (
            <div key={card.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Card visual */}
              <div className="p-5 relative" style={{ background: card.color }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-xs mb-1">{kindLabel}</p>
                    <p className="text-white font-bold text-lg">{card.name}</p>
                    {card.lastFour && <p className="text-white/60 text-sm mt-1">**** **** **** {card.lastFour}</p>}
                  </div>
                  <CreditCard size={28} className="text-white/40" />
                </div>
              </div>

              {/* Usage info */}
              <div className="p-5">
                {/* 결제 예정일 */}
                {pay && (
                  <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">결제 예정일</span>
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      매월 {card.paymentDay}일 · {pay.dday === 0 ? '오늘' : `D-${pay.dday}`}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <p className="text-[11px] text-gray-400 mb-0.5">이번 달 청구</p>
                    <p className={`text-sm font-bold ${isOver100 ? 'text-rose-600 dark:text-rose-400' : isOver80 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                      {fmt(usage)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 mb-0.5">남은 한도</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(Math.max(0, card.limit - usage))}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 mb-0.5">사용률</p>
                    <p className={`text-sm font-bold ${isOver100 ? 'text-rose-600 dark:text-rose-400' : isOver80 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{pct.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">한도 {fmt(card.limit)}</span>
                </div>

                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full transition-all ${isOver100 ? 'bg-rose-500' : isOver80 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isOver100 ? 'text-rose-500' : isOver80 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {pct.toFixed(1)}% 사용
                    {isOver100 && ' ⚠️ 한도 초과'}
                    {!isOver100 && isOver80 && ' ⚠️ 한도 주의'}
                  </span>
                  <span className="text-xs text-gray-400">잔여 {fmt(Math.max(0, card.limit - usage))}</span>
                </div>

                {/* Monthly breakdown */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">최근 3개월</p>
                  <div className="space-y-1.5">
                    {months3.map((m) => {
                      const mu = getCardUsage(transactions, card.id, m);
                      const mp = card.limit > 0 ? (mu / card.limit) * 100 : 0;
                      return (
                        <div key={m} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-16 flex-shrink-0">{formatMonth(m).replace('년 ', '/').replace('월', '')}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-400" style={{ width: `${Math.min(mp, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-300 w-24 text-right flex-shrink-0">{fmt(mu)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setEditTarget(card); setShowForm(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Edit2 size={13} /> 수정
                  </button>
                  {deleteConfirm === card.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => { deleteCard(card.id); setDeleteConfirm(null); }} className="px-3 py-2 rounded-xl text-xs bg-rose-500 text-white font-medium">삭제 확인</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-2 rounded-xl text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">취소</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(card.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                      <Trash2 size={13} /> 삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {cards.length === 0 && (
          <div className="col-span-3 bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">등록된 카드가 없습니다</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-indigo-600 text-sm hover:underline">카드 추가하기</button>
          </div>
        )}
      </div>

      {showForm && <CardForm onClose={() => { setShowForm(false); setEditTarget(undefined); }} editCard={editTarget} />}
    </div>
  );
}
