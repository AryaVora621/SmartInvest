'use server';

// Live evaluation of watchlist alert rules. Takes the user's configured AlertConfigs,
// fetches one batched Yahoo quote for the distinct symbols, and returns the rules that
// currently fire. Price-action and 52-week rules are evaluable from a quote; valuation /
// technical / news rules are not (yet) and are reported as unsupported rather than faked.

import YahooFinance from 'yahoo-finance2';
import { US_STOCKS } from '@/lib/us-stocks';
import type { AlertConfig } from '@/types';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface TriggeredAlert {
  stockName: string;
  symbol: string;
  threshold: string;
  message: string;
  price: number;
  via: ('email' | 'telegram')[];
}

// Resolve a watchlist name (or raw ticker) to a US symbol.
function symbolFor(name: string): string | null {
  const lower = name.trim().toLowerCase();
  const match = US_STOCKS.find(
    s => s.name.toLowerCase().includes(lower) || s.symbol.toLowerCase() === lower,
  );
  if (match) return match.symbol;
  const upper = name.trim().toUpperCase();
  return /^[A-Z.]{1,6}$/.test(upper) ? upper : null;
}

function evaluateRule(threshold: string, q: any): { hit: boolean; message: string } | null {
  const price = q.regularMarketPrice;
  const chg = q.regularMarketChangePercent; // today's % move
  const hi = q.fiftyTwoWeekHigh;
  const lo = q.fiftyTwoWeekLow;
  const t = threshold.toLowerCase();

  if (t.includes('price gain')) return { hit: chg >= 10, message: `up ${chg?.toFixed(1)}% today` };
  if (t.includes('price loss')) return { hit: chg <= -10, message: `down ${chg?.toFixed(1)}% today` };
  if (t.includes('near 52')) return { hit: !!hi && price >= 0.95 * hi, message: `within 5% of the 52-week high ($${hi?.toFixed(2)})` };
  // No true all-time series from a quote; the 52-week high is the honest proxy.
  if (t.includes('all time high') && !t.includes('down')) return { hit: !!hi && price >= hi * 0.999, message: `at a 52-week high ($${price?.toFixed(2)})` };
  if (t.includes('down from all time')) return { hit: !!hi && price <= 0.85 * hi, message: `15%+ below the 52-week high ($${hi?.toFixed(2)})` };
  if (t.includes('near 52') === false && t.includes('52 week low')) return { hit: !!lo && price <= 1.05 * lo, message: `within 5% of the 52-week low ($${lo?.toFixed(2)})` };

  // Valuation / technical / news rules need data a quote doesn't carry.
  return null;
}

export async function evaluateAlerts(configs: AlertConfig[]): Promise<TriggeredAlert[]> {
  if (!configs?.length) return [];

  // distinct symbols -> one batched quote call
  const symbolByConfig = configs.map(c => symbolFor(c.stockName));
  const symbols = Array.from(new Set(symbolByConfig.filter((s): s is string => !!s)));
  if (!symbols.length) return [];

  let quotes: any[] = [];
  try {
    // quote(): validation flags belong in the THIRD arg (moduleOptions); the second is
    // QuoteOptions and rejects unknown keys.
    const res = await yf.quote(symbols, undefined, { validateResult: false } as any);
    quotes = Array.isArray(res) ? res : [res];
  } catch (e) {
    console.error('Alert quote fetch failed:', (e as Error).message);
    return [];
  }
  const bySymbol = new Map<string, any>(quotes.map(q => [q.symbol, q]));

  const triggered: TriggeredAlert[] = [];
  configs.forEach((c, i) => {
    const sym = symbolByConfig[i];
    if (!sym) return;
    const q = bySymbol.get(sym);
    if (!q || q.regularMarketPrice == null) return;
    const result = evaluateRule(c.threshold, q);
    if (result?.hit) {
      const via: ('email' | 'telegram')[] = [];
      if (c.email) via.push('email');
      if (c.telegram) via.push('telegram');
      triggered.push({
        stockName: c.stockName,
        symbol: sym,
        threshold: c.threshold,
        message: `${c.stockName} ${result.message}.`,
        price: q.regularMarketPrice,
        via,
      });
    }
  });
  return triggered;
}
