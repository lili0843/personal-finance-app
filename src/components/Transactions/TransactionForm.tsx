import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, CreditCard, FileText, ChevronDown, ArrowRight } from 'lucide-react';
import { Transaction, TransactionType, Currency } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { getTodayString, formatAmountInput, parseAmount, formatCurrency } from '../../utils/formatters';
import { snapshotRate, toKRW, toUSD } from '../../utils/currency';

interface Props {
  onClose: () => void;
  editTransaction?: Transaction;
}

export default function TransactionForm({ onClose, editTransaction }: Props) {
  const { categories, accounts, cards, addTransaction, updateTransaction, addExchangeFeeExpense, rates } = useApp();
  const isEdit = !!editTransaction;

  const [type, setType] = useState<TransactionType>(editTransaction?.type || 'expense');
  const [date, setDate] = useState(editTransaction?.date || getTodayString());
  const [amountStr, setAmountStr] = useState(editTransaction ? editTransaction.amount.toLocaleString('ko-KR') : '');
  const [currency, setCurrency] = useState<Currency>(editTransaction?.currency || 'KRW');
  const [categoryId, setCategoryId] = useState(editTransaction?.categoryId || '');
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'account'>(
    editTransaction?.cardId ? 'card' : editTransaction?.accountId ? 'account' : 'cash'
  );
  const [selectedCardId, setSelectedCardId] = useState(editTransaction?.cardId || '');
  const [selectedAccountId, setSelectedAccountId] = useState(editTransaction?.accountId || '');
  const [installmentMonths, setInstallmentMonths] = useState<number>(editTransaction?.installmentMonths || 1);
  // 이체 전용
  const [fromAccountId, setFromAccountId] = useState(editTransaction?.fromAccountId || '');
  const [toAccountId, setToAccountId] = useState(editTransaction?.toAccountId || '');
  const [exchangeRateStr, setExchangeRateStr] = useState(editTransaction?.exchangeRate ? String(editTransaction.exchangeRate) : '');
  const [feeStr, setFeeStr] = useState(editTransaction?.fee ? editTransaction.fee.toLocaleString('ko-KR') : '');
  const [feeCurrency, setFeeCurrency] = useState<Currency>(editTransaction?.feeCurrency || 'USD');
  const [feeDeduct, setFeeDeduct] = useState<'from' | 'to'>(editTransaction?.feeDeduct || 'from');
  const [memo, setMemo] = useState(editTransaction?.memo || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isTransfer = type === 'transfer';
  const filteredCategories = categories.filter((c) => c.type === type || c.type === 'both');

  // 이체 시 출금/입금 계좌와 통화
  const fromAcc = accounts.find((a) => a.id === fromAccountId);
  const toAcc = accounts.find((a) => a.id === toAccountId);
  const fromCur: Currency = (isTransfer && fromAcc) ? fromAcc.currency : currency;
  const toCur: Currency = toAcc ? toAcc.currency : fromCur;
  const isExchange = isTransfer && !!fromAcc && !!toAcc && fromCur !== toCur;

  useEffect(() => {
    if (!isTransfer && !filteredCategories.find((c) => c.id === categoryId)) {
      setCategoryId('');
    }
  }, [type]);

  // 이체 모드: 금액 통화를 출금 계좌 통화로 자동 설정
  useEffect(() => {
    if (isTransfer && fromAcc) setCurrency(fromAcc.currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransfer, fromAccountId]);

  // 환전이면 시장 환율을 제안값으로 채움 + 수수료 통화 기본값
  useEffect(() => {
    if (isExchange) {
      const cross = snapshotRate(fromCur, rates) / snapshotRate(toCur, rates);
      setExchangeRateStr(String(Math.round(cross * 100) / 100));
      setFeeCurrency(fromCur);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAccountId, toAccountId]);

  // 입력 금액을 환산 미리보기
  const amountNum = parseAmount(amountStr);
  const previewKRW = toKRW(amountNum, currency, rates);
  const exchangeRate = parseAmount(exchangeRateStr);
  const feeNum = parseAmount(feeStr);
  const toAmount = isExchange ? amountNum * exchangeRate : 0;
  // 수수료를 출금/입금 통화로 환산
  const feeKRWval = feeNum > 0 ? toKRW(feeNum, feeCurrency, rates) : 0;
  const feeInFrom = snapshotRate(fromCur, rates) > 0 ? feeKRWval / snapshotRate(fromCur, rates) : 0;
  const feeInTo = snapshotRate(toCur, rates) > 0 ? feeKRWval / snapshotRate(toCur, rates) : 0;
  const realOut = amountNum + (feeDeduct === 'from' ? feeInFrom : 0); // 실제 출금 (fromCur)
  const realIn = toAmount - (feeDeduct === 'to' ? feeInTo : 0);       // 실제 입금 (toCur)

  function validate() {
    const errs: Record<string, string> = {};
    if (!date) errs.date = '날짜를 선택해주세요';
    if (!amountStr || amountNum <= 0) errs.amount = '금액을 입력해주세요';
    if (isTransfer) {
      if (!fromAccountId) errs.from = '출금 계좌를 선택해주세요';
      if (!toAccountId) errs.to = '입금 계좌를 선택해주세요';
      if (fromAccountId && toAccountId && fromAccountId === toAccountId) errs.to = '서로 다른 계좌를 선택해주세요';
      if (isExchange) {
        if (exchangeRate <= 0) errs.rate = '환율을 입력해주세요';
        if (feeNum > 0 && realIn <= 0) errs.fee = '수수료가 입금액보다 큽니다. 수수료 금액·통화를 확인해주세요.';
        if (feeNum > 0 && realOut <= 0) errs.fee = '수수료가 출금액보다 큽니다. 수수료 금액·통화를 확인해주세요.';
      }
    } else {
      if (!categoryId) errs.categoryId = '카테고리를 선택해주세요';
      if (paymentType === 'card' && !selectedCardId) errs.payment = '카드를 선택해주세요';
      if (paymentType === 'account' && !selectedAccountId) errs.payment = '계좌를 선택해주세요';
    }
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

    // 환율 스냅샷 (입력 시점 고정)
    const fxRate = snapshotRate(currency, rates);
    const amountKRW = Math.round(toKRW(amountNum, currency, rates));
    const amountUSD = Math.round(toUSD(amountNum, currency, rates) * 100) / 100;

    if (isTransfer) {
      if (isExchange) {
        const fromKRWv = Math.round(toKRW(amountNum, fromCur, rates));
        const toAmt = amountNum * exchangeRate;
        const toAmountKRW = Math.round(toKRW(toAmt, toCur, rates));
        const feeKRW = feeNum > 0 ? Math.round(toKRW(feeNum, feeCurrency, rates)) : undefined;
        const exData = {
          date,
          type: 'transfer' as TransactionType,
          amount: amountNum,
          currency: fromCur,
          fxRate: snapshotRate(fromCur, rates),
          amountKRW: fromKRWv,
          amountUSD: Math.round(toUSD(amountNum, fromCur, rates) * 100) / 100,
          categoryId: '',
          paymentMethod: `${fromAcc?.name || ''} → ${toAcc?.name || ''} (환전)`,
          fromAccountId,
          toAccountId,
          isExchange: true,
          toAmount: toAmt,
          toCurrency: toCur,
          toAmountKRW,
          exchangeRate,
          fee: feeNum > 0 ? feeNum : undefined,
          feeCurrency: feeNum > 0 ? feeCurrency : undefined,
          feeKRW,
          feeDeduct: feeNum > 0 ? feeDeduct : undefined,
          memo,
        };
        if (isEdit) updateTransaction(editTransaction.id, exData);
        else {
          addTransaction(exData);
          // 환전 수수료를 금융수수료 지출로 자동 기록 (통계/예산 반영)
          if (feeNum > 0) {
            addExchangeFeeExpense({
              date,
              amount: feeNum,
              currency: feeCurrency,
              fxRate: snapshotRate(feeCurrency, rates),
              amountKRW: feeKRW ?? 0,
              memo: `환전 수수료 (${fromCur}→${toCur})`,
            });
          }
        }
        onClose();
        return;
      }
      const data = {
        date,
        type: 'transfer' as TransactionType,
        amount: amountNum,
        currency,
        fxRate,
        amountKRW,
        amountUSD,
        categoryId: '',
        paymentMethod: `${fromAcc?.name || ''} → ${toAcc?.name || ''}`,
        fromAccountId,
        toAccountId,
        memo,
      };
      if (isEdit) updateTransaction(editTransaction.id, data);
      else addTransaction(data);
      onClose();
      return;
    }

    const payment = getPaymentInfo();
    const data = {
      date,
      type,
      amount: amountNum,
      currency,
      fxRate,
      amountKRW,
      amountUSD,
      categoryId,
      memo,
      ...payment,
      installmentMonths: payment.cardId && installmentMonths > 1 ? installmentMonths : undefined,
    };
    if (isEdit) {
      updateTransaction(editTransaction.id, data);
    } else {
      addTransaction(data);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {isEdit ? '거래 수정' : '거래 추가'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
            <button type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                type === 'income'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >수입</button>
            <button type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-x border-gray-200 dark:border-gray-600 ${
                type === 'expense'
                  ? 'bg-rose-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >지출</button>
            <button type="button"
              onClick={() => setType('transfer')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                type === 'transfer'
                  ? 'bg-slate-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >이체</button>
          </div>
          {isTransfer && (
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
              자산 간 이동입니다. 수입·지출 통계에는 포함되지 않습니다.
            </p>
          )}

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">날짜</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
          </div>

          {/* Amount + currency */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">금액</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(formatAmountInput(e.target.value))}
                  placeholder="0"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="relative w-24">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  <option value="KRW">₩ KRW</option>
                  <option value="USD">$ USD</option>
                  <option value="VND">₫ VND</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {currency !== 'KRW' && amountNum > 0 && (
              <p className="text-xs text-gray-400 mt-1.5">
                ≈ {formatCurrency(Math.round(previewKRW), 'KRW')}
                <span className="ml-1 text-gray-300 dark:text-gray-500">(1 {currency} = {rates[currency].toLocaleString('ko-KR', { maximumFractionDigits: 3 })}원)</span>
              </p>
            )}
            {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount}</p>}
          </div>

          {/* Transfer: from / to accounts */}
          {isTransfer && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">출금 계좌 (보내는 곳)</label>
                <div className="relative">
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="">계좌 선택</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {errors.from && <p className="text-xs text-rose-500 mt-1">{errors.from}</p>}
              </div>
              <div className="flex justify-center text-gray-400">
                <ArrowRight size={18} className="rotate-90" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">입금 계좌 (받는 곳)</label>
                <div className="relative">
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="">계좌 선택</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {errors.to && <p className="text-xs text-rose-500 mt-1">{errors.to}</p>}
              </div>

              {/* 환전: 출금/입금 통화가 다를 때 */}
              {isExchange && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-3 space-y-3">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">💱 환전 ({fromCur} → {toCur})</p>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">환율 (1 {fromCur} = ? {toCur})</label>
                    <input value={exchangeRateStr} inputMode="decimal"
                      onChange={(e) => setExchangeRateStr(formatAmountInput(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">수수료 (선택)</label>
                    <div className="flex gap-2">
                      <input value={feeStr} inputMode="decimal"
                        onChange={(e) => setFeeStr(formatAmountInput(e.target.value))} placeholder="0"
                        className="flex-1 px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                      <select value={feeCurrency} onChange={(e) => setFeeCurrency(e.target.value as Currency)}
                        className="w-20 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                        <option value="KRW">₩</option>
                        <option value="USD">$</option>
                        <option value="VND">₫</option>
                      </select>
                    </div>
                  </div>

                  {/* 수수료 차감 위치 */}
                  {feeNum > 0 && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">수수료 차감</label>
                      <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-xs">
                        <button type="button" onClick={() => setFeeDeduct('from')}
                          className={`flex-1 py-1.5 ${feeDeduct === 'from' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-500'}`}>출금계좌 차감</button>
                        <button type="button" onClick={() => setFeeDeduct('to')}
                          className={`flex-1 py-1.5 ${feeDeduct === 'to' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-500'}`}>입금계좌 차감</button>
                      </div>
                    </div>
                  )}
                  {errors.rate && <p className="text-xs text-rose-500">{errors.rate}</p>}
                  {errors.fee && <p className="text-xs text-rose-500">{errors.fee}</p>}

                  {/* 환전 결과 (실시간) */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-100 dark:border-amber-900/40 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">출금 금액</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(amountNum, fromCur)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">수수료</span>
                      <span className="font-medium text-rose-500">{feeNum > 0 ? `${formatCurrency(feeNum, feeCurrency)} (${feeDeduct === 'from' ? '출금' : '입금'}계좌)` : '없음'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">실제 출금</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(realOut, fromCur)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">적용 환율</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">1 {fromCur} = {exchangeRate.toLocaleString('ko-KR', { maximumFractionDigits: 4 })} {toCur}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1.5 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">실제 입금</span>
                      <span className={`font-bold ${realIn <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatCurrency(Math.round(realIn), toCur)}</span>
                    </div>
                    {feeNum > 0 && (
                      <p className="text-[11px] text-gray-400 pt-1">💡 수수료는 "금융수수료" 지출로 자동 기록되어 월 지출·통계·예산에 반영됩니다.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Category */}
          {!isTransfer && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">카테고리</label>
            <div className="relative">
              <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                <option value="">카테고리 선택</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {errors.categoryId && <p className="text-xs text-rose-500 mt-1">{errors.categoryId}</p>}
          </div>
          )}

          {/* Payment method */}
          {!isTransfer && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">결제수단</label>
            <div className="flex gap-2 mb-2">
              {(['cash', 'card', 'account'] as const).map((pt) => (
                <button key={pt} type="button"
                  onClick={() => setPaymentType(pt)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                    paymentType === pt
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {pt === 'cash' ? '현금' : pt === 'card' ? '카드' : '계좌'}
                </button>
              ))}
            </div>

            {paymentType === 'card' && (
              <div className="relative">
                <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  <option value="">카드 선택</option>
                  {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}

            {paymentType === 'card' && (
              <div className="relative mt-2">
                <select
                  value={installmentMonths}
                  onChange={(e) => setInstallmentMonths(Number(e.target.value))}
                  className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  <option value={1}>일시불</option>
                  {[2, 3, 4, 5, 6, 9, 12, 18, 24].map((m) => (
                    <option key={m} value={m}>{m}개월 할부</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                {installmentMonths > 1 && amountNum > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    월 약 {formatCurrency(Math.round(previewKRW / installmentMonths), 'KRW')} × {installmentMonths}개월
                  </p>
                )}
              </div>
            )}

            {paymentType === 'account' && (
              <div className="relative">
                <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  <option value="">계좌 선택</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
            {errors.payment && <p className="text-xs text-rose-500 mt-1">{errors.payment}</p>}
          </div>
          )}

          {/* Memo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">메모</label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="메모 입력 (선택)"
                rows={2}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >취소</button>
            <button type="submit"
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${
                type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600'
                : type === 'transfer' ? 'bg-slate-600 hover:bg-slate-700'
                : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >{isEdit ? '수정' : '추가'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
