import { Transaction, Category, TransactionType } from '../types';
import { getTodayString } from './formatters';

export function exportTransactionsToCSV(transactions: Transaction[], categories: Category[]): void {
  const headers = ['날짜', '구분', '금액', '카테고리', '결제수단', '메모'];
  const rows = transactions.map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    return [
      t.date,
      t.type === 'income' ? '수입' : '지출',
      t.amount.toString(),
      cat?.name || '',
      t.paymentMethod,
      t.memo,
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const BOM = '﻿';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `가계부_${getTodayString()}.csv`);
}

export function importTransactionsFromCSV(
  csvText: string,
  categories: Category[]
): Omit<Transaction, 'id'>[] {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let inQuote = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === ',' && !inQuote) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };

  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const [date, typeStr, amountStr, categoryName, paymentMethod, memo] = parseRow(line);
      const type: TransactionType = typeStr === '수입' ? 'income' : 'expense';
      const category = categories.find((c) => c.name === categoryName);
      return {
        date: date || getTodayString(),
        type,
        amount: parseInt(amountStr?.replace(/[^0-9]/g, '') || '0', 10),
        categoryId: category?.id || '',
        paymentMethod: paymentMethod || '현금',
        memo: memo || '',
      };
    })
    .filter((t) => t.amount > 0 && t.categoryId);
}

export function exportToJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}
