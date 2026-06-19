import { Currency } from '../types';

export interface ParsedSms {
  amount: number;
  currency: Currency;
  merchant: string;
  date: string; // YYYY-MM-DD
  type: 'expense' | 'income';
  raw: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// 문자 텍스트 한 덩어리에서 거래 정보 추출
export function parseSmsBlock(block: string): ParsedSms | null {
  const text = block.replace(/\[Web발신\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  // 통화 + 금액
  let currency: Currency = 'KRW';
  let amount = 0;

  const krw = text.match(/([\d,]+)\s*원/);
  const usd = text.match(/(?:USD|\$)\s*([\d,]+(?:\.\d+)?)/i);
  const vnd = text.match(/([\d,]+)\s*(?:VND|동|₫)/i);

  if (krw) {
    currency = 'KRW';
    amount = parseFloat(krw[1].replace(/,/g, '')) || 0;
  } else if (usd) {
    currency = 'USD';
    amount = parseFloat(usd[1].replace(/,/g, '')) || 0;
  } else if (vnd) {
    currency = 'VND';
    amount = parseFloat(vnd[1].replace(/,/g, '')) || 0;
  } else {
    return null; // 금액 없으면 거래로 인식 안 함
  }

  // 수입/지출 판별
  let type: 'expense' | 'income' = 'expense';
  if (/입금|급여|이체입금|환급|받음/.test(text) && !/출금/.test(text)) {
    type = 'income';
  }

  // 날짜
  const now = new Date();
  let date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const ymd = text.match(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  const md = text.match(/(\d{1,2})[./월]\s*(\d{1,2})\s*일?/);
  if (ymd) {
    date = `${ymd[1]}-${pad(+ymd[2])}-${pad(+ymd[3])}`;
  } else if (md) {
    date = `${now.getFullYear()}-${pad(+md[1])}-${pad(+md[2])}`;
  }

  // 가맹점 추출
  let merchant = '';
  // 1) 시간(HH:MM) 뒤의 텍스트 = 가맹점인 경우가 많음
  const afterTime = text.match(/\d{1,2}:\d{2}\s+(.+)$/);
  if (afterTime) {
    merchant = afterTime[1].trim();
  }
  if (!merchant) {
    // 2) 잔여 텍스트에서 노이즈 제거 후 추정
    let rest = text
      .replace(/[\d,]+\s*원/g, ' ')
      .replace(/(?:USD|\$)\s*[\d,.]+/gi, ' ')
      .replace(/[\d,]+\s*(?:VND|동|₫)/gi, ' ')
      .replace(/\d{1,2}[./월]\s*\d{1,2}\s*일?/g, ' ')
      .replace(/20\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2}/g, ' ')
      .replace(/\d{1,2}:\d{2}/g, ' ')
      .replace(/승인|취소|일시불|할부|체크|결제|출금|입금|잔액|누적|[가-힣]+카드|[가-힣]+은행/g, ' ')
      .replace(/[가-힣]+님/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    merchant = rest;
  }
  // 가맹점 길이 정리
  merchant = merchant.replace(/^[-/·,]+|[-/·,]+$/g, '').trim();

  return { amount, currency, merchant, date, type, raw: block.trim() };
}

// 여러 문자(빈 줄로 구분)를 한꺼번에 파싱
export function parseSms(text: string): ParsedSms[] {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const source = blocks.length > 0 ? blocks : [text];
  return source
    .map(parseSmsBlock)
    .filter((p): p is ParsedSms => p !== null && p.amount > 0);
}
