// US-equity fundamentals.
//
// Two sources, layered so the feature works with zero configuration:
//   - Yahoo (keyless, via yahoo-finance2): always-on. Powers the key-stats grid,
//     growth, and the P&L revenue/profit trend. Yahoo's statement modules went
//     dead in Nov 2024, so the rich balance-sheet / cash-flow tables come from...
//   - Alpha Vantage (only if ALPHA_VANTAGE_API_KEY is set): full income / balance /
//     cash-flow statements, whose field names already match what the card renders.
//
// The card consumes a fixed shape (see CompanyDetails in company-actions.ts):
//   - statement rows are period-records: { fiscalDateEnding, <metricKey>: number }
//   - quickRatio / growth values are pre-formatted display strings.

import YahooFinance from 'yahoo-finance2';
import { getNextAlphaVantageKey, getNextFmpKey } from '@/lib/api-keys';
import { US_STOCKS } from '@/lib/us-stocks';
import { cached } from '@/lib/server-cache';

// suppress the library's console notices (survey + the statements-deprecation note)
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface StatementRow {
  fiscalDateEnding: string;
  [metricKey: string]: string | number;
}

export interface Fundamentals {
  meta: { name: string; symbol: string; sector: string; currency: string };
  quickRatio: Record<string, string | null>;
  growth: {
    sales: Record<string, string>;
    profit: Record<string, string>;
    cagr: Record<string, string>;
    roe: Record<string, string>;
  };
  annualReports: StatementRow[];
  quarterlyReports: StatementRow[];
  balanceSheets: StatementRow[];
  cashFlows: StatementRow[];
  ratios: { metric: string; values: (string | null)[] }[];
  peerData: PeerRow[];
  prosCons: { pros: string[]; cons: string[] };
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  shareholding: { periods: string[]; data: { category: string; values: (string | null)[] }[] };
  source: string;
}

// Shape the peer table consumes (raw-dollar values; the card divides by 1e9 itself).
export interface PeerRow {
  Symbol: string;
  Name: string;
  CMP: number | null;
  PERatio: number | null;
  MarketCapitalization: number | null;
  DividendYield: number;
  NetIncome: number | null;
  TotalRevenue: number | null;
  ROCE: number | null;
}

// ---- formatting helpers (quickRatio cells are rendered as raw strings) ----

