
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Stock } from '@/types';
import { US_STOCKS } from '@/lib/us-stocks';
import { ScreenerCard } from '@/components/research/screener-card';
import { ScreenerResultsCard } from '@/components/research/screener-results-card';
import { StockFinderCard } from '@/components/research/stock-finder-card';
import { CompanyDataCard } from '@/components/research/company-data-card';
import { AnalysisCard } from '@/components/research/analysis-card';
import { AiProvidersCard } from '@/components/research/ai-providers-card';

import { WatchlistCard } from '@/components/research/watchlist-card';
import { FinancialCalculatorsCard } from './research/financial-calculators-card';
import { WorldMarketOverview } from './research/world-market-overview';
import { useToast } from '@/hooks/use-toast';
import { Plus, Check, X } from 'lucide-react';

const allStocks: Stock[] = US_STOCKS;

const defaultStock: Stock = allStocks[0];

function ContextMenu({ 
    x, 
    y, 
    stock, 
    onAddToWatchlist, 
    onClose 
}: { 
    x: number; 
    y: number; 
    stock: Stock; 
    onAddToWatchlist: () => void; 
    onClose: () => void; 
}) {
    return (
        <div
            className="fixed z-50 bg-card border shadow-lg rounded-md p-1 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-100"
            style={{ left: x, top: y }}
            onContextMenu={e => e.preventDefault()}
        >
            <div className="px-3 py-2 text-xs text-muted-foreground border-b">Smart Watchlist</div>
            <button
                onClick={() => { onAddToWatchlist(); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors text-left"
            >
                <Plus size={14} className="text-primary" />
                Add "{stock.name}" to Watchlist
            </button>
            <button
                onClick={onClose}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors text-left"
            >
                <X size={14} className="text-muted-foreground" />
                Cancel
            </button>
        </div>
    );
}

export function ResearchDashboard({ userId }: { userId: string }) {
    const [selectedStock, setSelectedStock] = useState<Stock | null>(defaultStock);
    const [foundStocks, setFoundStocks] = useState<Stock[]>([]);
    const [screenerCriteria, setScreenerCriteria] = useState('');
    const [stocksToProcess, setStocksToProcess] = useState<Stock[]>([]);
    const [prosCons, setProsCons] = useState<{ pros: string[], cons: string[] }>({ pros: [], cons: [] });
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const { toast } = useToast();
    const dashboardRef = useRef<HTMLDivElement>(null);

    const handleSetFoundStocks = useCallback((stocks: Stock[]) => {
        setFoundStocks(stocks);
    }, []);

    const handleStockSelection = (stock: Stock) => {
        setSelectedStock(stock);
    }

    const handleAnalyzeStock = (stock: Stock) => {
        setSelectedStock(stock);
        setStocksToProcess(prev => {
            if (prev.find(s => s.symbol === stock.symbol)) return prev;
            return [...prev, stock];
        });
    }

    const handleManualStockSelection = (stockName: string) => {
        const lower = stockName.toLowerCase();
        const foundStock = allStocks.find(s => s.name.toLowerCase().includes(lower) || s.symbol.toLowerCase().includes(lower));
        if (foundStock) {
            setSelectedStock(foundStock);
            toast({ title: "Stock Found", description: `Displaying data for ${foundStock.name}.` });
        } else {
            toast({ title: "Stock Not Found", description: `Could not find a stock named "${stockName}" in the local list.`, variant: "destructive" });
        }
    };

    const handleAddToWatchlist = useCallback(() => {
        if (!selectedStock || !userId) return;
        
        try {
            const savedWatchlist = localStorage.getItem(`smartWatchlist_${userId}`);
            const watchlist = savedWatchlist ? JSON.parse(savedWatchlist) : [];
            
            if (watchlist.find((s: any) => s.symbol === selectedStock.symbol)) {
                toast({ title: "Already in Watchlist", description: `${selectedStock.name} is already in your Smart Watchlist.` });
                return;
            }
            
            const newEntry = {
                id: Date.now().toString(),
                symbol: selectedStock.symbol,
                name: selectedStock.name,
                price: 0,
                pe: 0,
                date: new Date().toISOString().split('T')[0],
            };
            
            const updated = [...watchlist, newEntry];
            localStorage.setItem(`smartWatchlist_${userId}`, JSON.stringify(updated));
            toast({ title: "Added to Watchlist", description: `${selectedStock.name} added to Smart Watchlist.` });
            
            // Trigger storage event to update WatchlistCard
            window.dispatchEvent(new Event('storage'));
        } catch (error) {
            console.error("Failed to add to watchlist:", error);
            toast({ title: "Error", description: "Failed to add to watchlist.", variant: "destructive" });
        }
    }, [selectedStock, userId, toast]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        if (!selectedStock) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
    }, [selectedStock]);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
        <div 
            ref={dashboardRef}
            className="space-y-6"
            onContextMenu={handleContextMenu}
        >
            <WorldMarketOverview />
            <div className="space-y-6">
                 <ScreenerCard onFindStocks={setScreenerCriteria} userId={userId} />
                 <ScreenerResultsCard
                    screenerCriteria={screenerCriteria}
                    onStockSelect={handleAnalyzeStock}
                    userId={userId}
                />
                <StockFinderCard 
                    screenerCriteria={screenerCriteria} 
                    stocksToProcess={stocksToProcess}
                    onStockSelect={handleStockSelection}
                    setFoundStocks={handleSetFoundStocks}
                    userId={userId}
                />
            </div>

            {selectedStock && (
                 <div className="space-y-6 animate-in fade-in duration-500">
                     <div className="space-y-6">
                        <CompanyDataCard 
                            stock={selectedStock} 
                            userId={userId}
                            onProsConsData={setProsCons}
                            onStockSelect={handleManualStockSelection}
                        />
                        <AnalysisCard stock={selectedStock} userId={userId} />
                    </div>
                    <div className="space-y-6">
                        <WatchlistCard onStockSelect={handleStockSelection} userId={userId} />
                        <FinancialCalculatorsCard stock={selectedStock} userId={userId} />
                    </div>
                </div>
            )}

            <AiProvidersCard />

            {contextMenu && selectedStock && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    stock={selectedStock}
                    onAddToWatchlist={handleAddToWatchlist}
                    onClose={handleCloseContextMenu}
                />
            )}
        </div>
    );
}
