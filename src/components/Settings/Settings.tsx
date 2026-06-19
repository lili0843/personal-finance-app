import React, { useState } from 'react';
import { Sun, Moon, Globe, Tag, Plus, Trash2, CheckCircle, ChevronDown, CalendarDays } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Currency } from '../../types';

const CURRENCY_INFO: Record<Currency, { label: string; symbol: string; example: string }> = {
  KRW: { label: '대한민국 원 (KRW)', symbol: '₩', example: '₩1,000,000' },
  VND: { label: '베트남 동 (VND)', symbol: '₫', example: '1,000,000₫' },
  USD: { label: '미국 달러 (USD)', symbol: '$', example: '$1,000.00' },
};

const CATEGORY_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#6366F1', '#06B6D4', '#6B7280',
];

export default function Settings() {
  const { settings, updateSettings, categories, addCategory, deleteCategory } = useApp();
  const [saved, setSaved] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [catError, setCatError] = useState('');

  function handleCurrencyChange(currency: Currency) {
    updateSettings({ currency });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDarkModeToggle() {
    updateSettings({ darkMode: !settings.darkMode });
  }

  function handleAddCategory() {
    if (!newCatName.trim()) {
      setCatError('카테고리명을 입력해주세요');
      return;
    }
    if (categories.find((c) => c.name === newCatName.trim())) {
      setCatError('이미 존재하는 카테고리입니다');
      return;
    }
    addCategory({
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: 'tag',
      isCustom: true,
    });
    setNewCatName('');
    setCatError('');
  }

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <div className="max-w-2xl space-y-6">
      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5">화면 설정</h3>

        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {settings.darkMode ? <Moon size={18} className="text-indigo-500" /> : <Sun size={18} className="text-amber-500" />}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">다크 모드</p>
              <p className="text-xs text-gray-400">어두운 화면으로 전환합니다</p>
            </div>
          </div>
          <button
            onClick={handleDarkModeToggle}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${settings.darkMode ? 'bg-indigo-600' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${settings.darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Currency */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">통화 설정</h3>
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs">
              <CheckCircle size={14} /> 저장됨
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Globe size={18} className="text-indigo-500" />
          <p className="text-sm text-gray-600 dark:text-gray-300">기준 통화를 선택하세요</p>
        </div>

        <div className="space-y-2">
          {(Object.keys(CURRENCY_INFO) as Currency[]).map((c) => {
            const info = CURRENCY_INFO[c];
            const isSelected = settings.currency === c;
            return (
              <button
                key={c}
                onClick={() => handleCurrencyChange(c)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
                    {info.symbol}
                  </span>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>
                      {info.label}
                    </p>
                    <p className="text-xs text-gray-400">예시: {info.example}</p>
                  </div>
                </div>
                {isSelected && <CheckCircle size={18} className="text-indigo-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Payday */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={16} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">급여일 설정</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          급여일을 정하면, 대시보드의 수입·지출·추이를 <b>달력 한 달이 아니라 급여일 기준 한 달</b>(이번 급여일 ~ 다음 급여일 전날)로 계산합니다.
        </p>
        <div className="flex items-center gap-3">
          <select
            value={settings.payday ?? ''}
            onChange={(e) => updateSettings({ payday: e.target.value ? Number(e.target.value) : undefined })}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">사용 안함 (달력 기준)</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>매월 {d}일</option>
            ))}
          </select>
          {settings.payday && (
            <span className="text-xs text-gray-500 dark:text-gray-400">매월 {settings.payday}일 기준</span>
          )}
        </div>

        {settings.payday && (
          <label className="flex items-center gap-2.5 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.paydayWeekendAdjust !== false}
              onChange={(e) => updateSettings({ paydayWeekendAdjust: e.target.checked })}
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              급여일이 <b>주말이면 직전 금요일</b>로 앞당겨 계산
              <span className="block text-xs text-gray-400">월급을 주말 전에 미리 받는 경우 기간이 어긋나지 않습니다</span>
            </span>
          </label>
        )}
      </div>

      {/* Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-5">
          <Tag size={16} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">카테고리 관리</h3>
        </div>

        {/* Add custom category */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-5">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-3">사용자 정의 카테고리 추가</p>
          <div className="space-y-3">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => { setNewCatName(e.target.value); setCatError(''); }}
              placeholder="카테고리명 입력"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {catError && <p className="text-xs text-rose-500">{catError}</p>}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select value={newCatType} onChange={(e) => setNewCatType(e.target.value as 'income' | 'expense')}
                  className="w-full px-3 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                  <option value="expense">지출</option>
                  <option value="income">수입</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="flex gap-1.5 items-center">
                {CATEGORY_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setNewCatColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${newCatColor === c ? 'ring-2 ring-offset-1 ring-indigo-500 scale-125' : ''}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <button onClick={handleAddCategory}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
              <Plus size={16} /> 카테고리 추가
            </button>
          </div>
        </div>

        {/* Category list */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">수입 카테고리</p>
            <div className="space-y-1.5">
              {incomeCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{cat.name}</span>
                    {cat.isCustom && <span className="px-1.5 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">커스텀</span>}
                  </div>
                  {cat.isCustom && (
                    <button onClick={() => deleteCategory(cat.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-rose-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2">지출 카테고리</p>
            <div className="space-y-1.5">
              {expenseCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{cat.name}</span>
                    {cat.isCustom && <span className="px-1.5 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">커스텀</span>}
                  </div>
                  {cat.isCustom && (
                    <button onClick={() => deleteCategory(cat.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-rose-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* App info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">앱 정보</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">버전</span>
            <span className="text-gray-700 dark:text-gray-200 font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">저장소</span>
            <span className="text-gray-700 dark:text-gray-200 font-medium">로컬 스토리지</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">지원 통화</span>
            <span className="text-gray-700 dark:text-gray-200 font-medium">KRW, VND, USD</span>
          </div>
        </div>
      </div>
    </div>
  );
}
