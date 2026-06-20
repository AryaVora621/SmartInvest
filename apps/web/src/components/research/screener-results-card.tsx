'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ListFilter, Loader2, Search, ChevronRight, EyeOff, Eye } from "lucide-react";
import type { Stock } from '@/types';
import { findStocksFromLocalList } from '@/lib/utils';
import { US_STOCKS } from '@/lib/us-stocks';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";

const allStocks: Stock[] = US_STOCKS;

export function ScreenerResultsCard({ screenerCriteria, onStockSelect, userId }: { screenerCriteria: string, onStockSelect: (stock: Stock) => void, userId: string }) {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showData, setShowData] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (screenerCriteria) {
            setIsLoading(true);
            const results = findStocksFromLocalList(screenerCriteria, allStocks);
            const matched = allStocks.filter(s => results.includes(s.symbol));
            setStocks(matched);
            setIsLoading(false);
            if (matched.length > 0) setShowData(true);
        } else {
            setStocks([]);
        }
    }, [screenerCriteria]);

    const handleAddToWatchlist = (stock: Stock) => {
        const newStock = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            name: stock.name,
            price: 0,
            pe: stock.fairPE || 0
        };
        try {
            const existingWatchlist = localStorage.getItem(`smartWatchlist_${userId}`);
            const watchlist = existingWatchlist ? JSON.parse(existingWatchlist) : [];
            watchlist.push(newStock);
            localStorage.setItem(`smartWatchlist_${userId}`, JSON.stringify(watchlist));
            toast({ title: "Added to Watchlist", description: `${stock.name} has been added to your Smart Watchlist.` });
            window.dispatchEvent(new Event('storage'));
        } catch {
            toast({ title: "Error", description: "Could not add stock to watchlist.", variant: "destructive" });
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className={!showData ? 'pb-2' : ''}>
                <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                        <CardTitle className="flex items-center gap-2 font-headline text-base">
                            <Search className="text-primary" />
                            Stock as per Screener
                        </CardTitle>
                        <CardDescription className="text-xs">Stocks matching the selected screener criteria from the local list.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowData(!showData)} className="h-6 px-2 text-xs text-white">
                        {showData ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                </div>
            </CardHeader>
            {showData && (
            <CardContent className="flex-grow">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Loader2 className="animate-spin h-8 w-8 mb-2" />
                        <p className="text-sm">Matching stocks...</p>
                    </div>
                )}
                {!isLoading && !screenerCriteria && (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <ListFilter className="h-8 w-8 mb-2" />
                        <p className="text-sm">No screener selected.</p>
                        <p className="text-xs">Select a screener and click Find Stocks.</p>
                    </div>
                )}
                {!isLoading && screenerCriteria && stocks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Search className="h-8 w-8 mb-2" />
                        <p className="text-sm">No matching stocks found.</p>
                        <p className="text-xs">Try a different screener.</p>
                    </div>
                )}
                {!isLoading && stocks.length > 0 && (
                    <ScrollArea className="h-60">
                        <div className="space-y-2 pr-4">
                            {stocks.map((stock) => (
                                <ContextMenu key={stock.symbol}>
                                    <ContextMenuTrigger>
                                        <div
                                            className="flex items-center p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors border"
                                            onClick={() => onStockSelect(stock)}
                                        >
                                            <div className="w-2 h-10 rounded-l-lg mr-3 bg-primary/60" />
                                            <div className="flex-grow">
                                                <p className="font-bold text-sm">{stock.name}</p>
                                                <p className="text-xs text-muted-foreground">{stock.sector}</p>
                                            </div>
                                            <div className="flex items-center gap-2 text-right">
                                                <span className="text-xs text-muted-foreground">{stock.symbol}</span>
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
            )}
        </Card>
    );
}