function fmtMoney(n: number | undefined | null): string | null {
  if (n === undefined || n === null || !isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString('en-US')}`;
}

function fmtPctFromFraction(n: number | undefined | null, digits = 1): string | null {
  if (n === undefined || n === null || !isFinite(n)) return null;
  return `${(n * 100).toFixed(digits)}%`;
}

function fmtNum(n: number | undefined | null, digits = 2): string | null {
  if (n === undefined || n === null || !isFinite(n)) return null;
  return n.toFixed(digits);
}

function fmtPrice(n: number | undefined | null): string | null {
  if (n === undefined || n === null || !isFinite(n)) return null;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// CAGR over the chart, oldest -> newest, plus the latest YoY ("TTM" column).
function computeSeriesGrowth(valuesNewestFirst: number[]): Record<string, string> {
  const out: Record<string, string> = { '10 Years': 'N/A', '5 Years': 'N/A', '3 Years': 'N/A', 'TTM': 'N/A' };
  const v = valuesNewestFirst;
  const cagr = (latest: number, earlier: number, years: number) =>
    earlier > 0 && latest > 0 ? `${((Math.pow(latest / earlier, 1 / years) - 1) * 100).toFixed(1)}%` : 'N/A';
  // Only report a span when the series actually reaches that far back, so a 4-year
  // history doesn't show an identical (clamped) figure for "10 Years" and "5 Years".
  const spans: [string, number][] = [['10 Years', 9], ['5 Years', 4], ['3 Years', 2]];
  for (const [key, span] of spans) {
    if (v.length - 1 >= span) out[key] = cagr(v[0], v[span], span);
  }
  if (v.length >= 2 && v[1] > 0 && v[0] > 0) out['TTM'] = `${(((v[0] - v[1]) / v[1]) * 100).toFixed(1)}%`;
  return out;
}

// ---- Alpha Vantage statements (only when a key is configured) ----

// AV returns numbers as strings and "None" for gaps; keep numeric fields only.
function cleanAvReport(report: Record<string, any>): StatementRow {
  const row: StatementRow = { fiscalDateEnding: report.fiscalDateEnding || 'N/A' };
  for (const [k, val] of Object.entries(report)) {
    if (k === 'fiscalDateEnding' || k === 'reportedCurrency') continue;
    if (val === 'None' || val === undefined || val === null) continue;
    const num = Number(val);
    if (isFinite(num)) row[k] = num;
  }
  return row;
}

async function fetchAlphaVantage(symbol: string, fn: string): Promise<any | null> {
  const key = getNextAlphaVantageKey();
  if (!key) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=${fn}&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    // AV signals throttling / errors with Note / Information keys and no reports.
    if (data?.Note || data?.Information || (!data?.annualReports && !data?.quarterlyReports)) return null;
    return data;
  } catch {
    return null;
  }
}

// ---- Financial Modeling Prep statements (fallback when AV isn't configured) ----

// FMP uses its own field names; remap them to the AV-style keys the card renders.
function num(v: any): number | undefined {
  const n = Number(v);
  return isFinite(n) && v !== null && v !== '' ? n : undefined;
}

function mapFmpIncome(reports: any[]): StatementRow[] {
  return reports.map(r => {
    const row: StatementRow = { fiscalDateEnding: r.date || r.calendarYear || 'N/A' };
    const set = (k: string, v: number | undefined) => { if (v !== undefined) row[k] = v; };
    set('totalRevenue', num(r.revenue));
    set('operatingIncome', num(r.operatingIncome));
    set('netIncome', num(r.netIncome));
    return row;
  });
}

function mapFmpBalance(reports: any[]): StatementRow[] {
  return reports.map(r => {
    const row: StatementRow = { fiscalDateEnding: r.date || 'N/A' };
    const set = (k: string, v: number | undefined) => { if (v !== undefined) row[k] = v; };
    set('totalShareholderEquity', num(r.totalStockholdersEquity));
    set('retainedEarnings', num(r.retainedEarnings));
    set('longTermDebt', num(r.longTermDebt));
    set('totalLiabilities', num(r.totalLiabilities));
    set('propertyPlantEquipment', num(r.propertyPlantEquipmentNet));
    set('goodwill', num(r.goodwill));
    set('investments', num(r.longTermInvestments ?? r.totalInvestments));
    set('otherCurrentAssets', num(r.otherCurrentAssets));
    set('totalAssets', num(r.totalAssets));
    return row;
  });
}

function mapFmpCash(reports: any[]): StatementRow[] {
  return reports.map(r => {
    const row: StatementRow = { fiscalDateEnding: r.date || 'N/A' };
    const set = (k: string, v: number | undefined) => { if (v !== undefined) row[k] = v; };
    set('operatingCashflow', num(r.operatingCashFlow ?? r.netCashProvidedByOperatingActivities));
    set('cashflowFromInvestment', num(r.netCashUsedForInvestingActivites));
    set('cashflowFromFinancing', num(r.netCashUsedProvidedByFinancingActivities));
    set('netIncome', num(r.netIncome));
    return row;
  });
}

async function fetchFmp(symbol: string, statement: string): Promise<any[] | null> {
  const key = getNextFmpKey();
  if (!key) return null;
  try {
    const url = `https://financialmodelingprep.com/api/v3/${statement}/${encodeURIComponent(symbol)}?limit=5&apikey=${key}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    // FMP errors come back as an object with an "Error Message"; valid data is an array.
    return Array.isArray(data) && data.length ? data : null;
  } catch {
    return null;
  }
}

// ---- heuristic narrative from the live metrics ----

function buildProsCons(fd: any, name: string): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  if (fd?.profitMargins > 0.15) pros.push(`Strong net profit margin of ${pct(fd.profitMargins)}.`);
  if (fd?.revenueGrowth > 0.1) pros.push(`Healthy revenue growth of ${pct(fd.revenueGrowth)} year over year.`);
  if (fd?.returnOnEquity > 0.15) pros.push(`High return on equity of ${pct(fd.returnOnEquity)}.`);
  if (fd?.grossMargins > 0.4) pros.push(`Wide gross margin of ${pct(fd.grossMargins)} signals pricing power.`);
  if (fd?.currentRatio > 1.5) pros.push(`Comfortable liquidity with a current ratio of ${fd.currentRatio.toFixed(2)}.`);
  if (fd?.recommendationKey && ['buy', 'strong_buy'].includes(fd.recommendationKey))
    pros.push(`Analyst consensus leans ${fd.recommendationKey.replace('_', ' ')}.`);

  if (fd?.profitMargins !== undefined && fd.profitMargins < 0.05) cons.push(`Thin net margin of ${pct(fd.profitMargins)}.`);
  if (fd?.revenueGrowth !== undefined && fd.revenueGrowth < 0) cons.push(`Revenue is contracting (${pct(fd.revenueGrowth)} YoY).`);
  if (fd?.debtToEquity > 150) cons.push(`Elevated leverage (debt-to-equity of ${fd.debtToEquity.toFixed(0)}).`);
  if (fd?.currentRatio !== undefined && fd.currentRatio < 1) cons.push(`Current ratio below 1 (${fd.currentRatio.toFixed(2)}) may pressure short-term liquidity.`);
  if (fd?.recommendationKey && ['sell', 'underperform'].includes(fd.recommendationKey))
    cons.push(`Analyst consensus leans ${fd.recommendationKey.replace('_', ' ')}.`);

  if (!pros.length) pros.push(`${name} fundamentals look broadly in line with peers.`);
  if (!cons.length) cons.push('No major red flags surfaced in the headline metrics.');
  return { pros, cons };
}

