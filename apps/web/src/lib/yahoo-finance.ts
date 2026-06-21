// US equities use plain Yahoo tickers (AAPL, MSFT, ...); pass them through as-is.
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export interface QuoteResult {
  price: number;
  change: number;
  percentChange: number;
  name: string;
  currency?: string;
}

interface YahooChartQuote {
  close?: number[];
  volume?: number[];
}

interface YahooChartMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  chartName?: string;
  currency?: string;
  shortName?: string;
  longName?: string;
}

async function fetchYahooChart(symbol: string): Promise<{ meta: any; quotes: any[] } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 120 },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    return {
      meta: result.meta,
      quotes: result.indicators?.quote?.[0]?.close || [],
    };
  } catch (error) {
    console.error(`Yahoo chart error for ${symbol}:`, error);
    return null;
  }
}

export async function getQuote(symbol: string): Promise<QuoteResult | null> {
  try {
    const ySymbol = normalizeSymbol(symbol);
    const chartData = await fetchYahooChart(ySymbol);
    if (!chartData) return null;
    const { meta, quotes } = chartData;
    const price = meta?.regularMarketPrice ?? meta?.chartPreviousClose ?? 0;
    const prevClose = meta?.previousClose ?? meta?.chartPreviousClose ?? price;
    const change = price - prevClose;
    const percentChange = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    return {
      price,
      change,
      percentChange,
      name: meta?.shortName || meta?.longName || symbol,
      currency: meta?.currency,
    };
  } catch (error) {
    console.error(`Yahoo quote error for ${symbol}:`, error);
    return null;
  }
}

export async function getQuotes(symbols: string[]): Promise<(QuoteResult | null)[]> {
  return Promise.all(symbols.map(s => getQuote(s)));
}

export interface HistoricalDataPoint {
  date: string;
  price: number;
}

export async function getHistoricalPrices(symbol: string, days: number = 30): Promise<HistoricalDataPoint[]> {
  try {
    const ySymbol = normalizeSymbol(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}?range=${days}d&interval=1d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 120 },
    });
    if (!response.ok) return [];
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp || [];
    const closes: number[] = result.indicators?.quote?.[0]?.close || [];

    return timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        price: closes[i] ?? 0,
      }))
      .filter(d => d.price > 0);
  } catch (error) {
    console.error(`Yahoo historical error for ${symbol}:`, error);
    return [];
  }
}

interface FinancialReportItem {
  [key: string]: string | null;
}

export async function getFinancials(symbol: string): Promise<{
  incomeStatement: FinancialReportItem[];
  balanceSheet: FinancialReportItem[];
  cashFlow: FinancialReportItem[];
}> {
  try {
    const ySymbol = normalizeSymbol(symbol);
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySymbol)}?modules=incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      console.warn(`Financials API returned ${response.status} for ${symbol}`);
      return { incomeStatement: [], balanceSheet: [], cashFlow: [] };
    }
    const data = await response.json();
    const result = data?.quoteSummary?.result?.[0];

    const mapReports = (reports: any[] | undefined): FinancialReportItem[] => {
      if (!reports) return [];
      return reports.slice(0, 4).map((r: any) => {
        const obj: FinancialReportItem = {};
        Object.entries(r).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            const raw = value.raw ?? value;
            obj[key] = typeof raw === 'number' ? raw.toFixed(2) : String(raw);
          }
        });
        if (r.endDate?.fmt) obj.endDate = r.endDate.fmt;
        return obj;
      });
    };

    return {
      incomeStatement: mapReports(result?.incomeStatementHistory?.incomeStatementHistory),
      balanceSheet: mapReports(result?.balanceSheetHistory?.balanceSheetStatements),
      cashFlow: mapReports(result?.cashflowStatementHistory?.cashflowStatements),
    };
  } catch (error) {
    console.error(`Yahoo financials error for ${symbol}:`, error);
    return { incomeStatement: [], balanceSheet: [], cashFlow: [] };
  }
}

export async function getExchangeRate(from: string = 'USD', to: string = 'USD'): Promise<number | null> {
  try {
    const pair = `${from}${to}=X`;
    const quote = await getQuote(pair);
    return quote?.price ?? null;
  } catch (error) {
    console.error(`Yahoo exchange rate error for ${from}${to}:`, error);
    return null;
  }
}

export async function getQuoteSummary(symbol: string, modules: string[] = ['summaryDetail', 'financialData', 'defaultKeyStatistics']): Promise<any> {
  try {
    const ySymbol = normalizeSymbol(symbol);
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySymbol)}?modules=${modules.join(',')}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.quoteSummary?.result?.[0] || null;
  } catch (error) {
    console.error(`Yahoo quoteSummary error for ${symbol}:`, error);
    return null;
  }
}
