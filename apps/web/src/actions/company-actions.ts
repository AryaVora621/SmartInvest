'use server';

import { US_STOCKS } from '@/lib/us-stocks';

export type QuickRatioData = Record<string, string | null>;

export type GrowthData = {
  sales: Record<string, string>;
  profit: Record<string, string>;
  cagr: Record<string, string>;
  roe: Record<string, string>;
};

export type RatioRow = {
  metric: string;
  values: (string | null)[];
};

export type ShareholdingData = {
  periods: string[];
  data: { category: string; values: (string | null)[] }[];
};

const initialQuickRatioData: QuickRatioData = {
    'Market Cap': null, 'Current Price': null, 'High / Low': null,
    'Stock P/E': null, 'Book Value': null, 'Dividend Yield': null,
    'Industry PE': null, 'Profit after tax': null, 'High price all time': null,
    'ROCE': null, 'ROE': null, 'Operating profit': null,
    'ROIC': null, 'EPS': null, 'CWIP': null,
    'Debt to equity': null, 'Sales growth': null, 'Profit growth': null,
    'Cash Equivalents': null, 'Reserves': null, 'Volume': null,
    'Intrinsic Value': null, 'Piotroski score': null, 'PEG Ratio': null,
    'Price to Cash flow': null, 'PEG Prev Qtr.': null, 'Low price all time': null,
    'Pledged percentage': null, 'Interest': null, 'Face Value': null,
    'Promoter holding': null, 'PB X PE': null, 'OP Prev Qtr.': null,
    'FII holding': null, 'Exp Qtr OP': null, 'ROCE 5Yr': null,
    'DII holding': null, 'Profit Var 3Yrs': null, 'EPS preceding year': null,
    'Public holding': null, '3Yrs PL': null, 'LPS growth 5Years': null,
    'Return over 1year': null, 'Sales growth 3Years': null, 'OPM last year': null,
    'NPM last year': null
};

export type CompanyDetails = {
  name: string;
  symbol: string;
  sector: string;
  quickRatio: QuickRatioData;
  growth: GrowthData;
  ratios: RatioRow[];
  shareholding: ShareholdingData;
  prosCons: { pros: string[]; cons: string[] };
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  peerData: any[];
  quarterlyReports: any[];
  annualReports: any[];
  balanceSheets: any[];
  cashFlows: any[];
};

const allStocks: { symbol: string; name: string; sector: string }[] = US_STOCKS;

function findStock(name: string) {
  const lower = name.toLowerCase();
  return allStocks.find(s => s.name.toLowerCase().includes(lower) || s.symbol.toLowerCase().includes(lower));
}

function computeGrowth(values: number[], periods: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const lookups = [
    { key: '10 Years', offset: Math.min(9, values.length - 1) },
    { key: '5 Years', offset: Math.min(4, values.length - 1) },
    { key: '3 Years', offset: Math.min(2, values.length - 1) },
  ];
  for (const { key, offset } of lookups) {
    if (offset > 0 && values[0] > 0 && values[offset] > 0) {
      const cagr = (Math.pow(values[offset] / values[0], 1 / offset) - 1) * 100;
      result[key] = cagr.toFixed(1) + '%';
    } else {
      result[key] = 'N/A';
    }
  }
  if (values.length >= 2 && values[0] > 0 && values[1] > 0) {
    const ttmGrowth = ((values[0] - values[1]) / values[1]) * 100;
    result['TTM'] = ttmGrowth.toFixed(1) + '%';
  } else {
    result['TTM'] = 'N/A';
  }
  return result;
}

function computeCagrFromPrices(prices: number[], years: number): number | null {
  if (prices.length < 2) return null;
  const latest = prices[0];
  const idx = Math.min(Math.floor(years * 252), prices.length - 1);
  const earlier = prices[idx];
  if (earlier <= 0) return null;
  return (Math.pow(latest / earlier, 1 / years) - 1) * 100;
}

function generateQuarterLabels(): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    labels.unshift(`Q${quarter} ${d.getFullYear()}`);
  }
  return labels;
}

function generateFinancialLabels(): string[] {
  const labels: string[] = [];
  const year = new Date().getFullYear();
  for (let i = 0; i < 10; i++) {
    labels.unshift(`Mar ${year - i}`);
  }
  return labels;
}

function parseFinancialValue(val: any): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}



function mapScrapedToCompanyDetails(scraped: any): CompanyDetails {
    const growth: GrowthData = {
        sales: Object.keys(scraped.growth.sales).length ? scraped.growth.sales : {},
        profit: Object.keys(scraped.growth.profit).length ? scraped.growth.profit : {},
        cagr: Object.keys(scraped.growth.cagr).length ? scraped.growth.cagr : {},
        roe: Object.keys(scraped.growth.roe).length ? scraped.growth.roe : {},
    };

    const mapRows = (rows: ScrapedCompanyData['quarterlyReports']) =>
        rows.map(row => {
            const obj: Record<string, string | null> = { metric: row.metric };
            row.values.forEach((v, i) => { obj[`val_${i}`] = v; });
            return obj;
        });

    return {
        name: scraped.name,
        symbol: scraped.symbol,
        sector: scraped.sector,
        quickRatio: scraped.quickRatios,
        growth,
        ratios: scraped.ratiosTable.map(r => ({ metric: r.metric, values: r.values })),
        shareholding: scraped.shareholding,
        prosCons: scraped.prosCons,
        swot: {
            strengths: ['Strong market position in ' + scraped.sector + ' sector', 'Experienced management team', 'Solid financial fundamentals'],
            weaknesses: ['High valuation multiples', 'Dependence on domestic market', 'Regulatory compliance costs'],
            opportunities: ['Expansion into new markets', 'Digital transformation', 'Strategic acquisitions'],
            threats: ['Intense competition', 'Regulatory changes', 'Economic slowdown risks'],
        },
        peerData: scraped.peerData || [],
        quarterlyReports: mapRows(scraped.quarterlyReports),
        annualReports: mapRows(scraped.annualReports),
        balanceSheets: mapRows(scraped.balanceSheets),
        cashFlows: mapRows(scraped.cashFlows),
    };
}

export async function getCompanyDetails(stockName: string): Promise<{ success: boolean; data?: CompanyDetails; error?: string }> {
    try {
        const stock = findStock(stockName);
        if (!stock) return { success: false, error: `Could not find stock matching "${stockName}".` };

        return { success: true, data: getMockCompanyDetails(stock) };
    } catch (error) {
        console.error('Error in getCompanyDetails:', error);
        const stock = findStock(stockName);
        return { success: true, data: getMockCompanyDetails(stock || { name: stockName, symbol: stockName, sector: 'Unknown' }) };
    }
}

function getMockCompanyDetails(stock: { name: string; symbol: string; sector: string }): CompanyDetails {
    return {
        name: stock.name,
        symbol: stock.symbol,
        sector: stock.sector,
        quickRatio: initialQuickRatioData,
        growth: { sales: {}, profit: {}, cagr: {}, roe: {} },
        ratios: [],
        shareholding: { periods: [], data: [] },
        prosCons: { pros: [], cons: [] },
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        peerData: [],
        quarterlyReports: [],
        annualReports: [],
        balanceSheets: [],
        cashFlows: [],
    };
}
