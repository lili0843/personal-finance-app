import React, { useRef, useState } from 'react';
import {
  Download, Upload, Database, Trash2, FileText, AlertTriangle, CheckCircle, Wand2,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import CsvImportModal from './CsvImportModal';

interface ActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  buttonLabel: string;
  buttonVariant: 'primary' | 'success' | 'warning' | 'danger';
  onClick: () => void;
  accept?: string;
  isFile?: boolean;
  onFileSelect?: (file: File) => void;
}

function ActionCard({
  icon: Icon, title, description, buttonLabel, buttonVariant, onClick,
  isFile, onFileSelect, accept,
}: ActionCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white',
  };

  const iconBgClasses = {
    primary: 'bg-indigo-50 dark:bg-indigo-900/20',
    success: 'bg-emerald-50 dark:bg-emerald-900/20',
    warning: 'bg-amber-50 dark:bg-amber-900/20',
    danger: 'bg-rose-50 dark:bg-rose-900/20',
  };

  const iconColorClasses = {
    primary: 'text-indigo-600 dark:text-indigo-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-rose-600 dark:text-rose-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconBgClasses[buttonVariant]}`}>
        <Icon size={24} className={iconColorClasses[buttonVariant]} />
      </div>
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">{description}</p>
      {isFile ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onFileSelect) onFileSelect(file);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${variantClasses[buttonVariant]}`}
          >{buttonLabel}</button>
        </>
      ) : (
        <button onClick={onClick}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${variantClasses[buttonVariant]}`}
        >{buttonLabel}</button>
      )}
    </div>
  );
}

export default function DataManagement() {
  const { transactions, exportCSV, importCSV, exportJSON, importJSON, clearAllData } = useApp();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSmartImport, setShowSmartImport] = useState(false);

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleImportCSV(file: File) {
    try {
      await importCSV(file);
      showMsg('success', 'CSV 파일을 성공적으로 가져왔습니다');
    } catch {
      showMsg('error', 'CSV 파일 가져오기에 실패했습니다');
    }
  }

  async function handleImportJSON(file: File) {
    try {
      await importJSON(file);
      showMsg('success', '백업 파일을 성공적으로 복원했습니다');
    } catch {
      showMsg('error', '백업 파일 복원에 실패했습니다. 올바른 형식인지 확인해주세요');
    }
  }

  function handleClearData() {
    clearAllData();
    setShowClearConfirm(false);
    showMsg('success', '모든 거래 데이터가 초기화되었습니다');
  }

  return (
    <div className="space-y-5">
      {/* Status message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: '총 거래 수', value: transactions.length + '건' },
          { label: '수입 거래', value: transactions.filter((t) => t.type === 'income').length + '건' },
          { label: '지출 거래', value: transactions.filter((t) => t.type === 'expense').length + '건' },
          { label: '저장 크기', value: (() => { try { const s = JSON.stringify(transactions).length; return s > 1024 ? `${(s / 1024).toFixed(1)}KB` : `${s}B`; } catch { return '-'; } })() },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Smart CSV import banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Wand2 size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold">스마트 CSV 가져오기</h3>
            <p className="text-sm text-indigo-100 mt-0.5 leading-relaxed">
              은행·카드사 거래내역 파일을 올리면 열을 자동 매칭하고, 중복은 자동으로 건너뜁니다. 기관별 설정도 저장돼요.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSmartImport(true)}
          className="px-5 py-2.5 rounded-xl bg-white text-indigo-600 text-sm font-bold hover:bg-indigo-50 transition-colors whitespace-nowrap"
        >
          파일 올리기
        </button>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard
          icon={Download}
          title="CSV 내보내기"
          description="현재 모든 거래 내역을 CSV 형식으로 내보냅니다. 엑셀에서 열어 분석할 수 있습니다."
          buttonLabel="CSV 내보내기"
          buttonVariant="primary"
          onClick={exportCSV}
        />
        <ActionCard
          icon={Upload}
          title="CSV 가져오기"
          description="CSV 파일에서 거래 내역을 가져옵니다. 기존 데이터에 추가됩니다."
          buttonLabel="CSV 파일 선택"
          buttonVariant="success"
          onClick={() => {}}
          isFile
          accept=".csv"
          onFileSelect={handleImportCSV}
        />
        <ActionCard
          icon={Database}
          title="전체 백업 (JSON)"
          description="계좌, 카드, 예산, 목표 등 모든 데이터를 JSON 형식으로 백업합니다."
          buttonLabel="백업 파일 다운로드"
          buttonVariant="warning"
          onClick={exportJSON}
        />
        <ActionCard
          icon={FileText}
          title="백업 복원 (JSON)"
          description="이전에 백업한 JSON 파일로 데이터를 복원합니다. 기존 데이터가 덮어씌워집니다."
          buttonLabel="백업 파일 선택"
          buttonVariant="warning"
          onClick={() => {}}
          isFile
          accept=".json"
          onFileSelect={handleImportJSON}
        />
      </div>

      {/* CSV Format guide */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">CSV 파일 형식 안내</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">CSV 가져오기 시 아래 형식을 준수해주세요:</p>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {['날짜', '구분', '금액', '카테고리', '결제수단', '메모'].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">2026-06-18</td>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">지출</td>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">50000</td>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">식비</td>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">신한카드</td>
                <td className="py-2 text-gray-500 dark:text-gray-400">점심</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">2026-06-05</td>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">수입</td>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">4200000</td>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">급여</td>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">신한은행</td>
                <td className="py-2 text-gray-500 dark:text-gray-400">월급</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">※ 구분: '수입' 또는 '지출', 카테고리: 등록된 카테고리명과 일치해야 합니다</p>
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-rose-100 dark:border-rose-900/30">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-rose-500" />
          <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">위험 구역</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          아래 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.
        </p>

        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
          >
            <Trash2 size={16} />
            모든 거래 데이터 초기화
          </button>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20">
            <AlertTriangle size={18} className="text-rose-500 flex-shrink-0" />
            <p className="text-sm text-rose-700 dark:text-rose-300 flex-1">
              정말로 모든 거래 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={handleClearData}
                className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600">
                삭제
              </button>
              <button onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-50">
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {showSmartImport && <CsvImportModal onClose={() => setShowSmartImport(false)} />}
    </div>
  );
}
