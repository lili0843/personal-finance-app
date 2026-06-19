import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Filter, Edit2, Trash2, ChevronUp, ChevronDown,
  ArrowUpDown, X, SlidersHorizontal, MessageSquare,
} from 'lucide-react';
import { Transaction, TransactionType } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { fromKRW } from '../../utils/currency';
import { txKRW } from '../../utils/calculations';
import TransactionForm from './TransactionForm';
import SmsParseModal from './SmsParseModal';

type SortKey = 'date' | 'amount' | 'category';
type SortDir = 'asc' | 'desc';

export default function TransactionList() {
  const { transactions, categories, deleteTransaction, rates, displayCurrency } = useApp();
  const currency = displayCurrency;
  const fmt = (krw: number) => formatCurrency(fromKRW(krw, displayCurrency, rates), displayCurrency);

  const [showForm, setShowForm] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | undefined>();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const PER_PAGE = 15;

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let list = [...transactions];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => {
        const cat = categories.find((c) => c.id === t.categoryId);
        return (
          cat?.name.toLowerCase().includes(q) ||
          t.memo.toLowerCase().includes(q) ||
          t.paymentMethod.toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
        );
      });
    }

    if (filterType !== 'all') list = list.filter((t) => t.type === filterType);
    if (filterCategory) list = list.filter((t) => t.categoryId === filterCategory);
    if (filterDateFrom) list = list.filter((t) => t.date >= filterDateFrom);
    if (filterDateTo) list = list.filter((t) => t.date <= filterDateTo);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortKey === 'amount') cmp = a.amount - b.amount;
      else if (sortKey === 'category') {
        const ca = categories.find((c) => c.id === a.categoryId)?.name || '';
        const cb = categories.find((c) => c.id === b.categoryId)?.name || '';
        cmp = ca.localeCompare(cb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [transactions, categories, search, filterType, filterCategory, filterDateFrom, filterDateTo, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + txKRW(t), 0);
  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + txKRW(t), 0);

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown size={13} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={13} className="text-indigo-500" /> : <ChevronDown size={13} className="text-indigo-500" />;
  }

  function clearFilters() {
    setFilterType('all');
    setFilterCategory('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearch('');
    setPage(1);
  }

  const hasFilters = filterType !== 'all' || filterCategory || filterDateFrom || filterDateTo || search;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="검색 (카테고리, 메모, 결제수단)"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showFilters || hasFilters
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300'
            }`}
          >
            <SlidersHorizontal size={16} />
            필터
            {hasFilters && <span className="w-2 h-2 bg-indigo-500 rounded-full" />}
          </button>
          <button
            onClick={() => setShowSms(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <MessageSquare size={16} />
            <span className="hidden sm:inline">문자 인식</span>
          </button>
          <button
            onClick={() => { setEditTarget(undefined); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            추가
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">구분</label>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value as TransactionType | 'all'); setPage(1); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">전체</option>
                <option value="income">수입</option>
                <option value="expense">지출</option>
                <option value="transfer">이체</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">카테고리</label>
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">전체</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">시작일</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">종료일</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-3 flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600">
              <X size={12} /> 필터 초기화
            </button>
          )}
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">필터된 수입</p>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalIncome)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">필터된 지출</p>
          <p className="text-base font-bold text-rose-600 dark:text-rose-400">{fmt(totalExpense)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">순이익</p>
          <p className={`text-base font-bold ${totalIncome - totalExpense >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-500'}`}>
            {fmt(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left px-4 py-3">
                  <button onClick={() => handleSort('date')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    날짜 <SortIcon k="date" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">구분</th>
                <th className="text-left px-4 py-3">
                  <button onClick={() => handleSort('amount')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    금액 <SortIcon k="amount" />
                  </button>
                </th>
                <th className="text-left px-4 py-3">
                  <button onClick={() => handleSort('category')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    카테고리 <SortIcon k="category" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">결제수단</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">메모</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">관리</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((t) => {
                const cat = categories.find((c) => c.id === t.categoryId);
                const isIncome = t.type === 'income';
                const isTransfer = t.type === 'transfer';
                const isExchange = !!t.isExchange;
                const typeLabel = isExchange ? '환전' : isTransfer ? '이체' : isIncome ? '수입' : '지출';
                const sign = isTransfer ? '' : isIncome ? '+' : '-';
                const amtColor = isTransfer
                  ? 'text-slate-600 dark:text-slate-300'
                  : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
                return (
                  <tr key={t.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        isTransfer
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300'
                          : isIncome
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-bold whitespace-nowrap ${amtColor}`}>
                      {sign}{fmt(txKRW(t))}
                      {isExchange ? (
                        <span className="ml-1 text-xs font-normal text-gray-400">
                          ({formatCurrency(t.amount, t.currency || 'KRW')} → {formatCurrency(Math.round(t.toAmount || 0), t.toCurrency || 'KRW')})
                        </span>
                      ) : (t.currency && t.currency !== 'KRW' && (
                        <span className="ml-1 text-xs font-normal text-gray-400">({formatCurrency(t.amount, t.currency)})</span>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: isTransfer ? '#64748B' : (cat?.color || '#6B7280') }} />
                        <span className="text-sm text-gray-700 dark:text-gray-200">{typeLabel === '환전' ? '환전' : isTransfer ? '이체' : (cat?.name || '기타')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {t.paymentMethod}
                      {t.installmentMonths && t.installmentMonths > 1 && (
                        <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">{t.installmentMonths}개월</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell max-w-[180px] truncate">{t.memo}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditTarget(t); setShowForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        {deleteConfirm === t.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { deleteTransaction(t.id); setDeleteConfirm(null); }}
                              className="px-2 py-1 rounded text-xs bg-rose-500 text-white"
                            >확인</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">취소</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(t.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    {hasFilters ? '검색 결과가 없습니다' : '거래 내역이 없습니다'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400">{filtered.length}건 중 {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}건</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >이전</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-indigo-600 text-white'
                        : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >{pageNum}</button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >다음</button>
            </div>
          </div>
        )}
      </div>

      {showForm && <TransactionForm onClose={() => { setShowForm(false); setEditTarget(undefined); }} editTransaction={editTarget} />}
      {showSms && <SmsParseModal onClose={() => setShowSms(false)} />}
    </div>
  );
}
