'use strict';

// Zero-dependency Yahoo quotes via the public chart endpoint. One 1-year daily series per
// symbol gives us price, day change, and the 52-week range (max/min of closes) — enough for
// the watchlist summary and the alert rules, without needing a crumb-authenticated API.

async function fetchChart(symbol, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.chart?.result?.[0] || null;
}

// Full quote with the 52-week range (one 1y fetch).
async function getQuote(symbol) {
  try {
    const r = await fetchChart(symbol, '1y');
    if (!r) return null;
    const meta = r.meta || {};
    const closes = (r.indicators?.quote?.[0]?.close || []).filter(c => typeof c === 'number');
    const price = meta.regularMarketPrice ?? closes[closes.length - 1] ?? null;
    // For range=1y, meta.previousClose is the close from a YEAR ago, not yesterday — so take
    // the prior session from the daily series instead. The last bar is the latest session
    // (≈ regularMarketPrice), so the one before it is the prior close we want for day change.
    const prev = closes.length >= 2 ? closes[closes.length - 2] : (meta.previousClose ?? meta.chartPreviousClose ?? price);
    if (price == null) return null;
    const high52 = closes.length ? Math.max(...closes, price) : null;
    const low52 = closes.length ? Math.min(...closes, price) : null;
    return {
      symbol,
      name: meta.longName || meta.shortName || symbol,
      price,
      prevClose: prev,
      changePct: prev ? ((price - prev) / prev) * 100 : 0,
      high52,
      low52,
      currency: meta.currency || 'USD',
    };
  } catch (e) {
    console.error(`getQuote ${symbol} failed:`, e.message);
    return null;
  }
}

// Lightweight quote for indices (no 52-week math needed).
async function getIndex(symbol, label) {
  try {
    const r = await fetchChart(symbol, '5d');
    if (!r) return null;
    const meta = r.meta || {};
    const price = meta.regularMarketPrice ?? null;
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? price;
    if (price == null) return null;
    return { label, price, changePct: prev ? ((price - prev) / prev) * 100 : 0 };
  } catch {
    return null;
  }
}

async function getQuotes(symbols) {
  return Promise.all(symbols.map(getQuote));
}

const US_INDICES = [
  ['^GSPC', 'S&P 500'],
  ['^DJI', 'Dow Jones'],
  ['^IXIC', 'Nasdaq'],
];

async function getIndices() {
  const rows = await Promise.all(US_INDICES.map(([s, l]) => getIndex(s, l)));
  return rows.filter(Boolean);
}

module.exports = { getQuote, getQuotes, getIndices };
