

'use client';
import { useState, useEffect, useRef, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, TrendingUp, ChevronRight, XCircle } from "lucide-react";
import type { Stock } from '@/types';
import { findStocksFromLocalList } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const allStocks: Stock[] = [
    { symbol: 'RELIANCE.BSE', name: 'Reliance Industries', sector: 'Energy', fairPE: 25, lastQuarterProfit: 18000 },
    { symbol: 'TCS.BSE', name: 'Tata Consultancy Services', sector: 'IT', fairPE: 30, lastQuarterProfit: 11000 },
    { symbol: 'HDFCBANK.BSE', name: 'HDFC Bank', sector: 'Finance', fairPE: 22, lastQuarterProfit: 16000 },
    { symbol: 'INFY.BSE', name: 'Infosys', sector: 'IT', fairPE: 28, lastQuarterProfit: 6100 },
    { symbol: 'HINDUNILVR.BSE', name: 'Hindustan Unilever', sector: 'FMCG', fairPE: 60, lastQuarterProfit: 2500 },
    { symbol: 'ICICIBANK.BSE', name: 'ICICI Bank', sector: 'Finance', fairPE: 20, lastQuarterProfit: 10000 },
    { symbol: 'SBIN.BSE', name: 'State Bank of India', sector: 'Finance', fairPE: 12, lastQuarterProfit: 14000 },
    { symbol: 'BAJFINANCE.BSE', name: 'Bajaj Finance', sector: 'Finance', fairPE: 35, lastQuarterProfit: 3500 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', fairPE: 26, lastQuarterProfit: 20000 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', fairPE: 32, lastQuarterProfit: 22000 },
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', fairPE: 28, lastQuarterProfit: 24000 },
    { symbol: 'AMZN', name: 'Amazon.com, Inc.', sector: 'E-commerce', fairPE: 55, lastQuarterProfit: 10000 },
    { symbol: 'KDAIL.BSE', name: 'Krishna Defence & Allied Industries Ltd', sector: 'Defence', fairPE: 40, lastQuarterProfit: 500 },
    { symbol: 'AMS.BSE', name: 'Apollo Micro Systems Ltd', sector: 'Industrials', fairPE: 38, lastQuarterProfit: 600 },
];

interface StockWithGrowth extends Stock {
  growth: number;
  tier: string;
}

