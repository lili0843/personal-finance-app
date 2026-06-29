import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react';
import {
  Transaction, Account, Card, Budget, Goal,
  RecurringTransaction, Category, AppSettings, Page, Currency, Holding,
} from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_CARDS,
  DUMMY_TRANSACTIONS, DEFAULT_BUDGET, DEFAULT_GOALS, DEFAULT_RECURRING,
} from '../data/dummyData';
import { exportTransactionsToCSV, importTransactionsFromCSV, exportToJSON, readFileAsText } from '../utils/csvUtils';
import { getYearMonth, getTodayString } from '../utils/formatters';
import { FxRates, FALLBACK_RATES, fetchRates, snapshotRate, toKRW, toUSD } from '../utils/currency';
import { auth, googleProvider, db } from '../firebase';
import {
  onAuthStateChanged, signInWithPopup, signOut, User,
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';

// Realtime Database rejects `undefined` values — strip them out before saving
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// 환전 수수료 자동 비용 카테고리
const FEE_CATEGORY: Category = {
  id: 'cat-fin-fee', name: '금융수수료', type: 'expense', color: '#64748B', icon: 'Banknote', isCustom: false,
};

interface AppContextType {
  // auth
  user: User | null;
  authLoading: boolean;
  dataLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;

  transactions: Transaction[];
  accounts: Account[];
  cards: Card[];
  budgets: Budget[];
  goals: Goal[];
  recurringTransactions: RecurringTransaction[];
  categories: Category[];
  holdings: Holding[];
  settings: AppSettings;
  currentPage: Page;
  setCurrentPage: (p: Page) => void;
  securitiesFilter: string;
  setSecuritiesFilter: (broker: string) => void;

  // 환율 & 표시 통화
  rates: FxRates;
  displayCurrency: Currency;
  setDisplayCurrency: (c: Currency) => void;
  refreshRates: () => Promise<void>;
  setManualRates: (usd: number, vnd: number) => void;

  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  // CSV 일괄 추가 (중복 제외 건수 반환)
  importTransactionsBulk: (items: Omit<Transaction, 'id'>[]) => { added: number; skipped: number };
  // 환전 수수료를 "금융수수료" 지출로 자동 기록
  addExchangeFeeExpense: (p: { date: string; amount: number; currency: Currency; fxRate: number; amountKRW: number; memo: string }) => void;

  addAccount: (a: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, a: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  // 최초 자산 등록 — 입력한 계좌로 시작하고 나머지는 깨끗이 비움
  applyInitialSetup: (accs: Omit<Account, 'id'>[]) => void;

  addCard: (c: Omit<Card, 'id'>) => void;
  updateCard: (id: string, c: Partial<Card>) => void;
  deleteCard: (id: string) => void;

  setBudget: (b: Omit<Budget, 'id'>) => void;

  addGoal: (g: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, g: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  addRecurring: (r: Omit<RecurringTransaction, 'id'>) => void;
  updateRecurring: (id: string, r: Partial<RecurringTransaction>) => void;
  deleteRecurring: (id: string) => void;
  applyRecurringNow: (id: string) => void;

  addCategory: (c: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;

  addHolding: (h: Omit<Holding, 'id'>) => void;
  updateHolding: (id: string, h: Partial<Holding>) => void;
  deleteHolding: (id: string) => void;

  updateSettings: (s: Partial<AppSettings>) => void;

  exportCSV: () => void;
  importCSV: (file: File) => Promise<void>;
  exportJSON: () => void;
  importJSON: (file: File) => Promise<void>;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Data state — starts empty; filled from the cloud after login
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurringTransactions, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [holdings, setHoldings] = useState<Holding[]>([]);

  // Settings & current page stay on the device
  const [settings, setSettings] = useLocalStorage<AppSettings>('pf_settings', {
    currency: 'KRW',
    darkMode: false,
    sidebarCollapsed: false,
  });
  const [currentPage, setCurrentPage] = useLocalStorage<Page>('pf_page', 'dashboard');
  const [securitiesFilter, setSecuritiesFilter] = useState('');

  // 환율 (디바이스에 캐시, 하루 1회 갱신)
  const [rates, setRates] = useLocalStorage<FxRates>('pf_rates', FALLBACK_RATES);
  const displayCurrency: Currency = settings.displayCurrency ?? settings.currency ?? 'KRW';

  const setDisplayCurrency = useCallback((c: Currency) => {
    setSettings((prev) => ({ ...prev, displayCurrency: c }));
  }, [setSettings]);

  const refreshRates = useCallback(async () => {
    const r = await fetchRates();
    setRates(r);
  }, [setRates]);

  const setManualRates = useCallback((usd: number, vnd: number) => {
    setRates((prev) => ({
      ...prev,
      USD: usd > 0 ? usd : prev.USD,
      VND: vnd > 0 ? vnd : prev.VND,
      date: new Date().toISOString().slice(0, 10),
      source: 'manual',
    }));
  }, [setRates]);

  // 하루 1회 자동 갱신
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (rates.date !== today && rates.source !== 'manual') {
      fetchRates().then(setRates).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guard so the cloud-save effect doesn't fire before the initial load finishes
  const loadedRef = useRef(false);

  // Dark mode toggle
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Watch login/logout
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // When the user logs in, load their data from the cloud (or seed it the first time)
  useEffect(() => {
    if (!user) {
      loadedRef.current = false;
      return;
    }
    let cancelled = false;
    loadedRef.current = false;
    setDataLoading(true);

    get(ref(db, `users/${user.uid}`))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.val() as Partial<{
            transactions: Transaction[];
            accounts: Account[];
            cards: Card[];
            budgets: Budget[];
            goals: Goal[];
            recurringTransactions: RecurringTransaction[];
            categories: Category[];
            holdings: Holding[];
          }>;
          setTransactions(d.transactions ?? []);
          setAccounts(d.accounts ?? DEFAULT_ACCOUNTS);
          setCards(d.cards ?? DEFAULT_CARDS);
          setBudgets(d.budgets ?? []);
          setGoals(d.goals ?? []);
          setRecurring(d.recurringTransactions ?? []);
          setCategories(d.categories ?? DEFAULT_CATEGORIES);
          setHoldings(d.holdings ?? []);
        } else {
          // First-ever login — seed with the sample data
          setTransactions(DUMMY_TRANSACTIONS);
          setAccounts(DEFAULT_ACCOUNTS);
          setCards(DEFAULT_CARDS);
          setBudgets([DEFAULT_BUDGET]);
          setGoals(DEFAULT_GOALS);
          setRecurring(DEFAULT_RECURRING);
          setCategories(DEFAULT_CATEGORIES);
          setHoldings([]);
        }
        setDataLoading(false);
        loadedRef.current = true;
      })
      .catch(() => {
        if (cancelled) return;
        // On error, fall back to defaults so the app is still usable
        setTransactions(DUMMY_TRANSACTIONS);
        setAccounts(DEFAULT_ACCOUNTS);
        setCards(DEFAULT_CARDS);
        setBudgets([DEFAULT_BUDGET]);
        setGoals(DEFAULT_GOALS);
        setRecurring(DEFAULT_RECURRING);
        setCategories(DEFAULT_CATEGORIES);
        setDataLoading(false);
        loadedRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Save to the cloud whenever data changes (debounced)
  useEffect(() => {
    if (!user || !loadedRef.current) return;
    const handle = setTimeout(() => {
      set(ref(db, `users/${user.uid}`), clean({
        transactions,
        accounts,
        cards,
        budgets,
        goals,
        recurringTransactions,
        categories,
        holdings,
        updatedAt: Date.now(),
      })).catch(() => {
        // network hiccup — will retry on next change
      });
    }, 800);
    return () => clearTimeout(handle);
  }, [user, transactions, accounts, cards, budgets, goals, recurringTransactions, categories, holdings]);

  const login = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    // clear local view
    setTransactions([]);
    setAccounts([]);
    setCards([]);
    setBudgets([]);
    setGoals([]);
    setRecurring([]);
    setCategories(DEFAULT_CATEGORIES);
    setHoldings([]);
  }, []);

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    setTransactions((prev) => [{ ...t, id: uuid() }, ...prev]);
  }, []);

  const updateTransaction = useCallback((id: string, t: Partial<Transaction>) => {
    setTransactions((prev) => prev.map((x) => x.id === id ? { ...x, ...t } : x));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addExchangeFeeExpense = useCallback((p: { date: string; amount: number; currency: Currency; fxRate: number; amountKRW: number; memo: string }) => {
    // 금융수수료 카테고리가 없으면 추가
    setCategories((prev) => prev.find((c) => c.id === FEE_CATEGORY.id) ? prev : [...prev, FEE_CATEGORY]);
    // 계좌 잔액은 환전 거래에서 이미 반영되므로 accountId 없이 통계용 지출만 기록
    setTransactions((prev) => [{
      id: uuid(),
      date: p.date,
      type: 'expense' as const,
      amount: p.amount,
      currency: p.currency,
      fxRate: p.fxRate,
      amountKRW: p.amountKRW,
      categoryId: FEE_CATEGORY.id,
      paymentMethod: '환전 수수료',
      memo: p.memo,
    }, ...prev]);
  }, []);

  const importTransactionsBulk = useCallback((items: Omit<Transaction, 'id'>[]) => {
    let added = 0;
    let skipped = 0;
    setTransactions((prev) => {
      const existingHashes = new Set(prev.map((t) => t.dedupeHash).filter(Boolean) as string[]);
      const fresh: Transaction[] = [];
      for (const it of items) {
        if (it.dedupeHash && existingHashes.has(it.dedupeHash)) {
          skipped++;
          continue;
        }
        if (it.dedupeHash) existingHashes.add(it.dedupeHash);
        fresh.push({ ...it, id: uuid() });
        added++;
      }
      return [...fresh, ...prev];
    });
    return { added, skipped };
  }, []);

  const addAccount = useCallback((a: Omit<Account, 'id'>) => {
    setAccounts((prev) => [...prev, { ...a, id: uuid() }]);
  }, []);

  const updateAccount = useCallback((id: string, a: Partial<Account>) => {
    setAccounts((prev) => prev.map((x) => x.id === id ? { ...x, ...a } : x));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const applyInitialSetup = useCallback((accs: Omit<Account, 'id'>[]) => {
    setAccounts(accs.map((a) => ({ ...a, id: uuid() })));
    setTransactions([]);
    setBudgets([]);
    setGoals([]);
    setRecurring([]);
    setCards([]);
    setHoldings([]);
  }, []);

  const addCard = useCallback((c: Omit<Card, 'id'>) => {
    setCards((prev) => [...prev, { ...c, id: uuid() }]);
  }, []);

  const updateCard = useCallback((id: string, c: Partial<Card>) => {
    setCards((prev) => prev.map((x) => x.id === id ? { ...x, ...c } : x));
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const setBudget = useCallback((b: Omit<Budget, 'id'>) => {
    setBudgets((prev) => {
      const exists = prev.find((x) => x.month === b.month);
      if (exists) {
        return prev.map((x) => x.month === b.month ? { ...x, ...b } : x);
      }
      return [...prev, { ...b, id: uuid() }];
    });
  }, []);

  const addGoal = useCallback((g: Omit<Goal, 'id'>) => {
    setGoals((prev) => [...prev, { ...g, id: uuid() }]);
  }, []);

  const updateGoal = useCallback((id: string, g: Partial<Goal>) => {
    setGoals((prev) => prev.map((x) => x.id === id ? { ...x, ...g } : x));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addRecurring = useCallback((r: Omit<RecurringTransaction, 'id'>) => {
    setRecurring((prev) => [...prev, { ...r, id: uuid() }]);
  }, []);

  const updateRecurring = useCallback((id: string, r: Partial<RecurringTransaction>) => {
    setRecurring((prev) => prev.map((x) => x.id === id ? { ...x, ...r } : x));
  }, []);

  const deleteRecurring = useCallback((id: string) => {
    setRecurring((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const applyRecurringNow = useCallback((id: string) => {
    setRecurring((prev) => {
      const rec = prev.find((x) => x.id === id);
      if (!rec || !rec.isActive) return prev;
      const today = getTodayString();
      const [y, m] = today.split('-');
      const day = String(rec.dayOfMonth).padStart(2, '0');
      const date = `${y}-${m}-${day}`;
      const cur = rec.currency ?? 'KRW';
      const newT: Transaction = {
        id: uuid(),
        date,
        type: rec.type,
        amount: rec.amount,
        currency: cur,
        fxRate: snapshotRate(cur, rates),
        amountKRW: Math.round(toKRW(rec.amount, cur, rates)),
        amountUSD: Math.round(toUSD(rec.amount, cur, rates) * 100) / 100,
        categoryId: rec.categoryId,
        paymentMethod: rec.paymentMethod,
        cardId: rec.cardId,
        accountId: rec.accountId,
        memo: rec.memo,
        isRecurring: true,
        recurringId: rec.id,
      };
      setTransactions((t) => [newT, ...t]);
      return prev.map((x) => x.id === id ? { ...x, lastApplied: getYearMonth() } : x);
    });
  }, [rates]);

  const addCategory = useCallback((c: Omit<Category, 'id'>) => {
    setCategories((prev) => [...prev, { ...c, id: uuid(), isCustom: true }]);
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((x) => x.id !== id || !x.isCustom));
  }, []);

  const addHolding = useCallback((h: Omit<Holding, 'id'>) => {
    setHoldings((prev) => [...prev, { ...h, id: uuid() }]);
  }, []);

  const updateHolding = useCallback((id: string, h: Partial<Holding>) => {
    setHoldings((prev) => prev.map((x) => x.id === id ? { ...x, ...h } : x));
  }, []);

  const deleteHolding = useCallback((id: string) => {
    setHoldings((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const updateSettings = useCallback((s: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...s }));
  }, [setSettings]);

  const exportCSV = useCallback(() => {
    exportTransactionsToCSV(transactions, categories);
  }, [transactions, categories]);

  const importCSV = useCallback(async (file: File) => {
    const text = await readFileAsText(file);
    const imported = importTransactionsFromCSV(text, categories);
    setTransactions((prev) => [
      ...imported.map((t) => ({ ...t, id: uuid() })),
      ...prev,
    ]);
  }, [categories]);

  const exportJSON = useCallback(() => {
    const data = { transactions, accounts, cards, budgets, goals, recurringTransactions, categories };
    exportToJSON(data, `가계부_백업_${getTodayString()}.json`);
  }, [transactions, accounts, cards, budgets, goals, recurringTransactions, categories]);

  const importJSON = useCallback(async (file: File) => {
    const text = await readFileAsText(file);
    const data = JSON.parse(text);
    if (data.transactions) setTransactions(data.transactions);
    if (data.accounts) setAccounts(data.accounts);
    if (data.cards) setCards(data.cards);
    if (data.budgets) setBudgets(data.budgets);
    if (data.goals) setGoals(data.goals);
    if (data.recurringTransactions) setRecurring(data.recurringTransactions);
    if (data.categories) setCategories(data.categories);
  }, []);

  const clearAllData = useCallback(() => {
    setTransactions([]);
    setAccounts(DEFAULT_ACCOUNTS);
    setCards(DEFAULT_CARDS);
    setBudgets([]);
    setGoals([]);
    setRecurring(DEFAULT_RECURRING);
    setCategories(DEFAULT_CATEGORIES);
  }, []);

  return (
    <AppContext.Provider value={{
      user, authLoading, dataLoading, login, logout,
      transactions, accounts, cards, budgets, goals, recurringTransactions, categories, holdings, settings,
      currentPage, setCurrentPage,
      securitiesFilter, setSecuritiesFilter,
      rates, displayCurrency, setDisplayCurrency, refreshRates, setManualRates,
      addTransaction, updateTransaction, deleteTransaction, importTransactionsBulk, addExchangeFeeExpense,
      addAccount, updateAccount, deleteAccount, applyInitialSetup,
      addCard, updateCard, deleteCard,
      setBudget,
      addGoal, updateGoal, deleteGoal,
      addRecurring, updateRecurring, deleteRecurring, applyRecurringNow,
      addCategory, deleteCategory,
      addHolding, updateHolding, deleteHolding,
      updateSettings,
      exportCSV, importCSV, exportJSON, importJSON, clearAllData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export type { Currency };