function buildSwot(fd: any, sector: string) {
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  return {
    strengths: [
      fd?.grossMargins > 0.4 ? `Gross margin of ${pct(fd.grossMargins)}` : `Established position in ${sector}`,
      fd?.returnOnEquity > 0.15 ? `Return on equity of ${pct(fd.returnOnEquity)}` : 'Diversified revenue base',
      fd?.totalCash ? `${fmtMoney(fd.totalCash)} in cash on the balance sheet` : 'Experienced management team',
    ],
    weaknesses: [
      fd?.debtToEquity > 100 ? `Leverage (debt-to-equity ${fd.debtToEquity.toFixed(0)})` : 'Exposure to input-cost inflation',
      fd?.profitMargins < 0.1 ? `Net margin of ${pct(fd.profitMargins)}` : 'Valuation sensitivity to rate moves',
      'Concentration risk in core product lines',
    ],
    opportunities: ['Expansion into adjacent markets', 'Operating-leverage from scale', 'Capital returns via buybacks and dividends'],
    threats: [`Competition within ${sector}`, 'Macroeconomic and demand cycles', 'Regulatory and geopolitical risk'],
  };
}

// ---- key ratios (single "Latest" column; shares the period axis with ownership) ----

function buildRatios(sd: any, ks: any, fd: any): { metric: string; values: (string | null)[] }[] {
  const rows: [string, string | null][] = [
    ['P/E', fmtNum(sd.trailingPE, 1)],
    ['Forward P/E', fmtNum(sd.forwardPE ?? ks.forwardPE, 1)],
    ['P/B', fmtNum(ks.priceToBook, 2)],
    ['PEG', fmtNum(ks.pegRatio, 2)],
    ['ROE %', fmtPctFromFraction(fd.returnOnEquity)],
    ['ROA %', fmtPctFromFraction(fd.returnOnAssets)],
    ['Gross Margin %', fmtPctFromFraction(fd.grossMargins)],
    ['Operating Margin %', fmtPctFromFraction(fd.operatingMargins)],
    ['Net Margin %', fmtPctFromFraction(fd.profitMargins)],
    ['Debt to Equity', fmtNum(fd.debtToEquity, 1)],
    ['Current Ratio', fmtNum(fd.currentRatio, 2)],
    ['Quick Ratio', fmtNum(fd.quickRatio, 2)],
  ];
  return rows.map(([metric, value]) => ({ metric, values: [value] }));
}

// ---- same-sector peers (real US tickers; one batched stat fetch each) ----

async function fetchPeerStat(symbol: string, name: string): Promise<PeerRow | null> {
  try {
    const r = await yf.quoteSummary(
      symbol,
      { modules: ['price', 'summaryDetail', 'financialData'] },
      { validateResult: false },
    );
    const p = r?.price || {};
    const sd = r?.summaryDetail || {};
    const fd = r?.financialData || {};
    const revenue = fd.totalRevenue ?? null;
    return {
      Symbol: symbol,
      Name: name,
      CMP: p.regularMarketPrice ?? null,
      PERatio: sd.trailingPE ?? null,
      MarketCapitalization: p.marketCap ?? null,
      DividendYield: (sd.dividendYield || 0) * 100,
      // Yahoo doesn't expose a clean net-income figure here; derive from margin.
      NetIncome: revenue !== null && fd.profitMargins !== undefined ? revenue * fd.profitMargins : null,
      TotalRevenue: revenue,
      ROCE: fd.returnOnEquity !== undefined ? fd.returnOnEquity * 100 : null,
    };
  } catch {
    return null;
  }
}

