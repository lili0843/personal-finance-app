export type Currency = 'KRW' | 'VND' | 'USD';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type StockMarket = 'US' | 'KR';

export interface Holding {
  id: string;
  name: string;        // 종목명 (예: 애플, 삼성전자)
  symbol: string;      // 티커/코드 (예: AAPL, 005930)
  market: StockMarket; // US | KR
  quantity: number;    // 보유 수량
  avgPrice?: number;   // 평단가 (선택, 손익 계산용) — 종목 통화 기준
  currency: Currency;  // 평가 통화 (US→USD, KR→KRW)
  lastPrice?: number;  // 마지막 조회 시세
  lastPriceAt?: string; // 마지막 조회 일시
  broker?: string;     // 증권사 (예: 키움증권, 토스, 미래에셋)
  accountId?: string;  // 연결 증권계좌(선택)
}
export type AccountType = 'bank' | 'cash' | 'securities' | 'savings' | 'deposit' | 'card';

export interface Category {
  id: string;
  name: string;
  type: TransactionType | 'both';
  color: string;
  icon: string;
  isCustom: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  paymentMethod: string;
  cardId?: string;
  accountId?: string;
  memo: string;
  isRecurring?: boolean;
  recurringId?: string;
  // 다통화 — 원래 통화로 저장하고, 입력 시점 환율을 스냅샷으로 고정
  currency?: Currency; // 미지정 시 KRW로 간주 (기존 데이터 호환)
  fxRate?: number; // 입력 시점 1단위 외화 = ? KRW (KRW이면 1)
  amountKRW?: number; // 환산 KRW (스냅샷)
  amountUSD?: number; // 환산 USD (스냅샷)
  // 이체(transfer) 전용 — 자산 간 이동
  fromAccountId?: string;
  toAccountId?: string;
  // 환전(exchange) 전용 — 출금/입금 통화가 다른 이체
  isExchange?: boolean;
  toAmount?: number;        // 입금액 (toCurrency 기준)
  toCurrency?: Currency;    // 입금 통화
  toAmountKRW?: number;     // 입금액 KRW 스냅샷
  exchangeRate?: number;    // 1 출금통화 = ? 입금통화
  fee?: number;             // 환전 수수료 (출금통화 기준)
  feeKRW?: number;          // 수수료 KRW 스냅샷
  // CSV 가져오기 중복 방지 해시
  dedupeHash?: string;
  // 카드 할부 (1=일시불, 2/3/6/12... = 개월수)
  installmentMonths?: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: Currency;
  color: string;
  isLiability?: boolean; // 신용카드 등 부채성 계좌 (순자산 계산 시 차감)
}

export interface Card {
  id: string;
  name: string;
  limit: number;
  color: string;
  lastFour?: string;
  cardKind?: 'credit' | 'debit'; // 신용 / 체크
  paymentDay?: number; // 결제 예정일 (1~31)
}

export interface CategoryBudget {
  categoryId: string;
  amount: number;
}

export interface Budget {
  id: string;
  month: string;
  totalBudget: number;
  categoryBudgets: CategoryBudget[];
  currency?: Currency;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  color: string;
  description?: string;
  currency?: Currency;
}

export interface RecurringTransaction {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  currency?: Currency;
  categoryId: string;
  paymentMethod: string;
  cardId?: string;
  accountId?: string;
  dayOfMonth: number;
  memo: string;
  isActive: boolean;
  lastApplied?: string;
}

export interface AppSettings {
  currency: Currency; // 기준 통화 (기본 KRW)
  displayCurrency?: Currency; // 화면 표시 통화 (₩⇄$ 토글)
  darkMode: boolean;
  sidebarCollapsed: boolean;
  payday?: number; // 급여일 (1~31). 설정 시 이 날 기준으로 한 달을 계산
  paydayWeekendAdjust?: boolean; // 급여일이 주말이면 직전 금요일로 앞당겨 계산 (기본 true)
}

export type Page =
  | 'dashboard'
  | 'transactions'
  | 'statistics'
  | 'assets'
  | 'securities'
  | 'cards'
  | 'budget'
  | 'goals'
  | 'recurring'
  | 'data'
  | 'settings';
