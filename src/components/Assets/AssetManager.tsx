import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Landmark, TrendingUp, Banknote, PiggyBank, X, ChevronDown, CreditCard, Camera, LineChart } from 'lucide-react';
import ScreenshotAssetImport from '../Onboarding/ScreenshotAssetImport';
import CurrencyBadge from '../common/CurrencyBadge';
import { Account, AccountType, Currency } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency, formatAmountInput, parseAmount } from '../../utils/formatters';
import { fromKRW } from '../../utils/currency';
import { getTotalAssetsKRW, getLiabilitiesKRW, accountCurrentNative, accountValueKRW, securitiesValuationKRW } from '../../utils/calculations';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: '은행',
  cash: '현금',
  securities: '증권',
  savings: '적금',
  deposit: '예금',
  card: '신용카드',
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ElementType> = {
  bank: Landmark,
  cash: Banknote,
  securities: TrendingUp,
  savings: PiggyBank,
  deposit: PiggyBank,
  card: CreditCard,
};

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#F97316'];

interface AccountFormProps {
  onClose: () => void;
  editAccount?: Account;
}

function AccountForm({ onClose, editAccount }: AccountFormProps) {
  const { addAccount, updateAccount, transactions, rates } = useApp();
  const isEdit = !!editAccount;

  // 거래로 발생한 증감(계좌 통화 기준)
  const delta = editAccount ? accountCurrentNative(editAccount, transactions, rates) - editAccount.balance : 0;

  const [name, setName] = useState(editAccount?.name || '');
  const [type, setType] = useState<AccountType>(editAccount?.type || 'bank');
  // 입력칸 = 초기(개설) 잔액. 현재 잔액은 자동 계산.
  const [balanceStr, setBalanceStr] = useState(editAccount ? editAccount.balance.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : '');
  const [currency, setCurrency] = useState<Currency>(editAccount?.currency || 'KRW');
  const [color, setColor] = useState(editAccount?.color || COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openingNum = parseAmount(balanceStr);
  const currentPreview = openingNum + delta; // 자동 계산된 현재 잔액

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = '계좌명을 입력해주세요';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const data = { name: name.trim(), type, balance: openingNum, currency, color, isLiability: type === 'card' };
    if (isEdit) updateAccount(editAccount.id, data);
    else addAccount(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{isEdit ? '계좌 수정' : '계좌 추가'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">계좌명</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 우리은행 통장"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">종류</label>
            <div className="relative">
              <select value={type} onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).filter((t) => t !== 'securities').map((t) => (
                  <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">초기 잔액 (개설 시점, 한 번만)</label>
            <div className="flex gap-2">
              <input
                type="text" inputMode="decimal" value={balanceStr}
                onChange={(e) => setBalanceStr(formatAmountInput(e.target.value))}
                placeholder="0"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-24 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="KRW">KRW</option>
                <option value="VND">VND</option>
                <option value="USD">USD</option>
              </select>
            </div>
            {/* 현재 잔액 = 초기 잔액 + 거래, 자동 계산 (읽기 전용) */}
            <div className="mt-2 flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">현재 잔액 (자동 계산)</span>
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(currentPreview, currency)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              현재 잔액은 <b>초기 잔액 + 거래(수입·지출·이체)</b>로 자동 계산됩니다. 거래를 등록하면 자동으로 바뀌니 직접 입력할 필요가 없어요.
              {isEdit && delta !== 0 && (
                <span className="block mt-0.5">· 거래 반영분 {delta > 0 ? '+' : ''}{formatCurrency(Math.round(delta), currency)}</span>
              )}
            </p>
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
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >취소</button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
            >{isEdit ? '수정' : '추가'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AssetManager() {
  const { accounts, transactions, deleteAccount, addAccount, rates, displayCurrency, setCurrentPage } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showShot, setShowShot] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const SHOT_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#F97316'];
  function addFromShot(found: { name: string; balance: number; currency: Currency }[]) {
    found.forEach((f, i) => {
      addAccount({ name: f.name, type: 'bank', currency: f.currency, balance: f.balance, color: SHOT_COLORS[(accounts.length + i) % SHOT_COLORS.length] });
    });
    setShowShot(false);
  }

  const fmt = (krw: number) => formatCurrency(fromKRW(krw, displayCurrency, rates), displayCurrency);
  const holdingsKRW = securitiesValuationKRW(accounts, rates);
  const totalAssets = getTotalAssetsKRW(accounts, rates, transactions);
  const liabilities = getLiabilitiesKRW(accounts, rates, transactions);
  const netWorth = totalAssets - liabilities;

  const groupedByType = (Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[])
    .map((type) => ({
      type,
      accounts: accounts.filter((a) => a.type === type),
      total: accounts.filter((a) => a.type === type).reduce((s, a) => s + accountValueKRW(a, transactions, rates), 0),
    })).filter((g) => g.accounts.length > 0);

  const ASSET_GROUPS: { label: string; types: AccountType[] }[] = [
    { label: '현금성 자산', types: ['cash', 'bank'] },
    { label: '예금', types: ['deposit', 'savings'] },
    { label: '투자자산 (증권계좌)', types: ['securities'] },
    { label: '카드', types: ['card'] },
  ];

  function renderCard(acc: Account) {
    const Icon = ACCOUNT_TYPE_ICONS[acc.type];
    const isSec = acc.type === 'securities';
    const balKRW = accountValueKRW(acc, transactions, rates);
    const balNative = isSec ? (acc.valuation ?? 0) : accountCurrentNative(acc, transactions, rates);
    const pct = totalAssets > 0 && !acc.isLiability ? (balKRW / totalAssets) * 100 : 0;
    return (
      <div key={acc.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: acc.color + '20' }}>
              <Icon size={20} style={{ color: acc.color }} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{acc.name}</p>
                <CurrencyBadge currency={acc.currency} />
              </div>
              <p className="text-xs text-gray-400">{ACCOUNT_TYPE_LABELS[acc.type]}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => { if (isSec) { setCurrentPage('securities'); } else { setEditTarget(acc); setShowForm(true); } }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600">
              <Edit2 size={14} />
            </button>
            {deleteConfirm === acc.id ? (
              <div className="flex items-center gap-1">
                <button onClick={() => { deleteAccount(acc.id); setDeleteConfirm(null); }} className="px-2 py-1 rounded text-xs bg-rose-500 text-white">확인</button>
                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">취소</button>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm(acc.id)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-rose-600">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <p className={`text-xl font-bold mb-1 ${acc.isLiability ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
          {acc.isLiability ? '-' : ''}{formatCurrency(balNative, acc.currency)}
        </p>
        {acc.currency !== displayCurrency && (
          <p className="text-xs text-gray-400 mb-2">≈ {fmt(balKRW)}</p>
        )}
        {acc.isLiability ? (
          <p className="text-xs text-rose-400 mt-2">부채 (순자산에서 차감)</p>
        ) : (
          <>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: acc.color }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">전체 자산의 {pct.toFixed(1)}%</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-indigo-200 text-sm mb-1">{liabilities > 0 ? '순자산 (자산 − 부채)' : '총 자산'}</p>
        <p className="text-3xl font-bold">{fmt(netWorth)}</p>
        {liabilities > 0 && (
          <p className="text-indigo-200 text-xs mt-1">자산 {fmt(totalAssets)} · 부채 {fmt(liabilities)}</p>
        )}
        <div className="flex gap-4 mt-4 flex-wrap">
          {groupedByType.map((g) => (
            <div key={g.type}>
              <p className="text-indigo-200 text-xs">{ACCOUNT_TYPE_LABELS[g.type]}</p>
              <p className="text-sm font-semibold">{fmt(g.total)}</p>
            </div>
          ))}
          {holdingsKRW > 0 && (
            <div>
              <p className="text-indigo-200 text-xs">증권</p>
              <p className="text-sm font-semibold">{fmt(holdingsKRW)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowShot(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-sm font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/50"
        >
          <Camera size={16} /> <span className="hidden sm:inline">스크린샷으로 추가</span>
        </button>
        <button
          onClick={() => { setEditTarget(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
        >
          <Plus size={16} /> 계좌 추가
        </button>
      </div>

      {/* 계좌 그룹별 표시 */}
      {ASSET_GROUPS.map((group) => {
        const groupAccounts = accounts.filter((a) => group.types.includes(a.type));
        if (groupAccounts.length === 0) return null;
        const subtotal = groupAccounts.reduce((s, a) => s + accountValueKRW(a, transactions, rates), 0);
        return (
          <div key={group.label}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{group.label}</h3>
              <span className={`text-sm font-semibold ${group.label === '카드' ? 'text-rose-500' : 'text-gray-900 dark:text-white'}`}>
                {group.label === '카드' ? '-' : ''}{fmt(Math.abs(subtotal))}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupAccounts.map((acc) => renderCard(acc))}
            </div>
          </div>
        );
      })}

      {accounts.filter((a) => a.type !== 'securities').length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <Landmark size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">등록된 계좌가 없습니다</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-indigo-600 text-sm hover:underline">계좌 추가하기</button>
        </div>
      )}

      {showForm && <AccountForm onClose={() => { setShowForm(false); setEditTarget(undefined); }} editAccount={editTarget} />}
      {showShot && <ScreenshotAssetImport onClose={() => setShowShot(false)} onConfirm={addFromShot} />}
    </div>
  );
}