async function getPeers(selfSymbol: string, sector: string): Promise<PeerRow[]> {
  const candidates = US_STOCKS.filter(s => s.sector === sector && s.symbol !== selfSymbol).slice(0, 5);
  if (!candidates.length) return [];
  const rows = await Promise.all(candidates.map(s => fetchPeerStat(s.symbol, s.name)));
  return rows.filter((r): r is PeerRow => r !== null);
}

// ---- main entry ----

// Cache the assembled result per symbol (~10 min) so repeated card renders don't re-hit
// Yahoo/AV/FMP. yahoo-finance2 bypasses Next's fetch cache, so this is the only memo layer.
export async function getUsFundamentals(
  symbol: string,
  fallbackName: string,
  fallbackSector: string,
): Promise<Fundamentals | null> {
  return cached(`fund:${symbol.toUpperCase()}`, 10 * 60 * 1000, () =>
    fetchFundamentals(symbol, fallbackName, fallbackSector),
  );
}

async function fetchFundamentals(
  symbol: string,
  fallbackName: string,
  fallbackSector: string,
): Promise<Fundamentals | null> {
  let summary: any = null;
  try {
    summary = await yf.quoteSummary(
      symbol,
      {
        modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'assetProfile', 'earnings'],
      },
      { validateResult: false },
    );
  } catch (e) {
    console.warn(`Yahoo fundamentals unavailable for ${symbol}:`, (e as Error).message);
  }
  if (!summary) return null;

  const price = summary.price || {};
  const sd = summary.summaryDetail || {};
  const ks = summary.defaultKeyStatistics || {};
  const fd = summary.financialData || {};
  const profile = summary.assetProfile || {};
  const chart = summary.earnings?.financialsChart || {};

  const name = price.longName || price.shortName || fallbackName;
  const sector = profile.sector || fallbackSector;

  // ---- key-stats grid (US-relevant keys; rendered as-is) ----
  const quickRatio: Record<string, string | null> = {
    'Market Cap': fmtMoney(price.marketCap),
    'Current Price': fmtPrice(price.regularMarketPrice),
    '52W High': fmtPrice(sd.fiftyTwoWeekHigh),
    '52W Low': fmtPrice(sd.fiftyTwoWeekLow),
    'Stock P/E': fmtNum(sd.trailingPE, 1),
    'Forward P/E': fmtNum(sd.forwardPE ?? ks.forwardPE, 1),
    'PEG Ratio': fmtNum(ks.pegRatio, 2),
    'Book Value': fmtPrice(ks.bookValue),
    'Price to Book': fmtNum(ks.priceToBook, 2),
    'EPS (TTM)': fmtPrice(ks.trailingEps),
    'Forward EPS': fmtPrice(ks.forwardEps),
    'Dividend Yield': fmtPctFromFraction(sd.dividendYield, 2),
    'Beta': fmtNum(sd.beta ?? ks.beta, 2),
    'ROE': fmtPctFromFraction(fd.returnOnEquity),
    'ROA': fmtPctFromFraction(fd.returnOnAssets),
    'Gross Margin': fmtPctFromFraction(fd.grossMargins),
    'Operating Margin': fmtPctFromFraction(fd.operatingMargins),
    'Profit Margin': fmtPctFromFraction(fd.profitMargins),
    'Revenue Growth': fmtPctFromFraction(fd.revenueGrowth),
    'Earnings Growth': fmtPctFromFraction(fd.earningsGrowth),
    'Debt to Equity': fmtNum(fd.debtToEquity, 1),
    'Current Ratio': fmtNum(fd.currentRatio, 2),
    'Total Revenue': fmtMoney(fd.totalRevenue),
    'Total Cash': fmtMoney(fd.totalCash),
    'Total Debt': fmtMoney(fd.totalDebt),
    'Shares Out': fmtMoney(ks.sharesOutstanding)?.replace('$', '') ?? null,
    'Inst. Holding': fmtPctFromFraction(ks.heldPercentInstitutions),
    'Insider Holding': fmtPctFromFraction(ks.heldPercentInsiders),
    'Analyst Target': fmtPrice(fd.targetMeanPrice),
    'Recommendation': fd.recommendationKey ? String(fd.recommendationKey).replace('_', ' ').toUpperCase() : null,
    'Volume': sd.volume ? sd.volume.toLocaleString('en-US') : null,
    'Industry': profile.industry || null,
  };

  // ---- growth (from Yahoo yearly earnings chart) ----
  const yearly: any[] = chart.yearly || [];
  const revNewestFirst = yearly.map(y => y.revenue).reverse(); // chart is oldest->newest
  const earnNewestFirst = yearly.map(y => y.earnings).reverse();
  const roeStr = fmtPctFromFraction(fd.returnOnEquity) || 'N/A';
  const growth = {
    sales: computeSeriesGrowth(revNewestFirst),
    profit: computeSeriesGrowth(earnNewestFirst),
    cagr: { '10 Years': 'N/A', '5 Years': 'N/A', '3 Years': 'N/A', '1 Year': fmtPctFromFraction(sd.fiftyTwoWeekChange) || 'N/A' },
    roe: { '10 Years': 'N/A', '5 Years': 'N/A', '3 Years': 'N/A', 'Last Year': roeStr },
  };

  // ---- P&L trend from Yahoo (annual + quarterly); AV overrides below if available ----
  let annualReports: StatementRow[] = yearly.map(y => ({
    fiscalDateEnding: `${y.date}-12-31`,
    totalRevenue: y.revenue,
    netIncome: y.earnings,
  }));
  let quarterlyReports: StatementRow[] = (chart.quarterly || []).map((q: any) => ({
    // chart quarter labels look like "2Q2025"; keep them readable
    fiscalDateEnding: q.date,
    totalRevenue: q.revenue,
    netIncome: q.earnings,
  }));
  let balanceSheets: StatementRow[] = [];
  let cashFlows: StatementRow[] = [];
  let source = 'Yahoo Finance';

  // ---- peers + (optional) AV statements, fetched together ----
  const [peerData, income, balance, cash] = await Promise.all([
    getPeers(symbol, fallbackSector),
    fetchAlphaVantage(symbol, 'INCOME_STATEMENT'),
    fetchAlphaVantage(symbol, 'BALANCE_SHEET'),
    fetchAlphaVantage(symbol, 'CASH_FLOW'),
  ]);
  if (income?.annualReports?.length) {
    annualReports = income.annualReports.map(cleanAvReport);
    if (income.quarterlyReports?.length) quarterlyReports = income.quarterlyReports.map(cleanAvReport);
    source = 'Alpha Vantage + Yahoo Finance';
  }
  if (balance?.annualReports?.length) balanceSheets = balance.annualReports.map(cleanAvReport);
  if (cash?.annualReports?.length) cashFlows = cash.annualReports.map(cleanAvReport);

  // ---- FMP fallback: fills the statement tables AV didn't (the common no-AV-key case) ----
  if ((!balanceSheets.length || !cashFlows.length) && getNextFmpKey()) {
    const [fmpIncome, fmpBalance, fmpCash] = await Promise.all([
      fetchFmp(symbol, 'income-statement'),
      fetchFmp(symbol, 'balance-sheet-statement'),
      fetchFmp(symbol, 'cash-flow-statement'),
    ]);
    let usedFmp = false;
    // Prefer FMP's annual P&L (it carries operatingIncome that Yahoo's chart lacks).
    if (fmpIncome && source === 'Yahoo Finance') { annualReports = mapFmpIncome(fmpIncome); usedFmp = true; }
    if (!balanceSheets.length && fmpBalance) { balanceSheets = mapFmpBalance(fmpBalance); usedFmp = true; }
    if (!cashFlows.length && fmpCash) { cashFlows = mapFmpCash(fmpCash); usedFmp = true; }
    if (usedFmp) source = source === 'Yahoo Finance' ? 'FMP + Yahoo Finance' : `${source} + FMP`;
  }

  // ---- US ownership split (replaces promoter/FII/DII) ----
  const inst = ks.heldPercentInstitutions;
  const insider = ks.heldPercentInsiders;
  const shareholding =
    inst !== undefined || insider !== undefined
      ? {
          periods: ['Latest'],
          data: [
            { category: 'Institutions', values: [fmtPctFromFraction(inst)] },
            { category: 'Insiders', values: [fmtPctFromFraction(insider)] },
            { category: 'Public & Other', values: [fmtPctFromFraction(Math.max(0, 1 - (inst || 0) - (insider || 0)))] },
          ],
        }
      : { periods: [], data: [] };

  return {
    meta: { name, symbol, sector, currency: price.currency || 'USD' },
    quickRatio,
    growth,
    annualReports,
    quarterlyReports,
    balanceSheets,
    cashFlows,
    ratios: buildRatios(sd, ks, fd),
    peerData,
    prosCons: buildProsCons(fd, name),
    swot: buildSwot(fd, sector),
    shareholding,
    source,
  };
}
