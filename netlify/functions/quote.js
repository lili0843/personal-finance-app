// Yahoo Finance 시세 중계 함수 (미국 실시간/지연, 한국 전일 종가 등)
// 호출: /.netlify/functions/quote?symbol=AAPL  또는  ?symbol=005930.KS
exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const symbol = ((event.queryStringParameters && event.queryStringParameters.symbol) || '').trim();
  if (!symbol) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'symbol required' }) };
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) {
      return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: 'upstream error' }) };
    }
    const json = await res.json();
    const meta = json && json.chart && json.chart.result && json.chart.result[0] && json.chart.result[0].meta;
    if (!meta) {
      return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'not found' }) };
    }
    const price = meta.regularMarketPrice != null ? meta.regularMarketPrice
      : (meta.chartPreviousClose != null ? meta.chartPreviousClose : meta.previousClose);
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        symbol: meta.symbol,
        price: price != null ? price : null,
        previousClose: meta.chartPreviousClose != null ? meta.chartPreviousClose : (meta.previousClose != null ? meta.previousClose : null),
        currency: meta.currency || null,
        marketState: meta.marketState || null,
        time: meta.regularMarketTime || null,
      }),
    };
  } catch (e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'fetch failed' }) };
  }
};
