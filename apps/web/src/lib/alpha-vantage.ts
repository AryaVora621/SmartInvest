'use server';

import { getNextAlphaVantageKey } from './api-keys';

const BASE = 'https://www.alphavantage.co/query';

async function apiFetch<T>(params: Record<string, string>): Promise<T | null> {
    const apiKey = getNextAlphaVantageKey();
    if (!apiKey) return null;
    const qs = new URLSearchParams({ ...params, apikey: apiKey }).toString();
    try {
        const res = await fetch(`${BASE}?${qs}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            next: { revalidate: 3600 },
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.Information && data.Information.includes('API rate limit')) {
            console.warn('Alpha Vantage rate limited');
            return null;
        }
        if (data.Note && data.Note.includes('API call frequency')) {
            console.warn('Alpha Vantage frequency limit');
            return null;
        }
        return data as T;
    } catch {
        return null;
    }
}

export interface AlphaVantageOverview {
    Symbol?: string;
    Name?: string;
    Description?: string;
    MarketCapitalization?: string;
    PERatio?: string;
    EPS?: string;
    BookValue?: string;
    DividendYield?: string;
    RevenueTTM?: string;
    GrossProfitTTM?: string;
    ProfitMargin?: string;
    ReturnOnEquityTTM?: string;
    ReturnOnAssetsTTM?: string;
    DebtToEquityRatio?: string;
    Sector?: string;
    Industry?: string;
    SharesOutstanding?: string;
    '52WeekHigh'?: string;
    '52WeekLow'?: string;
    DividendPerShare?: string;
    QuarterlyEarningsGrowthYOY?: string;
    QuarterlyRevenueGrowthYOY?: string;
    OperatingMarginTTM?: string;
    PriceToBookRatio?: string;
}

export async function getOverview(symbol: string): Promise<AlphaVantageOverview | null> {
    return apiFetch<AlphaVantageOverview>({ function: 'OVERVIEW', symbol });
}

export interface AlphaVantageAnnualReport {
    fiscalDateEnding?: string;
    totalRevenue?: string;
    netIncome?: string;
    grossProfit?: string;
    operatingIncome?: string;
    costOfRevenue?: string;
}

export interface AlphaVantageIncomeStatement {
    annualReports?: AlphaVantageAnnualReport[];
}

export async function getIncomeStatement(symbol: string): Promise<AlphaVantageIncomeStatement | null> {
    return apiFetch<AlphaVantageIncomeStatement>({ function: 'INCOME_STATEMENT', symbol });
}

export interface AlphaVantageBalanceSheetReport {
    fiscalDateEnding?: string;
    cashAndCashEquivalentsAtCarryingValue?: string;
    retainedEarnings?: string;
    totalAssets?: string;
    totalLiabilities?: string;
    longTermDebt?: string;
    stockholderEquity?: string;
    propertyPlantEquipment?: string;
    goodwill?: string;
    investments?: string;
}

export interface AlphaVantageBalanceSheet {
    annualReports?: AlphaVantageBalanceSheetReport[];
}

export async function getBalanceSheet(symbol: string): Promise<AlphaVantageBalanceSheet | null> {
    return apiFetch<AlphaVantageBalanceSheet>({ function: 'BALANCE_SHEET', symbol });
}

export interface AlphaVantageCashFlowReport {
    fiscalDateEnding?: string;
    operatingCashflow?: string;
    cashflowFromInvestment?: string;
    cashflowFromFinancing?: string;
}

export interface AlphaVantageCashFlow {
    annualReports?: AlphaVantageCashFlowReport[];
}

export async function getCashFlow(symbol: string): Promise<AlphaVantageCashFlow | null> {
    return apiFetch<AlphaVantageCashFlow>({ function: 'CASH_FLOW', symbol });
}
