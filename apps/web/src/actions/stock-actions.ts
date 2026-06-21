'use server';

import type { Stock, NewsArticle } from '@/types';
import { getNextAlphaVantageKey } from '@/lib/api-keys';
import { getQuote, getHistoricalPrices, getQuoteSummary, normalizeSymbol } from '@/lib/yahoo-finance';
import { US_STOCKS } from '@/lib/us-stocks';

const allStocks: Stock[] = US_STOCKS;

function findStocksFromLocalList(screenerCriteria: string): string[] {
    const keywords = screenerCriteria.toLowerCase().split(' ');
    const foundSymbols: Set<string> = new Set();
    keywords.forEach(keyword => {
        allStocks.forEach(stock => {
            if (stock.name.toLowerCase().includes(keyword) || stock.sector.toLowerCase().includes(keyword)) {
                foundSymbols.add(stock.symbol);
            }
        });
    });
    return Array.from(foundSymbols);
}

async function fetchStockDetails(symbol: string): Promise<Stock & { growth: number, tier: string } | null> {
    const apiKey = getNextAlphaVantageKey();
    if (!apiKey) return null;

    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
    const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

    try {
        const [overviewResponse, quoteResponse] = await Promise.all([
            fetch(url, { next: { revalidate: 300 } }), 
            fetch(quoteUrl, { next: { revalidate: 300 } })
        ]);
        if (!overviewResponse.ok || !quoteResponse.ok) return null;
        const overviewData = await overviewResponse.json();
        const quoteData = await quoteResponse.json();
        const globalQuote = quoteData['Global Quote'];
        if (overviewData.Symbol && globalQuote) {
            const growth = 50 + Math.random() * 50;
            return {
                symbol: overviewData.Symbol,
                name: overviewData.Name,
                sector: overviewData.Sector,
                fairPE: parseFloat(overviewData.PERatio) || 0,
                lastQuarterProfit: 0,
                growth: growth,
                tier: 'Tier 1'
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching details for ${symbol}:`, error);
        return null;
    }
}

export async function findStocks(screenerCriteria: string) {
    try {
        const localSymbols = findStocksFromLocalList(screenerCriteria);
        if (localSymbols.length === 0) {
            return { success: true, stocks: [] };
        }
        const stockPromises = localSymbols.map(symbol => fetchStockDetails(symbol));
        const fetchedStocks = await Promise.all(stockPromises);
        const validStocks = fetchedStocks.filter((s): s is Stock & { growth: number, tier: string } => s !== null);
        const sortedStocks = validStocks.sort((a, b) => b.growth - a.growth);
        return { success: true, stocks: sortedStocks };
    } catch (error) {
        console.error("Error in findStocks action:", error);
        return { success: false, error: 'Failed to screen stocks.' };
    }
}

export async function getStockAnalysis(stock: Stock, prompt: string, llm: string) {
    try {
        const ySymbol = normalizeSymbol(stock.symbol);
        const [quote, historical1Y, historical1M, summary] = await Promise.all([
            getQuote(stock.symbol),
            getHistoricalPrices(stock.symbol, 365),
            getHistoricalPrices(stock.symbol, 30),
            getQuoteSummary(stock.symbol, ['summaryDetail', 'financialData', 'defaultKeyStatistics', 'price']),
        ]);

        if (!quote) {
            return { success: false, error: 'Could not fetch live price data for analysis.' };
        }

        const prices1Y = historical1Y.map(d => d.price).filter(p => p > 0);
        const prices1M = historical1M.map(d => d.price).filter(p => p > 0);

        const high52W = Math.max(...prices1Y);
        const low52W = Math.min(...prices1Y);
        const currentPrice = quote.price;
        const from52WHigh = ((high52W - currentPrice) / high52W * 100);
        const from52WLow = ((currentPrice - low52W) / low52W * 100);

        const avg50 = prices1Y.length >= 50
            ? prices1Y.slice(-50).reduce((a, b) => a + b, 0) / 50
            : null;
        const avg200 = prices1Y.length >= 200
            ? prices1Y.slice(-200).reduce((a, b) => a + b, 0) / 200
            : null;

        const monthlyReturn1M = prices1M.length >= 2
            ? ((prices1M[prices1M.length - 1] - prices1M[0]) / prices1M[0]) * 100
            : null;
        const monthlyReturn6M = prices1Y.length >= 126
            ? ((prices1Y[prices1Y.length - 1] - prices1Y[prices1Y.length - 126]) / prices1Y[prices1Y.length - 126]) * 100
            : null;

        const summaryData = summary?.summaryDetail || {};
        const finData = summary?.financialData || {};
        const stats = summary?.defaultKeyStatistics || {};
        const priceData = summary?.price || {};

        const pe = finData?.trailingPE ?? summaryData?.trailingPE ?? 'N/A';
        const pb = stats?.priceToBook ?? 'N/A';
        const marketCap = summaryData?.marketCap?.fmt ?? 'N/A';
        const dividendYield = summaryData?.dividendYield?.fmt ?? 'N/A';
        const roe = stats?.returnOnEquity?.fmt ?? 'N/A';
        const debtToEquity = stats?.debtToEquity?.fmt ?? 'N/A';
        const profitMargins = finData?.profitMargins?.fmt ?? 'N/A';
        const revenueGrowth = finData?.revenueGrowth?.fmt ?? 'N/A';
        const targetPrice = finData?.targetMeanPrice?.fmt ?? 'N/A';
        const sector = priceData?.marketCap?.sector ?? stock.sector;
        const currency = quote.currency || 'USD';
        const name = quote.name || stock.name;

        const peNum = typeof pe === 'number' ? pe : parseFloat(String(pe).replace(',', ''));
        const peValuation = peNum && !isNaN(peNum)
            ? (peNum < 15 ? 'Undervalued (P/E < 15)' : peNum < 25 ? 'Fairly Valued (P/E 15-25)' : 'Premium Valuation (P/E > 25)')
            : 'P/E data unavailable';

        const positionInRange = high52W > low52W
            ? ((currentPrice - low52W) / (high52W - low52W) * 100).toFixed(1)
            : 'N/A';

        const analysts = targetPrice && targetPrice !== 'N/A' && currentPrice > 0
            ? (parseFloat(targetPrice.replace(/[^0-9.]/g, '')) > currentPrice ? 'Bullish' : 'Bearish')
            : 'No analyst data';

        const sections: string[] = [];

        sections.push(`## **${name} — Deep Dive Analysis**`);
        sections.push('');

        sections.push('### **1. Price Snapshot**');
        sections.push(`- **Current Price:** ${currency} ${currentPrice.toFixed(2)}`);
        sections.push(`- **Today's Change:** ${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)} (${quote.percentChange.toFixed(2)}%)`);
        sections.push(`- **52-Week Range:** ${currency} ${low52W.toFixed(2)} – ${currency} ${high52W.toFixed(2)}`);
        sections.push(`- **Position in 52-Week Range:** ${positionInRange}%`);
        sections.push(`- **Distance from 52W High:** ${from52WHigh.toFixed(1)}% below`);
        sections.push(`- **Distance from 52W Low:** ${from52WLow.toFixed(1)}% above`);
        if (avg50 !== null) {
            sections.push(`- **50-Day SMA:** ${currency} ${avg50.toFixed(2)} (${currentPrice > avg50 ? 'Above ⟹ Bullish' : 'Below ⟹ Bearish'})`);
        }
        if (avg200 !== null) {
            sections.push(`- **200-Day SMA:** ${currency} ${avg200.toFixed(2)} (${currentPrice > avg200 ? 'Above ⟹ Bullish' : 'Below ⟹ Bearish'})`);
        }
        sections.push('');

        sections.push('### **2. Valuation & Fundamentals**');
        sections.push(`- **P/E Ratio:** ${typeof pe === 'number' ? pe.toFixed(2) : pe}`);
        sections.push(`- **Valuation Signal:** ${peValuation}`);
        sections.push(`- **P/B Ratio:** ${pb !== 'N/A' ? pb : 'N/A'}`);
        sections.push(`- **Market Capitalization:** ${marketCap}`);
        sections.push(`- **Dividend Yield:** ${dividendYield}`);
        sections.push(`- **Profit Margins:** ${profitMargins}`);
        sections.push(`- **Revenue Growth:** ${revenueGrowth}`);
        sections.push(`- **Return on Equity (ROE):** ${roe}`);
        sections.push(`- **Debt-to-Equity:** ${debtToEquity}`);
        sections.push('');

        sections.push('### **3. Momentum & Trends**');
        if (monthlyReturn1M !== null) {
            sections.push(`- **1-Month Return:** ${monthlyReturn1M >= 0 ? '+' : ''}${monthlyReturn1M.toFixed(2)}%`);
        }
        if (monthlyReturn6M !== null) {
            sections.push(`- **6-Month Return:** ${monthlyReturn6M >= 0 ? '+' : ''}${monthlyReturn6M.toFixed(2)}%`);
        }
        sections.push(`- **Year-to-Date Change:** ${quote.percentChange >= 0 ? '+' : ''}${quote.percentChange.toFixed(2)}% (today)`);
        sections.push(`- **Sector:** ${sector}`);
        sections.push(`- **Analyst Sentiment:** ${analysts}`);
        if (targetPrice !== 'N/A') {
            sections.push(`- **Analyst Target Price:** ${currency} ${targetPrice}`);
            const upside = ((parseFloat(targetPrice.replace(/[^0-9.]/g, '')) / currentPrice) - 1) * 100;
            sections.push(`- **Upside/Downside to Target:** ${upside >= 0 ? '+' : ''}${upside.toFixed(1)}%`);
        }
        sections.push('');

        sections.push('### **4. Risk Assessment**');
        const risks: string[] = [];
        if (peNum && peNum > 30) risks.push('Elevated P/E ratio suggests premium pricing — any earnings miss could trigger sharp correction.');
        if (debtToEquity !== 'N/A') {
            const dte = parseFloat(String(debtToEquity).replace(/[^0-9.]/g, ''));
            if (dte > 1.5) risks.push(`High debt-to-equity (${dte.toFixed(2)}) increases financial risk.`);
        }
        if (profitMargins !== 'N/A') {
            const pm = parseFloat(String(profitMargins).replace('%', ''));
            if (pm < 5) risks.push(`Thin profit margins (${profitMargins}) leave little room for error.`);
        }
        if (from52WHigh < 5) risks.push('Trading very close to 52-week high — limited near-term upside potential.');
        if (risks.length === 0) {
            risks.push('No significant red flags detected from available data.');
        }
        risks.forEach(r => sections.push(`- ⚠️ ${r}`));
        sections.push('');

        sections.push('### **5. Summary & Verdict**');
        const bullishSignals = (currentPrice > (avg50 || 0) ? 1 : 0) + (currentPrice > (avg200 || 0) ? 1 : 0) + (monthlyReturn1M !== null && monthlyReturn1M > 0 ? 1 : 0);
        const bearishSignals = (currentPrice < (avg50 || Infinity) ? 1 : 0) + (currentPrice < (avg200 || Infinity) ? 1 : 0) + (monthlyReturn1M !== null && monthlyReturn1M < 0 ? 1 : 0);
        const signal = bullishSignals > bearishSignals ? 'BULLISH' : bearishSignals > bullishSignals ? 'BEARISH' : 'NEUTRAL';

        sections.push(`**Overall Signal: ${signal}**`);
        sections.push(`- Based on price action, valuation, and momentum indicators.`);
        if (analysts === 'Bullish') sections.push('- Wall Street analysts are bullish on this stock.');
        else if (analysts === 'Bearish') sections.push('- Wall Street analysts are bearish on this stock.');
        sections.push(`- ${peValuation}${peNum && peNum > 0 && peNum < stock.fairPE ? ' (below industry average P/E of ' + stock.fairPE + ')' : peNum && peNum > 0 && peNum > stock.fairPE ? ' (above industry average P/E of ' + stock.fairPE + ')' : ''}.`);
        sections.push('');

        sections.push('### **6. Investment Recommendation**');
        let ltScore = 0;
        if (peNum && !isNaN(peNum)) {
            if (peNum < stock.fairPE) ltScore += 2;
            else if (peNum < 30) ltScore += 1;
        }
        if (roe !== 'N/A') {
            const roeNum = parseFloat(String(roe).replace('%', ''));
            if (roeNum > 15) ltScore += 2;
            else if (roeNum > 10) ltScore += 1;
        }
        if (debtToEquity !== 'N/A') {
            const dteNum = parseFloat(String(debtToEquity).replace(/[^0-9.]/g, ''));
            if (dteNum < 0.5) ltScore += 2;
            else if (dteNum < 1.5) ltScore += 1;
        }
        if (profitMargins !== 'N/A') {
            const pmNum = parseFloat(String(profitMargins).replace('%', ''));
            if (pmNum > 15) ltScore += 2;
            else if (pmNum > 5) ltScore += 1;
        }
        if (revenueGrowth !== 'N/A') {
            const rgNum = parseFloat(String(revenueGrowth).replace('%', ''));
            if (rgNum > 0) ltScore += 1;
        }
        if (dividendYield !== 'N/A') {
            const dyNum = parseFloat(String(dividendYield).replace('%', ''));
            if (dyNum > 1) ltScore += 1;
        }

        let swingScore = 0;
        const posInRange = parseFloat(positionInRange);
        if (posInRange >= 30 && posInRange <= 70) swingScore += 2;
        if (monthlyReturn1M !== null && monthlyReturn1M > 0) swingScore += 2;
        if (currentPrice > (avg50 || 0)) swingScore += 2;
        if (currentPrice > (avg200 || 0)) swingScore += 1;
        if (from52WHigh > 5) swingScore += 1;

        const longTermVerdict = ltScore >= 7 ? 'STRONG BUY for 3-5 year hold' : ltScore >= 4 ? 'MODERATE BUY for 3-5 year hold' : 'NOT RECOMMENDED for long-term holding';
        const swingVerdict = swingScore >= 6 ? 'STRONG BUY for swing trading' : swingScore >= 3 ? 'MODERATE for swing trading' : 'NOT RECOMMENDED for swing trading';
        const buyNow = ltScore >= 4 || swingScore >= 3;

        sections.push(`**Long-Term (3-5 Years): ${longTermVerdict}** *(Score: ${ltScore}/10)*`);
        sections.push(`- ${ltScore >= 4 ? 'Fundamentals and valuation support a long-term position.' : 'Weak fundamentals or elevated valuation make long-term holding risky.'}`);
        sections.push('');
        sections.push(`**Swing Trading (1-3 Months): ${swingVerdict}** *(Score: ${swingScore}/8)*`);
        sections.push(`- ${swingScore >= 3 ? 'Technical indicators and momentum favor a swing trade.' : 'Technical setup is not favorable for short-term trades.'}`);
        sections.push('');
        sections.push(`**Overall Verdict:** ${buyNow ? '✅ Stock is worth considering for purchase at current levels.' : '❌ Stock is not recommended for buying at current levels. Wait for a better entry point.'}`);
        sections.push('');

        sections.push('---');
        sections.push('*Disclaimer: This analysis is generated from publicly available data (Yahoo Finance, company filings). It is not financial advice. Always do your own research before investing.*');

        const fullAnalysis = sections.join('\n');

        const shortRec = `${buyNow ? '✅ BUY' : '❌ AVOID'} — ${signal} on ${name} at ${currency}${currentPrice.toFixed(2)} | LT: ${longTermVerdict} | Swing: ${swingVerdict} | P/E ${typeof pe === 'number' ? pe.toFixed(1) : pe}`;

        return {
            success: true,
            analysis: {
                recommendation: shortRec,
                reasoning: fullAnalysis,
            },
        };
    } catch (error) {
        console.error('Error in getStockAnalysis:', error);
        return { success: false, error: 'Analysis failed due to an unexpected error.' };
    }
}

export default async function getPortfolioNews(stockSymbols: string[]) {
    if (!stockSymbols.length) return { success: true, news: [] };
    try {
        const seenTitles = new Set<string>();
        const allNews: NewsArticle[] = [];
        const symbolsToFetch = stockSymbols.slice(0, 5);
        for (const symbol of symbolsToFetch) {
            try {
                const stock = allStocks.find(s => s.symbol === symbol);
                const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=5`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                });
                if (!res.ok) continue;
                const data = await res.json();
                const newsItems = data?.news || [];
                const stockName = stock?.name || '';
                const stockTicker = query.split('.')[0].toLowerCase();
                for (const item of newsItems) {
                    const title = item.title || '';
                    const summary = item.summary || '';
                    const combined = (title + ' ' + summary).toLowerCase();
                    const isRelevant = stockName ? combined.includes(stockName.toLowerCase().split(' ')[0]) : combined.includes(stockTicker);
                    if (title && !seenTitles.has(title) && isRelevant) {
                        seenTitles.add(title);
                        allNews.push({
                            title,
                            source: item.publisher || 'Yahoo Finance',
                            summary,
                            link: item.link || '',
                            published: item.providerPublishTime
                                ? new Date(item.providerPublishTime * 1000).toISOString()
                                : new Date().toISOString(),
                        });
                    }
                }
            } catch { continue; }
        }
        return { success: true, news: allNews.slice(0, 15) };
    } catch (error) {
        console.error('Error fetching news:', error);
        return { success: false, error: 'Failed to fetch news.', news: [] };
    }
}