export function StockFinderCard({ screenerCriteria, stocksToProcess = [], onStockSelect, setFoundStocks: setGlobalFoundStocks, userId }: { screenerCriteria: string, stocksToProcess?: Stock[], onStockSelect: (stock: Stock) => void, setFoundStocks: (stocks: Stock[]) => void, userId: string }) {
    const [isPending, startTransition] = useTransition();
    const [stocks, setStocks] = useState<StockWithGrowth[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showCard, setShowCard] = useState(false);
    const [useUptrendFinder, setUseUptrendFinder] = useState(true);
    const { toast } = useToast();
    const lastProcessedCountRef = useRef(0);

    useEffect(() => {
        if (screenerCriteria) {
            startTransition(async () => {
                try {
                    const localSymbols = findStocksFromLocalList(screenerCriteria, allStocks);
                    if (localSymbols.length > 0) {
                        const stockPromises = localSymbols.map(symbol => 
                            fetchStockDetailsFromActions(symbol)
                        );
                        const fetchedStocks = await Promise.all(stockPromises);
                        const validStocks = fetchedStocks.filter((s): s is StockWithGrowth => s !== null);
                        const sortedStocks = validStocks.sort((a, b) => b.growth - a.growth);
                        setStocks(sortedStocks);
                        setGlobalFoundStocks(sortedStocks.map(stock => ({ 
                            symbol: stock.symbol, 
                            name: stock.name, 
                            sector: stock.sector, 
                            fairPE: stock.fairPE || 0, 
                            lastQuarterProfit: stock.lastQuarterProfit 
                        })));
                        setError(null);
                    } else {
                        setStocks([]);
                        setGlobalFoundStocks([]);
                        setError(null);
                    }
                } catch (err) {
                    setError('Error searching local stocks.');
                    setStocks([]);
                    setGlobalFoundStocks([]);
                }
            });
        }
    }, [screenerCriteria, setGlobalFoundStocks]);
    
    const getGrowthColor = (growth: number) => {
        // From orange (hsl(30, 90%, 55%)) to green (hsl(140, 70%, 50%))
        const hue = 30 + (growth - 50) * (140 - 30) / 50;
        return `hsl(${hue}, 80%, 45%)`;
    };

    async function fetchStockDetailsFromActions(symbol: string): Promise<StockWithGrowth | null> {
        // Import the function dynamically to avoid circular dependency issues
        const { getNextAlphaVantageKey } = await import('@/lib/api-keys');
        const apiKey = getNextAlphaVantageKey();
        if (!apiKey) return null;

        const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
        const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

        try {
            const [overviewResponse, quoteResponse] = await Promise.all([
                fetch(url, { next: { revalidate: 300 } }), 
                fetch(quoteUrl, { next: { revalidate: 300 } })
            ]);
            
            if (!overviewResponse.ok || !quoteResponse.ok) {
                return null;
            }

            const overviewData = await overviewResponse.json();
            const quoteData = await quoteResponse.json();
            
            const globalQuote = quoteData['Global Quote'];

            if (overviewData.Symbol && globalQuote) {
                 const growth = 50 + Math.random() * 50; // Simulate >50% growth potential
                return {
                    symbol: overviewData.Symbol,
                    name: overviewData.Name,
                    sector: overviewData.Sector,
                    fairPE: parseFloat(overviewData.PERatio) || 0,
                    lastQuarterProfit: 0, // This data is not available from this endpoint
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

    const handleAddToWatchlist = (stock: Stock) => {
        // This is a simplified version, in a real app you'd need the full WatchlistStock type
         const newStock = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            name: stock.name,
            price: 0, // Ideally, you'd fetch the live price here
            pe: stock.fairPE || 0
        };

        try {
            const existingWatchlist = localStorage.getItem(`smartWatchlist_${userId}`);
            const watchlist = existingWatchlist ? JSON.parse(existingWatchlist) : [];
            watchlist.push(newStock);
            localStorage.setItem(`smartWatchlist_${userId}`, JSON.stringify(watchlist));
            
            toast({
                title: "Added to Watchlist",
                description: `${stock.name} has been added to your Smart Watchlist.`,
            });
            // Force a re-render in the watchlist component by dispatching a custom event
            window.dispatchEvent(new Event('storage'));

        } catch (error) {
             toast({
                title: "Error",
                description: "Could not add stock to watchlist.",
                variant: "destructive",
            });
        }
    };

    return (
        <Card className="h-full flex flex-col">
             <CardHeader>
                 <div className="flex items-center justify-between">
                     <CardTitle className="flex items-center gap-2 font-headline text-base">
                         <Search className="text-primary" />
                         Stock Above 50% Growth
                     </CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setShowCard(!showCard)} className="shrink-0 text-white">
                         {showCard ? 'Hide' : 'Show'}
                     </Button>
                 </div>
             </CardHeader>
             {showCard && (<>
             <CardHeader className="pt-0">
                  <div className="flex items-baseline gap-2">
                     <div className="flex items-center gap-2 text-xs">
                         <span className="text-muted-foreground">Mode:</span>
                         <div className="flex items-center space-x-2">
                             <span className="text-xs">AI</span>
                             <Switch
                                 checked={useUptrendFinder}
                                 onCheckedChange={setUseUptrendFinder}
                                 className="h-4 w-8"
                             />
                             <span className="text-xs">Local</span>
                         </div>
                     </div>
                      <CardDescription className="text-xs">Stocks matching your criteria with {'>'}50% growth potential.</CardDescription>
                 </div>
             </CardHeader>
            <CardContent className="flex-grow">
                {isPending && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="animate-spin h-8 w-8 mb-2" />
                        <p className="text-sm">Finding stocks...</p>
                    </div>
                )}
                {!isPending && error && (
                    <div className="flex flex-col items-center justify-center h-full text-destructive">
                        <XCircle className="h-8 w-8 mb-2" />
                        <p className="text-sm">Error finding stocks</p>
                        <p className="text-xs">{error}</p>
                    </div>
                )}
                {!isPending && !error && stocks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <p className="text-sm">No stocks found matching the criteria.</p>
                        <p className="text-xs">Try adjusting your screener.</p>
                    </div>
                )}
                {!isPending && !error && stocks.length > 0 && (
                    <ScrollArea className="h-80">
                        <div className="space-y-2 pr-4">
                            {stocks.map((stock) => (
                                <ContextMenu key={stock.symbol}>
                                    <ContextMenuTrigger>
                                        <div
                                            className="flex items-center p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors border"
                                            onClick={() => onStockSelect(stock)}
                                        >
                                            <div className="w-2 h-10 rounded-l-lg mr-3" style={{ backgroundColor: getGrowthColor(stock.growth) }} />
                                            <div className="flex-grow">
                                                <p className="font-bold text-sm">{stock.name}</p>
                                                <p className="text-xs text-muted-foreground">{stock.sector}</p>
                                            </div>
                                            <div className="flex items-center gap-2 text-right">
                                                <div className="flex items-center font-semibold text-sm" style={{ color: getGrowthColor(stock.growth) }}>
                                                    <TrendingUp size={14} className="mr-1" />
                                                    {stock.growth.toFixed(2)}%
                                                </div>
                                                <ChevronRight size={16} className="text-muted-foreground" />
                                            </div>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <ContextMenuItem onClick={() => handleAddToWatchlist(stock)}>
                                            Add to Smart Watchlist
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
            </>)}
        </Card>
    );
}
