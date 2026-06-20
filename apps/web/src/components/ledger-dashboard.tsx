

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Transaction, Ledger } from "@/types";
import { Download, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn, addToSmartWatchlist } from '@/lib/utils';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';

const SectionCard = ({ title, description, children }: { title: string, description?: string, children: React.ReactNode }) => (
    <Card className="shadow-md">
        <CardHeader>
            <div className="flex items-baseline gap-2">
                <CardTitle className="font-headline text-base">{title}</CardTitle>
                {description && <CardDescription className="text-xs">{description}</CardDescription>}
            </div>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
);

export function LedgerDashboard({ transactions, userId }: { transactions: Transaction[], userId: string }) {
    const [selectedStock, setSelectedStock] = useState<string>('all');
    const [financialYears, setFinancialYears] = useState<string[]>([]);
    const [selectedFy, setSelectedFy] = useState<string>('');
    const [personalEntries, setPersonalEntries] = useState<any[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        const saved = localStorage.getItem('personalAcEntries');
        if (saved) setPersonalEntries(JSON.parse(saved));
        const handleStorage = () => {
            const updated = localStorage.getItem('personalAcEntries');
            if (updated) setPersonalEntries(JSON.parse(updated));
        };
        window.addEventListener('storage', handleStorage);
        const interval = setInterval(handleStorage, 2000);
        return () => {
            window.removeEventListener('storage', handleStorage);
            clearInterval(interval);
        };
    }, []);


    useEffect(() => {
        if (transactions.length > 0) {
            const years = new Set(transactions.map(tx => {
                const date = new Date(tx.date);
                const year = date.getFullYear();
                const month = date.getMonth();
                // Financial year is from April to March
                return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
            }));
            const sortedYears = Array.from(years).sort().reverse();
            const currentFy = sortedYears[0] || '';
            setFinancialYears(['All Time', ...sortedYears]);
            setSelectedFy('All Time');
        } else {
             setFinancialYears(['All Time']);
             setSelectedFy('All Time');
        }
    }, [transactions]);

    const handleExport = () => {
        if (!selectedFy) {
            toast({
                title: 'Cannot Export Brocker\'s A/C',
                description: 'Please select a financial period first.',
                variant: 'destructive',
            });
            return;
        }

        let transactionsToExport: Transaction[];

        if (selectedFy === 'All Time') {
            transactionsToExport = [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else {
            const [startYear, endYear] = selectedFy.split('-').map(Number);
            const startDate = new Date(`${startYear}-04-01`);
            const endDate = new Date(`${endYear}-03-31`);

            transactionsToExport = transactions.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= startDate && txDate <= endDate;
            }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        
        if (transactionsToExport.length === 0) {
             toast({
                title: 'No Data to Export',
                description: `There are no transactions in the period ${selectedFy}.`,
            });
            return;
        }

        const headers = ["Date", "Stock Name", "Buy Qty", "Buy Price", "Buy Amount", "Sell Qty", "Sell Price", "Sell Amount"];
        const csvRows = [headers.join(',')];

        transactionsToExport.forEach(tx => {
            const amount = tx.quantity * tx.price;
            let row;
            if (tx.type === 'buy') {
                row = [
                    tx.date,
                    `"${tx.stockName}"`,
                    tx.quantity,
                    tx.price,
                    amount,
                    '', '', ''
                ];
            } else { // sell
                 row = [
                    tx.date,
                    `"${tx.stockName}"`,
                     '', '', '',
                    tx.quantity,
                    tx.price,
                    amount
                ];
            }
            csvRows.push(row.join(','));
        });
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            const filename = selectedFy === 'All Time' ? 'ledger-all-time.csv' : `ledger-fy-${selectedFy}.csv`;
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({
                title: 'Export Complete',
                description: `Brocker's A/C for ${selectedFy} has been downloaded.`,
            });
        }
    };


    const ledgers = useMemo(() => {
        const stockLedgers: { [key: string]: Ledger } = {};

        transactions.forEach(tx => {
            const key = tx.stockName.toLowerCase().trim();
            if (!stockLedgers[key]) {
                stockLedgers[key] = {
                    stockName: tx.stockName,
                    stockSymbol: tx.stockSymbol,
                    buyAmount: 0,
                    sellAmount: 0,
                    balanceAmount: 0,
                    buyQuantity: 0,
                    sellQuantity: 0,
                    balanceQuantity: 0,
                };
            }
            const ledger = stockLedgers[key];
            const amount = tx.quantity * tx.price;

            if (tx.type === 'buy') {
                ledger.buyAmount += amount;
                ledger.buyQuantity += tx.quantity;
            } else {
                ledger.sellAmount += amount;
                ledger.sellQuantity += tx.quantity;
            }
        });

        Object.values(stockLedgers).forEach(ledger => {
            ledger.balanceAmount = ledger.buyAmount - ledger.sellAmount;
            ledger.balanceQuantity = ledger.buyQuantity - ledger.sellQuantity;
        });

        return Object.values(stockLedgers).sort((a, b) => a.stockName.localeCompare(b.stockName));
    }, [transactions]);
    
    const uniqueStocks = useMemo(() => {
        const stockSet = new Set(transactions.map(t => t.stockName));
        return Array.from(stockSet).sort((a,b) => a.localeCompare(b));
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        if(selectedStock === 'all') return [];
        return transactions.filter(tx => tx.stockName === selectedStock).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions, selectedStock]);

    const detailedLedgerSummary = useMemo(() => {
        if (filteredTransactions.length === 0) return { balanceQuantity: 0, balanceAmount: 0 };
        
        let buyQuantity = 0;
        let sellQuantity = 0;
        let buyAmount = 0;
        let sellAmount = 0;

        filteredTransactions.forEach(tx => {
            const amount = tx.quantity * tx.price;
            if (tx.type === 'buy') {
                buyAmount += amount;
                buyQuantity += tx.quantity;
            } else {
                sellAmount += amount;
                sellQuantity += tx.quantity;
            }
        });
        
        const balanceQuantity = buyQuantity - sellQuantity;
        const balanceAmount = buyAmount - sellAmount;

        return { balanceQuantity, balanceAmount };
    }, [filteredTransactions]);


    const handleAddToWatchlist = (stockName: string) => {
        if (!userId) return;
        const added = addToSmartWatchlist(stockName, userId);
        if (added) {
            toast({ title: 'Added to Watchlist', description: `${stockName} has been added to your Smart Watchlist.` });
        } else {
            toast({ title: 'Already in Watchlist', description: `${stockName} is already in your Smart Watchlist.` });
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    }

    type TradeEntry = {
        id: string;
        date: string;
        companyName: string;
        symbol: string;
        qty: number;
        price: number;
        marketCap: string;
        indPE: number;
        stockPE: number;
        capital: string;
        sector: string;
        strategy: string;
        type: 'buy' | 'sale';
    };

    const [trades, setTrades] = useState<TradeEntry[]>([]);
    const [showTrades, setShowTrades] = useState(false);
    const [tradeMode, setTradeMode] = useState<'buy' | 'sale'>('buy');
    const [tradeForm, setTradeForm] = useState({ date: new Date().toISOString().split('T')[0], companyName: '', symbol: '', qty: '', price: '', marketCap: '', indPE: '', stockPE: '', capital: '', sector: '', strategy: '' });
    const [editingTradeId, setEditingTradeId] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('brokerTrades');
        if (saved) setTrades(JSON.parse(saved));
    }, []);

    const saveTrades = (newTrades: TradeEntry[]) => {
        setTrades(newTrades);
        localStorage.setItem('brokerTrades', JSON.stringify(newTrades));
    };

    const sortedTrades = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const capitalOptions = ['Large', 'Medium', 'Small', 'Micro Cap'];
    const sectorOptions = ['Evergreen', 'Seasonal', 'Cyclic'];

    const handleSaveTrade = () => {
        const { date, companyName, symbol, qty, price, marketCap, indPE, stockPE, capital, sector, strategy } = tradeForm;
        if (!companyName || !qty || !price) {
            toast({ title: "Error", description: "Company Name, Qty, and Price are required.", variant: "destructive" });
            return;
        }
        const entry: TradeEntry = {
            id: editingTradeId || Date.now().toString(),
            date,
            companyName,
            symbol,
            qty: parseFloat(qty),
            price: parseFloat(price),
            marketCap,
            indPE: parseFloat(indPE) || 0,
            stockPE: parseFloat(stockPE) || 0,
            capital,
            sector,
            strategy,
            type: tradeMode,
        };
        if (editingTradeId) {
            saveTrades(trades.map(t => t.id === editingTradeId ? entry : t));
            setEditingTradeId(null);
            toast({ title: "Trade Updated", description: `${companyName} trade updated.` });
        } else {
            saveTrades([...trades, entry]);
            toast({ title: "Trade Added", description: `${companyName} trade saved.` });
        }
        setTradeForm({ date: new Date().toISOString().split('T')[0], companyName: '', symbol: '', qty: '', price: '', marketCap: '', indPE: '', stockPE: '', capital: '', sector: '', strategy: '' });
    };

    const handleEditTrade = (trade: TradeEntry) => {
        setTradeMode(trade.type);
        setTradeForm({ date: trade.date, companyName: trade.companyName, symbol: trade.symbol, qty: trade.qty.toString(), price: trade.price.toString(), marketCap: trade.marketCap, indPE: trade.indPE.toString(), stockPE: trade.stockPE.toString(), capital: trade.capital, sector: trade.sector, strategy: trade.strategy });
        setEditingTradeId(trade.id);
        setShowTrades(true);
    };

    const handleDeleteTrade = (id: string) => {
        saveTrades(trades.filter(t => t.id !== id));
        toast({ title: "Trade Deleted", description: "Trade entry removed." });
    };

    const handleExportTrades = () => {
        if (sortedTrades.length === 0) {
            toast({ title: "No Data", description: "No trades to export.", variant: "destructive" });
            return;
        }
        const headers = ["Date", "Company Name", "Symbol", "Type", "Qty", "Price", "Market Cap", "Ind. P/E", "Stock P/E", "Capital", "Sector", "Strategy"];
        const csvRows = [headers.join(',')];
        sortedTrades.forEach(t => {
            csvRows.push([t.date, `"${t.companyName}"`, `"${t.symbol}"`, t.type, t.qty, t.price, `"${t.marketCap}"`, t.indPE, t.stockPE, `"${t.capital}"`, `"${t.sector}"`, `"${t.strategy}"`].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", 'trade-history.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Complete", description: "Trade history exported." });
    };

    const fundMovementSummary = useMemo(() => {
        const types = ['bank-to-broker', 'broker-to-bank', 'dividend'];
        const labels: Record<string, string> = {
            'bank-to-broker': 'RECEIVED FROM ICICI BANK',
            'broker-to-bank': 'SENT TO ICICI BANK',
            'dividend': 'DIVIDEND RECEIVED',
        };
        let combined: any[] = [];

        personalEntries.filter((e: any) => types.includes(e.type)).forEach((e: any) => {
            combined.push({
                id: e.id,
                date: e.date,
                transactionLabel: labels[e.type] || e.type,
                fundsReceived: e.type === 'bank-to-broker' || e.type === 'dividend' ? e.amount : 0,
                fundsSent: e.type === 'broker-to-bank' ? e.amount : 0,
                isStockTx: false,
            });
        });

        transactions.forEach((tx: Transaction) => {
            const amount = tx.quantity * tx.price;
            combined.push({
                id: 'tx-' + tx.id,
                date: tx.date,
                transactionLabel: tx.type === 'buy' ? 'STOCK BOUGHT' : 'STOCK SOLD',
                fundsReceived: tx.type === 'sell' ? amount : 0,
                fundsSent: tx.type === 'buy' ? amount : 0,
                stockName: tx.stockName,
                isStockTx: true,
            });
        });

        return combined.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [personalEntries, transactions]);
    
    return (
        <div className="space-y-6">
            {fundMovementSummary.length > 0 && (
                <Card className="shadow-md">
                    <CardHeader>
                        <div className="flex items-baseline gap-2">
                            <CardTitle className="font-headline text-base">BROCKERS FUND MOVEMENTS</CardTitle>
                            <CardDescription className="text-xs">Detailed fund movements between your accounts.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="border">Date</TableHead>
                                        <TableHead className="border">Transaction</TableHead>
                                        <TableHead className="border text-right text-green-600">CREDIT (IN)</TableHead>
                                        <TableHead className="border text-right text-red-600">DEBIT (OUT)</TableHead>
                                        <TableHead className="border text-right">BALANCE</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(() => {
                                        let bal = 0;
                                        return fundMovementSummary.map((e: any) => {
                                            bal = bal + e.fundsReceived - e.fundsSent;
                                            return (
                                                <TableRow key={e.id}>
                                                    <TableCell className="border">{e.date}</TableCell>
                                                    <TableCell className="border">
                                                        <Badge variant={e.transactionLabel === 'STOCK SOLD' || e.transactionLabel === 'RECEIVED FROM ICICI BANK' || e.transactionLabel === 'DIVIDEND RECEIVED' ? 'default' : 'destructive'} className={cn("capitalize whitespace-nowrap", e.transactionLabel === 'STOCK SOLD' && 'bg-green-100 text-green-800')}>{e.transactionLabel}</Badge>
                                                    </TableCell>
                                                    <TableCell className="border text-right text-green-600 font-medium">{e.fundsReceived > 0 ? formatCurrency(e.fundsReceived) : ''}</TableCell>
                                                    <TableCell className="border text-right text-red-600 font-medium">{e.fundsSent > 0 ? formatCurrency(e.fundsSent) : ''}</TableCell>
                                                    <TableCell className="border text-right font-semibold">{formatCurrency(bal)}</TableCell>
                                                </TableRow>
                                            );
                                        });
                                    })()}
                                </TableBody>
                                <TableFooter className="bg-muted/50 font-bold">
                                    <TableRow>
                                        <TableCell colSpan={2} className="border text-right">Total</TableCell>
                                        <TableCell className="border text-right text-green-600">{formatCurrency(fundMovementSummary.reduce((s: number, e: any) => s + e.fundsReceived, 0))}</TableCell>
                                        <TableCell className="border text-right text-red-600">{formatCurrency(fundMovementSummary.reduce((s: number, e: any) => s + e.fundsSent, 0))}</TableCell>
                                        <TableCell className="border text-right">{formatCurrency(fundMovementSummary.reduce((s: number, e: any) => s + e.fundsReceived - e.fundsSent, 0))}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
            <SectionCard
                title="Brocker's A/C"
                description="A summary of buy, sell, and balance quantities for each stock."
            >
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="border">Stock Name</TableHead>
                                <TableHead className="border text-right">Buy Qty</TableHead>
                                <TableHead className="border text-right">Buy Amount</TableHead>
                                <TableHead className="border text-right">Sell Qty</TableHead>
                                <TableHead className="border text-right">Sell Amount</TableHead>
                                <TableHead className="border text-right">Balance Qty</TableHead>
                                <TableHead className="border text-right">Balance Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ledgers.length > 0 ? ledgers.map((ledger) => (
                                <TableRow key={ledger.stockSymbol || ledger.stockName}>
                                    <TableCell className="border font-medium">
                                        <ContextMenu>
                                            <ContextMenuTrigger>{ledger.stockName}</ContextMenuTrigger>
                                            <ContextMenuContent>
                                                <ContextMenuItem onClick={() => handleAddToWatchlist(ledger.stockName)}>
                                                    Add to Smart Watchlist
                                                </ContextMenuItem>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    </TableCell>
                                    <TableCell className="border text-right text-green-600">{ledger.buyQuantity.toLocaleString()}</TableCell>
                                    <TableCell className="border text-right text-green-600">{ledger.buyAmount > 0 ? formatCurrency(ledger.buyAmount) : ''}</TableCell>
                                    <TableCell className="border text-right text-red-600">{ledger.sellQuantity.toLocaleString()}</TableCell>
                                    <TableCell className="border text-right text-red-600">{ledger.sellAmount > 0 ? formatCurrency(ledger.sellAmount) : ''}</TableCell>
                                    <TableCell className="border text-right font-semibold">{ledger.balanceQuantity.toLocaleString()}</TableCell>
                                    <TableCell className="border text-right font-semibold">{formatCurrency(ledger.balanceAmount)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="border text-center text-muted-foreground py-12">
                                        No ledger entries yet. Add trades in the Portfolio tab.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </SectionCard>
            
            <Card className="shadow-md">
                <CardHeader className="space-y-4">
                    <div>
                        <CardTitle className="font-headline text-base">Detailed Stock Ledger</CardTitle>
                        <CardDescription className="text-xs">A detailed view of transactions for a selected stock.</CardDescription>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                           <Select onValueChange={setSelectedFy} value={selectedFy}>
                                <SelectTrigger className="w-[200px] text-white">
                                    <SelectValue placeholder="Select FY" />
                                </SelectTrigger>
                                <SelectContent>
                                    {financialYears.map(fy => (
                                        <SelectItem key={fy} value={fy} style={{ color: fy === 'All Time' ? 'white' : undefined }}>{fy}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" /> Export Ledger
                            </Button>
                        </div>
                        <Select onValueChange={setSelectedStock} defaultValue="all">
                            <SelectTrigger className="w-[280px] text-white">
                                <SelectValue placeholder="Select a stock" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Select a stock to view details</SelectItem>
                                {uniqueStocks.map(stockName => (
                                    <SelectItem key={stockName} value={stockName}>{stockName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                   <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="border">Date</TableHead>
                                    <TableHead className="border">Transaction</TableHead>
                                    <TableHead className="border">Stock Name</TableHead>
                                    <TableHead className="border text-right">Qty</TableHead>
                                    <TableHead className="border text-right">Price</TableHead>
                                    <TableHead className="border text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {selectedStock !== 'all' && filteredTransactions.length > 0 ? filteredTransactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="border">{tx.date}</TableCell>
                                        <TableCell className="border">
                                            <Badge variant={tx.type === 'buy' ? 'default' : 'destructive'} className="capitalize">{tx.type}</Badge>
                                        </TableCell>
                                        <TableCell className="border font-medium">
                                            <ContextMenu>
                                                <ContextMenuTrigger>{tx.stockName}</ContextMenuTrigger>
                                                <ContextMenuContent>
                                                    <ContextMenuItem onClick={() => handleAddToWatchlist(tx.stockName)}>
                                                        Add to Smart Watchlist
                                                    </ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        </TableCell>
                                        <TableCell className="border text-right">{tx.quantity.toLocaleString()}</TableCell>
                                        <TableCell className="border text-right">{formatCurrency(tx.price)}</TableCell>
                                        <TableCell className={cn("border text-right font-medium", tx.type === 'buy' ? 'text-green-600' : 'text-red-600')}>
                                            {tx.type === 'buy' ? '+' : '-'} {formatCurrency(tx.quantity * tx.price)}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="border text-center text-muted-foreground py-12">
                                            {selectedStock === 'all' ? 'Please select a stock to view its ledger.' : 'No transactions for this stock.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            {selectedStock !== 'all' && filteredTransactions.length > 0 && (
                                <TableFooter className="bg-muted/50 font-bold">
                                    <TableRow>
                                        <TableCell colSpan={3} className="border text-right">Balance</TableCell>
                                        <TableCell className="border text-right">{detailedLedgerSummary.balanceQuantity.toLocaleString()}</TableCell>
                                        <TableCell colSpan={2} className="border text-right">{formatCurrency(detailedLedgerSummary.balanceAmount)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            )}
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
