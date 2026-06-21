
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, TrendingUp } from "lucide-react";
import type { Stock } from "@/types";
import React, { useEffect, useRef, useState } from 'react';

const dateRanges = ['1D', '5D', '1M', '3M', '6M', '1Y', '3Y', '5Y'];
const intervals: Record<string, string> = {
    '1D': '5',
    '5D': '15',
    '1M': '60',
    '3M': '1D',
    '6M': '1D',
    '1Y': '1D',
    '3Y': '1W',
    '5Y': '1W',
};

const mockIndicators = [
    { name: 'RSI (14)', value: '65.4', sentiment: 'Bullish' },
    { name: 'MACD', value: '12.3', sentiment: 'Bullish' },
    { name: '50-Day MA', value: '2850.00', sentiment: 'Neutral' },
    { name: '200-Day MA', value: '2700.00', sentiment: 'Neutral' },
    { name: 'Bollinger Bands', value: 'Upper: 3000, Lower: 2900', sentiment: 'Neutral' },
];

const getSentimentColor = (sentiment: 'Bullish' | 'Bearish' | 'Neutral') => {
    switch (sentiment) {
        case 'Bullish': return 'text-green-600';
        case 'Bearish': return 'text-red-600';
        default: return 'text-muted-foreground';
    }
};

export const TechnicalAnalysisChart = ({ stock }: { stock: Stock }) => {
    const container = useRef<HTMLDivElement>(null);
    const [range, setRange] = useState('1Y');
    const [error, setError] = useState(false);

    // Bare US ticker; TradingView resolves the listing exchange (NASDAQ/NYSE/...) itself.
    const tradingViewSymbol = stock.symbol;

    useEffect(() => {
        setError(false);
        if (container.current) {
            container.current.innerHTML = '';
            const script = document.createElement("script");
            script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
            script.type = "text/javascript";
            script.async = true;
            script.innerHTML = JSON.stringify({
                "autosize": true,
                "symbol": tradingViewSymbol,
                "interval": intervals[range] || '1D',
                "timezone": "Asia/Kolkata",
                "theme": "dark",
                "style": "1",
                "locale": "en",
                "allow_symbol_change": false,
                "hide_legend": false,
                "save_image": false,
                "hide_side_toolbar": true,
                "support_host": "https://www.tradingview.com"
            });
            script.onerror = () => setError(true);
            container.current.appendChild(script);
        }
    }, [tradingViewSymbol, range]);

    if (error) {
        return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Failed to load chart. Please check your internet connection and try again.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-1 flex-wrap">
                {dateRanges.map(r => (
                    <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-3 py-1 text-xs rounded transition-colors ${range === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >
                        {r}
                    </button>
                ))}
            </div>
            <div className="tradingview-widget-container" ref={container} style={{ height: "700px", width: "100%" }}>
                <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
                <div className="tradingview-widget-copyright">
                    <a href={`https://www.tradingview.com/symbols/${tradingViewSymbol}`} rel="noopener nofollow" target="_blank">
                        <span className="blue-text">Chart by TradingView</span>
                    </a>
                </div>
            </div>
            <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                    <TrendingUp size={16} />
                    Indicator Summary
                </h4>
                <div className="border rounded-lg text-xs">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="border p-2 bg-muted/50">Indicator</TableHead>
                                <TableHead className="border p-2 bg-muted/50">Value</TableHead>
                                <TableHead className="border p-2 bg-muted/50">Sentiment</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockIndicators.map((indicator) => (
                                <TableRow key={indicator.name}>
                                    <TableCell className="font-medium border p-2">{indicator.name}</TableCell>
                                    <TableCell className="border p-2">{indicator.value}</TableCell>
                                    <TableCell className={`font-semibold border p-2 ${getSentimentColor(indicator.sentiment)}`}>
                                        {indicator.sentiment}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export function TechnicalAnalysisCard({ stock }: { stock: Stock }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-baseline gap-2">
                    <CardTitle className="flex items-center gap-2 font-headline text-base">
                        <Activity className="text-primary" />
                        Technical Analysis
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Key technical indicators and price action for {stock.name}.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[460px]">
                    <TechnicalAnalysisChart stock={stock} />
                </div>
            </CardContent>
        </Card>
    );
}
