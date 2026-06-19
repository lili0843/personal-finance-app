import React, { useState, useRef } from 'react';
import { X, Camera, Loader2, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { Currency } from '../../types';

// Tesseract.js 를 CDN에서 1회만 로드
let tesseractLoading: Promise<void> | null = null;
function loadTesseract(): Promise<void> {
  if ((window as any).Tesseract) return Promise.resolve();
  if (tesseractLoading) return tesseractLoading;
  tesseractLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('OCR 엔진 로드 실패'));
    document.head.appendChild(s);
  });
  return tesseractLoading;
}

const BANK_KEYWORDS = [
  '우리', '신한', '하나', '기업', 'IBK', '국민', 'KB', '농협', 'NH', '카카오', '토스',
  '미래에셋', '키움', '삼성', '증권', 'SC', '씨티', '새마을', '우체국', '베트남',
];

interface Found {
  name: string;
  balance: number;
  currency: Currency;
  include: boolean;
}

interface Props {
  onClose: () => void;
  onConfirm: (accounts: { name: string; balance: number; currency: Currency }[]) => void;
}

export default function ScreenshotAssetImport({ onClose, onConfirm }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgUrl, setImgUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState<Found[]>([]);
  const [errMsg, setErrMsg] = useState('');

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setImgUrl(URL.createObjectURL(f));
    setStatus('idle');
    setRows([]);
  }

  function parseText(text: string): Found[] {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const results: Found[] = [];
    lines.forEach((line) => {
      // 통화 + 금액 인식
      let currency: Currency = 'KRW';
      let amount = 0;
      const krw = line.match(/([\d,]{2,})\s*원/);
      const usd = line.match(/(?:USD|\$)\s*([\d,]+(?:\.\d+)?)/i);
      const vnd = line.match(/([\d,]{3,})\s*(?:VND|₫|동)/i);
      const bare = line.match(/([\d]{1,3}(?:,[\d]{3})+)/); // 1,234,567 형태
      if (krw) { amount = parseFloat(krw[1].replace(/,/g, '')); }
      else if (usd) { currency = 'USD'; amount = parseFloat(usd[1].replace(/,/g, '')); }
      else if (vnd) { currency = 'VND'; amount = parseFloat(vnd[1].replace(/,/g, '')); }
      else if (bare) { amount = parseFloat(bare[1].replace(/,/g, '')); }
      if (!amount || amount < 100) return;

      const bank = BANK_KEYWORDS.find((k) => line.includes(k));
      const name = bank ? (bank.length <= 3 ? `${bank}은행` : bank) : '계좌';
      results.push({ name, balance: Math.round(amount), currency, include: true });
    });
    // 중복 금액 제거
    const seen = new Set<number>();
    return results.filter((r) => {
      if (seen.has(r.balance)) return false;
      seen.add(r.balance);
      return true;
    });
  }

  async function recognize() {
    if (!file) return;
    setStatus('working');
    setProgress(0);
    setErrMsg('');
    try {
      await loadTesseract();
      const Tesseract = (window as any).Tesseract;
      const { data } = await Tesseract.recognize(file, 'kor+eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      const found = parseText(data.text || '');
      setRows(found);
      setStatus('done');
    } catch (e) {
      setErrMsg('인식에 실패했습니다. 다른 스크린샷을 시도하거나 직접 입력해주세요.');
      setStatus('error');
    }
  }

  function update(i: number, patch: Partial<Found>) {
    setRows((r) => r.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  }
  function remove(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  function confirm() {
    const sel = rows.filter((r) => r.include && r.name.trim() && r.balance > 0);
    onConfirm(sel.map((r) => ({ name: r.name.trim(), balance: r.balance, currency: r.currency })));
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Camera size={18} /> 스크린샷으로 자산 등록
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            은행/증권 앱의 <b>잔액이 보이는 화면</b>을 캡처해서 올려주세요. 글자를 자동 인식해 계좌와 잔액을 추출합니다.
            <br />⚠️ 자동 인식은 100% 정확하지 않으니, <b>저장 전에 꼭 확인·수정</b>하세요.
          </p>

          <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 hover:border-violet-400 hover:text-violet-500">
            <Camera size={16} /> {file ? '다른 이미지 선택' : '스크린샷 선택'}
          </button>

          {imgUrl && (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <img src={imgUrl} alt="미리보기" className="max-h-48 object-contain" />
            </div>
          )}

          {file && status !== 'working' && status !== 'done' && (
            <button onClick={recognize}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">
              글자 인식 시작
            </button>
          )}

          {status === 'working' && (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 size={28} className="text-violet-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">인식 중... {progress}%</p>
              <p className="text-xs text-gray-400">처음 한 번은 인식 데이터를 받느라 시간이 걸려요</p>
            </div>
          )}

          {status === 'error' && (
            <p className="flex items-center gap-1.5 text-xs text-rose-500"><AlertTriangle size={13} /> {errMsg}</p>
          )}

          {status === 'done' && (
            <div className="space-y-3">
              {rows.length === 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertTriangle size={13} /> 금액을 찾지 못했습니다. 잔액이 더 잘 보이는 화면으로 다시 시도하거나 직접 입력해주세요.
                </p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">인식 결과 — 확인 후 수정하세요</p>
                  {rows.map((r, i) => (
                    <div key={i} className={`rounded-xl border p-3 ${r.include ? 'border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-900/10' : 'border-gray-200 dark:border-gray-700 opacity-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" checked={r.include} onChange={(e) => update(i, { include: e.target.checked })} />
                        <input value={r.name} onChange={(e) => update(i, { name: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" placeholder="계좌 이름" />
                        <button onClick={() => remove(i)} className="p-1.5 text-gray-400 hover:text-rose-500"><Trash2 size={14} /></button>
                      </div>
                      <div className="flex gap-2">
                        <input value={r.balance.toLocaleString('ko-KR')} onChange={(e) => update(i, { balance: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 })}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                        <select value={r.currency} onChange={(e) => update(i, { currency: e.target.value as Currency })}
                          className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                          <option value="KRW">₩</option>
                          <option value="USD">$</option>
                          <option value="VND">₫</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium">취소</button>
                <button onClick={confirm} disabled={!rows.some((r) => r.include && r.balance > 0)}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
                  <Check size={15} /> 이 계좌들 사용
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
