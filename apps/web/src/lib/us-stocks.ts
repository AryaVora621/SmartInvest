import type { Stock } from '@/types';

// Default US-equity universe used by the local screener / finder / research dashboard.
// Plain Yahoo tickers (no exchange suffix). `fairPE` and `lastQuarterProfit` (USD millions)
// are rough inputs for the local heuristic screener, not live data.
export const US_STOCKS: Stock[] = [
  { symbol: 'AAPL', name: 'Apple', sector: 'Technology', fairPE: 28, lastQuarterProfit: 23000 },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology', fairPE: 32, lastQuarterProfit: 22000 },
  { symbol: 'GOOGL', name: 'Alphabet', sector: 'Communication Services', fairPE: 24, lastQuarterProfit: 20000 },
  { symbol: 'AMZN', name: 'Amazon', sector: 'Consumer Discretionary', fairPE: 38, lastQuarterProfit: 13000 },
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'Technology', fairPE: 40, lastQuarterProfit: 16000 },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Communication Services', fairPE: 25, lastQuarterProfit: 12000 },
  { symbol: 'TSLA', name: 'Tesla', sector: 'Consumer Discretionary', fairPE: 55, lastQuarterProfit: 2500 },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', fairPE: 12, lastQuarterProfit: 13000 },
  { symbol: 'V', name: 'Visa', sector: 'Financials', fairPE: 30, lastQuarterProfit: 5000 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', fairPE: 16, lastQuarterProfit: 5000 },
  { symbol: 'WMT', name: 'Walmart', sector: 'Consumer Staples', fairPE: 28, lastQuarterProfit: 4500 },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', fairPE: 12, lastQuarterProfit: 8000 },
];
