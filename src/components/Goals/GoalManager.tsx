import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Target, X, Calendar } from 'lucide-react';
import { Goal, Currency } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency, formatAmountInput, parseAmount, getDaysUntil, getPastMonths } from '../../utils/formatters';
import { getGoalProgress, estimateGoalDate, getMonthIncome, getMonthExpense } from '../../utils/calculations';
import { toKRW } from '../../utils/currency';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#6366F1', '#F97316'];

interface GoalFormProps {
  onClose: () => void;
  editGoal?: Goal;
}

function GoalForm({ onClose, editGoal }: GoalFormProps) {
  const { addGoal, updateGoal } = useApp();
  const isEdit = !!editGoal;
  const [name, setName] = useState(editGoal?.name || '');
  const [currency, setCurrency] = useState<Currency>(editGoal?.currency || 'KRW');
  const [targetStr, setTargetStr] = useState(editGoal ? editGoal.targetAmount.toLocaleString('ko-KR') : '');
  const [currentStr, setCurrentStr] = useState(editGoal ? editGoal.currentAmount.toLocaleString('ko-KR') : '');
  const [targetDate, setTargetDate] = useState(editGoal?.targetDate || '');
  const [color, setColor] = useState(editGoal?.color || COLORS[0]);
  const [description, setDescription] = useState(editGoal?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = '목표명을 입력해주세요';
    if (!targetStr || parseAmount(targetStr) <= 0) errs.target = '목표 금액을 입력해주세요';
    if (!targetDate) errs.date = '목표일을 설정해주세요';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const data = {
      name: name.trim(),
      currency,
      targetAmount: parseAmount(targetStr),
      currentAmount: parseAmount(currentStr),
      targetDate,
      color,
      description,
    };
    if (isEdit) updateGoal(editGoal.id, data);
    else addGoal(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{isEdit ? '목표 수정' : '목표 추가'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">목표명</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 비상금 마련"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">목표 금액 / 통화</label>
            <div className="flex gap-2">
              <input type="text" inputMode="decimal" value={targetStr} onChange={(e) => setTargetStr(formatAmountInput(e.target.value))} placeholder="0"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-20 px-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="KRW">₩</option>
                <option value="USD">$</option>
                <option value="VND">₫</option>
              </select>
            </div>
            {errors.target && <p className="text-xs text-rose-500 mt-1">{errors.target}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">현재 금액</label>
            <input type="text" inputMode="decimal" value={currentStr} onChange={(e) => setCurrentStr(formatAmountInput(e.target.value))} placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">목표일</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">설명 (선택)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="목표에 대한 설명" rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">색상</label>
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

export default function GoalManager() {
  const { goals, transactions, updateGoal, deleteGoal, rates } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Goal | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const months3 = getPastMonths(3);
  const avgMonthlyNet = months3.reduce((s, m) => {
    return s + getMonthIncome(transactions, m) - getMonthExpense(transactions, m);
  }, 0) / 3;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => { setEditTarget(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
          <Plus size={16} /> 목표 추가
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const gcur = goal.currency || 'KRW';
          const pct = getGoalProgress(goal.targetAmount, goal.currentAmount);
          const daysLeft = getDaysUntil(goal.targetDate);
          // 예상 달성일은 KRW 기준으로 환산해 월 순저축과 비교
          const estimatedDate = estimateGoalDate(
            toKRW(goal.targetAmount, gcur, rates),
            toKRW(goal.currentAmount, gcur, rates),
            avgMonthlyNet
          );
          const isDone = pct >= 100;
          const isOverdue = daysLeft < 0 && !isDone;

          return (
            <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: goal.color + '20' }}>
                    <Target size={20} style={{ color: goal.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{goal.name}</p>
                    {goal.description && <p className="text-xs text-gray-400 mt-0.5">{goal.description}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditTarget(goal); setShowForm(true); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                  {deleteConfirm === goal.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => { deleteGoal(goal.id); setDeleteConfirm(null); }} className="px-2 py-1 rounded text-xs bg-rose-500 text-white">확인</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">취소</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(goal.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>

              {/* Progress circle */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" className="dark:stroke-gray-700" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={goal.color} strokeWidth="3"
                      strokeDasharray={`${pct} ${100 - pct}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.5s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">달성액</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(goal.currentAmount, gcur)}</p>
                  <p className="text-xs text-gray-400">/ {formatCurrency(goal.targetAmount, gcur)}</p>
                </div>
              </div>

              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: goal.color }} />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">목표일</span>
                  <span className={`font-medium ${isOverdue ? 'text-rose-500' : 'text-gray-700 dark:text-gray-200'}`}>
                    {goal.targetDate} ({isOverdue ? `${Math.abs(daysLeft)}일 초과` : isDone ? '달성!' : `${daysLeft}일 남음`})
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">남은 금액</span>
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {isDone ? '완료!' : formatCurrency(goal.targetAmount - goal.currentAmount, gcur)}
                  </span>
                </div>
                {!isDone && estimatedDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">예상 달성일</span>
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">
                      {estimatedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                    </span>
                  </div>
                )}
              </div>

              {isDone && (
                <div className="mt-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">🎉 목표 달성!</p>
                </div>
              )}

              {/* Quick update */}
              {!isDone && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">현재 금액 업데이트</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="금액 직접 입력"
                      className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt((e.target as HTMLInputElement).value, 10);
                          if (!isNaN(val) && val >= 0) {
                            updateGoal(goal.id, { currentAmount: val });
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <span className="text-xs text-gray-400 self-center">Enter로 저장</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="col-span-3 bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <Target size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">등록된 목표가 없습니다</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-indigo-600 text-sm hover:underline">목표 추가하기</button>
          </div>
        )}
      </div>

      {showForm && <GoalForm onClose={() => { setShowForm(false); setEditTarget(undefined); }} editGoal={editTarget} />}
    </div>
  );
}
