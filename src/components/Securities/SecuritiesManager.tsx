import React, { useState } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, RefreshCw, X, ChevronDown, LineChart, AlertTriangle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Holding, StockMarket } from '../../types';
import { formatCurrency, formatAmountInput, parseAmount } from '../../utils/formatters';
import { fromKRW } from '../../utils/currency';
import {
  fetchQuoteSmart, holdingValueNative, holdingValueKRW, holdingGain,
  totalHoldingsKRW, marketCurrency,
} from '../../utils/pricing';

const MARKET_LABEL: Record<StockMarket, string> = { US: '미국', KR: '한국' };

function HoldingForm({ onClose, edit }: { onClose: () => void; edit?: Holding }) {
  const { addHolding, updateHolding } = useApp();
  const isEdit = !!edit;
  const [name, setName] = useState(edit?.name || '');
  const [symbol, setSymbol] = useState(edit?.symbol || '');
  const [broker, setBroker] = useState(edit?.broker || '');
  const [market, setMarket] = useState<StockMarket>(edit?.market || 'US');
  const [qtyStr, setQtyStr] = useState(edit ? String(edit.quantity) : '');
  const [avgStr, setAvgStr] = useState(edit?.avgPrice != null ? edit.avgPrice.toLocaleString('ko-KR') : '');
  const [err, setErr] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) { setErr('종목명과 티커를 입력해주세요'); return; }
    const qty = parseAmount(qtyStr);
    if (qty <= 0) { setErr('수량을 입력해주세요'); return; }
    const data = {
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      broker: broker.trim() || undefined,
      market,
      quantity: qty,
      avgPrice: avgStr ? parseAmount(avgStr) : undefined,
      currency: marketCurrency(market),
      lastPrice: edit?.lastPrice,
      lastPriceAt: edit?.lastPriceAt,
    };
    if (isEdit) updateHolding(edit.id, data);
    else addHolding(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{isEdit ? '종목 수정' : '종목 추가'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
            {(['US', 'KR'] as StockMarket[]).map((m) => (
              <button key={m} type="button" onClick={() => setMarket(m)}
                className={`flex-1 py-2.5 text-sm font-semibold ${market === m ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                {MARKET_LABEL[m]} 주식 ({m === 'US' ? 'USD' : 'KRW'})
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">종목명</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={market === 'US' ? '예: 애플' : '예: 삼성전자'}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">티커 / 종목코드</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder={market === 'US' ? '예: AAPL' : '예: 005930'}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
            <p className="text-xs text-gray-400 mt-1">{market === 'US' ? '미국: 알파벳 티커 (AAPL, NVDA)' : '한국: 6자리 숫자코드 (005930)'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">증권사 (선택)</label>
            <input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="예: 키움증권, 토스, 미래에셋"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
            <p className="text-xs text-gray-400 mt-1">증권사별로 자산관리에서 묶어서 보여줍니다.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">수량</label>
              <input value={qtyStr} inputMode="decimal" onChange={(e) => setQtyStr(formatAmountInput(e.target.value))} placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">평단가 (선택)</label>
              <input value={avgStr} inputMode="decimal" onChange={(e) => setAvgStr(formatAmountInput(e.target.value))} placeholder={market === 'US' ? '$' : '₩'}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
            </div>
          </div>
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
  const { holdings: allHoldings, updateHolding, deleteHolding, rates, displayCurrency, securitiesFilter, setSecuritiesFilter } = useApp();
  const holdings = securitiesFilter
    ? allHoldings.filter((h) => (h.broker || '기타') === securitiesFilter)
    : allHoldings;
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Holding | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>('');

  const fmt = (krw: number) => formatCurrency(fromKRW(krw, displayCurrency, rates), displayCurrency);
  const totalKRW = totalHoldingsKRW(holdings, rates);
  const totalGainKRW = holdings.reduce((s, h) => {
    const g = holdingGain(h);
    return s + (g != null ? (h.currency === 'USD' ? g * rates.USD : g) : 0);
  }, 0);

  async function refreshAll() {
    if (holdings.length === 0) return;
    setLoading(true);
    setFailed([]);
    const fails: string[] = [];
    for (const h of holdings) {
      const q = await fetchQuoteSmart(h.symbol, h.market);
      if (q && q.price != null) {
        updateHolding(h.id, { lastPrice: q.price, lastPriceAt: new Date().toISOString() });
      } else {
        fails.push(h.name);
      }
    }
    setFailed(fails);
    setUpdatedAt(new Date().toLocaleTimeString('ko-KR'));
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      {securitiesFilter && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm">
          <span><b>{securitiesFilter}</b> 보유 종목만 보는 중</span>
          <button onClick={() => setSecuritiesFilter('')} className="flex items-center gap-1 text-xs font-medium hover:underline">
            <X size={13} /> 전체 보기
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-violet-200 text-sm mb-1">총 증권 평가액</p>
            <p className="text-3xl font-bold">{fmt(totalKRW)}</p>
            {totalGainKRW !== 0 && (
              <p className={`text-sm mt-1 ${totalGainKRW >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                평가손익 {totalGainKRW >= 0 ? '+' : ''}{fmt(totalGainKRW)}
              </p>
            )}
          </div>
          <button onClick={refreshAll} disabled={loading || holdings.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? '갱신 중' : '시세 새로고침'}
          </button>
        </div>
        {updatedAt && <p className="text-violet-200 text-xs mt-3">마지막 갱신 {updatedAt}</p>}
      </div>

      {failed.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <p>{failed.join(', ')} 의 시세를 가져오지 못했습니다. 티커/코드를 확인하거나, 잠시 후 다시 시도하세요. (로컬 미리보기에서는 시세 조회가 안 됩니다 — 배포 사이트에서 작동합니다.)</p>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={() => { setEditTarget(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
          <Plus size={16} /> 종목 추가
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {holdings.map((h) => {
          const native = holdingValueNative(h);
          const valKRW = holdingValueKRW(h, rates);
          const gain = holdingGain(h);
          const gainPct = (gain != null && h.avgPrice) ? ((h.lastPrice! - h.avgPrice) / h.avgPrice) * 100 : null;
          return (
            <div key={h.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{h.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${h.market === 'US' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'}`}>
                      {MARKET_LABEL[h.market]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{h.symbol} · {h.quantity}주{h.broker ? ` · ${h.broker}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditTarget(h); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                  {deleteConfirm === h.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { deleteHolding(h.id); setDeleteConfirm(null); }} className="px-2 py-1 rounded text-xs bg-rose-500 text-white">확인</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">취소</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(h.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>

              <p className="text-xl font-bold text-gray-900 dark:text-white">{fmt(valKRW)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {h.lastPrice != null
                  ? `현재가 ${formatCurrency(h.lastPrice, h.currency)} · 평가 ${formatCurrency(native, h.currency)}`
                  : '시세 미조회 — 새로고침을 눌러주세요'}
              </p>

              {gain != null && gainPct != null && (
                <div className={`flex items-center gap-1 mt-2 text-sm font-semibold ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {gain >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {gain >= 0 ? '+' : ''}{formatCurrency(gain, h.currency)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%)
                </div>
              )}
            </div>
          );
        })}

        {holdings.length === 0 && (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <LineChart size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">등록된 종목이 없습니다</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-indigo-600 text-sm hover:underline">종목 추가하기</button>
          </div>
        )}
      </div>

      {showForm && <HoldingForm onClose={() => { setShowForm(false); setEditTarget(undefined); }} edit={editTarget} />}
    </div>
  );
}
