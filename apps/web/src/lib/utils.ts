import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Stock } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fallback function to find stocks from the local list if AI returns none.
export function findStocksFromLocalList(screenerCriteria: string, allStocks: Stock[]): string[] {
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

export function addToSmartWatchlist(stockName: string, userId: string, pe?: number) {
    const key = `smartWatchlist_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (!existing.some((s: { name: string }) => s.name === stockName)) {
        existing.push({
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            name: stockName,
            price: 0,
            pe: pe || 0
        });
        localStorage.setItem(key, JSON.stringify(existing));
        return true;
    }
    return false;
}
