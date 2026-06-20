'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { Globe, TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button";

type MarketItem = {
    name: string;
    value: string;
    change: string;
    percent: string;
    up: boolean;
};

const marketSymbols: { name: string; symbol: string }[] = [
    { name: 'BSE INDEX', symbol: '^BSESN' },
    { name: 'NASDAQ', symbol: '^IXIC' },
    { name: 'LONDON FTSE', symbol: '^FTSE' },
    { name: 'NIKKEI', symbol: '^N225' },
    { name: 'SHANGHAI', symbol: '000001.SS' },
    { name: 'NSE NIFTY', symbol: '^NSEI' },
    { name: 'NYSE', symbol: '^NYA' },
    { name: 'CRUDE OIL', symbol: 'CL=F' },
    { name: 'GOLD', symbol: 'GC=F' },
];

async function fetchYahooQuote(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
    try {
        const res = await fetch(`/api/yahoo-quote?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) return null;
        const meta = result.meta;
        const closes = result.indicators?.quote?.[0]?.close;
        if (!meta || !closes) return null;
        const price = meta.regularMarketPrice;
        const prevClose = closes.filter((c: number | null) => c !== null).slice(-2)[0];
        if (!price || !prevClose) return null;
        const change = price - prevClose;
        const changePercent = (change / prevClose) * 100;
        return { price, change, changePercent };
    } catch {
        return null;
    }
}

async function fetchExchangeRate(): Promise<number | null> {
    try {
        const res = await fetch('/api/yahoo-quote?symbol=USDINR%3DX');
        const data = await res.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        return price || null;
    } catch {
        return null;
    }
}

const formatValue = (price: number, isUsd: boolean) => {
    return (isUsd ? '$' : '₹') + price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

export function WorldMarketOverview() {
    const [marketData, setMarketData] = useState<Map<string, MarketItem>>(new Map());
    const [exchangeRate, setExchangeRate] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showData, setShowData] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        const results = await Promise.all(marketSymbols.map(async (m) => {
            const quote = await fetchYahooQuote(m.symbol);
            if (quote) {
                const up = quote.change >= 0;
                return [m.name, {
                    name: m.name,
                    value: formatValue(quote.price, m.name !== 'BSE INDEX' && m.name !== 'NSE NIFTY'),
                    change: quote.change.toFixed(2),
                    percent: quote.changePercent.toFixed(2) + '%',
                    up,
                }] as [string, MarketItem];
            }
            return null;
        }));
        const newMap = new Map<string, MarketItem>();
        results.filter(Boolean).forEach((r) => {
            if (r) newMap.set(r[0], r[1]);
        });
        setMarketData(newMap);
        const rate = await fetchExchangeRate();
        if (rate) setExchangeRate(rate);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const topRowOrder = ['BSE INDEX', 'NASDAQ', 'LONDON FTSE', 'NIKKEI', 'SHANGHAI'];
    const bottomRowOrder = ['NSE NIFTY', 'NYSE', 'CRUDE OIL', 'GOLD'];

    const renderCard = (assetName: string) => {
        if (assetName === '1 US Dollar Equals') {
            return (
                <Card key={assetName} className="p-2 flex flex-col justify-center text-center h-20">
                    <p className="text-muted-foreground uppercase truncate text-xs">USD/INR</p>
                    {exchangeRate !== null ? (
                        <>
                            <p className="font-bold my-1 text-xs">{exchangeRate.toFixed(2)}</p>
                            <p className="text-muted-foreground text-xs">Indian Rupee</p>
                        </>
                    ) : (
                        <p className="font-bold my-1 text-muted-foreground text-xs">—</p>
                    )}
                </Card>
            );
        }

        const item = marketData.get(assetName);
        return (
            <Card key={assetName} className="p-2 flex flex-col justify-center text-center h-20">
                <p className="text-muted-foreground uppercase truncate text-xs">{assetName}</p>
                {item ? (
                    <>
                        <p className="font-bold my-1 text-xs">{item.value}</p>
                        <div className={cn('flex items-center justify-center gap-1 font-semibold text-xs', item.up ? 'text-green-500' : 'text-red-500')}>
                            {item.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <span>{item.change} ({item.percent})</span>
                        </div>
                    </>
                ) : (
                    <p className="font-bold my-1 text-muted-foreground text-xs">—</p>
                )}
            </Card>
        );
    };

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-background text-foreground">
                <div className="flex items-center gap-1">
                    <Globe size={16} />
                    <h3 className="font-semibold text-xs">World Market Overview</h3>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-xs text-white">{dateStr}</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowData(!showData)} className="h-6 px-2 text-xs text-white">
                        {showData ? <EyeOff size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
                        {showData ? 'Hide' : 'Show'}
                    </Button>
                </div>
            </div>

            {isLoading && marketData.size === 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {Array(9).fill(0).map((_, i) => (
                        <Card key={i} className="p-2 flex flex-col justify-center items-center text-center h-20">
                            <div className="animate-pulse bg-muted rounded h-2 w-12 mb-1" />
                            <div className="animate-pulse bg-muted rounded h-2 w-16 mb-1" />
                            <div className="animate-pulse bg-muted rounded h-2 w-10" />
                        </Card>
                    ))}
                </div>
            )}

            {showData && marketData.size > 0 && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {topRowOrder.map(renderCard)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {bottomRowOrder.map(renderCard)}
                        {renderCard('1 US Dollar Equals')}
                    </div>
                </>
            )}
        </div>
    );
}
