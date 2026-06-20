
'use client';

import { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, RefreshCw, PlusCircle, Download, Edit, Trash2, BellPlus, Mail, Send, Eye, EyeOff, Newspaper, ExternalLink, Loader2, TrendingUp, Search } from "lucide-react";
import type { Transaction, Stock, Ledger, NewsArticle, AlertConfig } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn, addToSmartWatchlist } from '@/lib/utils';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { format, formatDistanceToNow } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { useAlertThresholds } from '@/hooks/use-alert-thresholds';
import getPortfolioNews from '@/actions/stock-actions';


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

const alertPeriods = ["Auto", "1 min.", "15 min.", "30 min.", "1 hour", "1 Day", "Week", "4 Week", "52 Week"];

const SectionCard = ({ title, description, action, children }: { title: React.ReactNode, description?: string, action?: React.ReactNode, children: React.ReactNode }) => (
    <Card className="shadow-md">
        <CardHeader>
             <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                    <CardTitle className="font-headline text-base flex items-center gap-2">{title}</CardTitle>
                    {description && <CardDescription className="text-xs">{description}</CardDescription>}
                </div>
                <div>{action}</div>
            </div>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
);

const AddThresholdDialog = ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => {
    const [item, setItem] = useState('');
    const { toast } = useToast();
    const { addThreshold } = useAlertThresholds();
    
    const handleSave = () => {
        if (!item) {
            toast({ title: "Error", description: "Threshold name cannot be empty.", variant: "destructive" });
            return;
        }
        addThreshold("Custom", item);
        setItem('');
        onOpenChange(false); // Close the dialog
    }

    return (
        <DialogContent className="w-full max-w-lg">
            <DialogHeader>
                <DialogTitle>Add Custom Threshold</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="threshold-name">New Threshold Name</Label>
                <Input id="threshold-name" value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Volume > 2x Average" className="w-full" />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save Threshold</Button>
            </DialogFooter>
        </DialogContent>
    )
}

const SetAlertsDialog = ({ children, stockName, onSave, allAlerts }: { children: React.ReactNode, stockName: string, onSave: (alert: Omit<AlertConfig, 'stockId' | 'stockName'>) => void, allAlerts: AlertConfig[] }) => {
    const [open, setOpen] = useState(false);
    const [addThresholdOpen, setAddThresholdOpen] = useState(false);
    const [alertPeriod, setAlertPeriod] = useState('Auto');
    const [alertThreshold, setAlertThreshold] = useState('');
    const [alertEmail, setAlertEmail] = useState(false);
    const [alertTelegram, setAlertTelegram] = useState(false);
    const { toast } = useToast();
    const { alertThresholds } = useAlertThresholds();
    
    const stockId = allStocks.find(s => s.name === stockName)?.symbol || stockName;

    const handleSave = () => {
        const stockAlerts = allAlerts.filter(a => a.stockId === stockId);
        if (stockAlerts.length >= 5) {
            toast({
                title: "Alert Limit Reached",
                description: "You can only set a maximum of 5 alerts per stock.",
                variant: "destructive",
            });
            return;
        }

        if (!alertThreshold) {
            toast({ title: "Threshold Required", description: "Please select a threshold.", variant: "destructive" });
            return;
        }

        toast({ title: "Alert Set", description: `New alert for ${stockName} has been created.` });
        onSave({ period: alertPeriod, threshold: alertThreshold, email: alertEmail, telegram: alertTelegram });
        setOpen(false);
    };

    return (
        <>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Set Alerts for {stockName}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="space-y-2">
                        <Label>Period</Label>
                        <Select value={alertPeriod} onValueChange={setAlertPeriod}>
                            <SelectTrigger><SelectValue placeholder="Select Time Period" /></SelectTrigger>
                            <SelectContent>
                                {alertPeriods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Threshold</Label>
                         <Select value={alertThreshold} onValueChange={setAlertThreshold}>
                            <SelectTrigger><SelectValue placeholder="Select Threshold Type" /></SelectTrigger>
                            <SelectContent position="centered" className="border-2 w-[600px]">
                                <div className="grid grid-cols-2 gap-x-4 p-2">
                                    <ScrollArea className="h-72 pr-4 border-r">
                                        {alertThresholds.slice(0, Math.ceil(alertThresholds.length / 2)).map(group => (
                                            <SelectGroup key={group.group}>
                                                <SelectLabel>{group.group}</SelectLabel>
                                                {group.items.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                                            </SelectGroup>
                                        ))}
                                    </ScrollArea>
                                    <ScrollArea className="h-72">
                                        {alertThresholds.slice(Math.ceil(alertThresholds.length / 2)).map(group => (
                                            <SelectGroup key={group.group}>
                                                <SelectLabel>{group.group}</SelectLabel>
                                                {group.items.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                                            </SelectGroup>
                                        ))}
                                    </ScrollArea>
                                </div>
                                <Separator />
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" className="w-full justify-start mt-1">
                                            <PlusCircle className="mr-2" /> Add Threshold
                                        </Button>
                                    </DialogTrigger>
                                    <AddThresholdDialog onOpenChange={() => {}} />
                                </Dialog>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-4 pt-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="email-alert-dialog" checked={alertEmail} onCheckedChange={(c) => setAlertEmail(c === true)} />
                            <Label htmlFor="email-alert-dialog" className="flex items-center gap-1"><Mail size={14}/>Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="telegram-alert-dialog" checked={alertTelegram} onCheckedChange={(c) => setAlertTelegram(c === true)} />
                            <Label htmlFor="telegram-alert-dialog" className="flex items-center gap-1"><Send size={14}/>Telegram</Label>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Alert</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={addThresholdOpen} onOpenChange={setAddThresholdOpen}>
            <AddThresholdDialog onOpenChange={setAddThresholdOpen} />
        </Dialog>
        </>
    )
}

const AddTradeDialog = ({ children, onSave, tradeType, transactionToEdit, investableAmount, ownedStocks, alerts, setAlerts }: { children: React.ReactNode, onSave: (trade: Omit<Transaction, 'id'>) => void, tradeType: 'buy' | 'sell', transactionToEdit?: Transaction | null, investableAmount: number, ownedStocks?: { name: string, quantity: number }[], alerts: AlertConfig[], setAlerts: (alerts: AlertConfig[]) => void }) => {
    const [open, setOpen] = useState(false);
    const [stockName, setStockName] = useState(transactionToEdit?.stockName || '');
    const [symbolTicker, setSymbolTicker] = useState(transactionToEdit?.stockSymbol || '');
    const [quantity, setQuantity] = useState(transactionToEdit?.quantity.toString() || '');
    const [rate, setRate] = useState(transactionToEdit?.price.toString() || '');
    const [pe, setPe] = useState(transactionToEdit?.pe?.toString() || '');
    const [date, setDate] = useState(transactionToEdit?.date || format(new Date(), 'yyyy-MM-dd'));
    const [indPE, setIndPE] = useState(transactionToEdit?.indPE?.toString() || '');
    const [investedPercent, setInvestedPercent] = useState(transactionToEdit?.investedPercent?.toString() || '');
    const [target, setTarget] = useState(transactionToEdit?.target?.toString() || '');
    const { toast } = useToast();

    const amount = useMemo(() => {
        const q = parseFloat(quantity);
        const r = parseFloat(rate);
        return isNaN(q) || isNaN(r) ? 0 : q * r;
    }, [quantity, rate]);
    
    const isPeHigh = useMemo(() => {
        if (tradeType !== 'buy') return false;
        const peValue = parseFloat(pe);
        const indPeValue = parseFloat(indPE);
        return !isNaN(peValue) && !isNaN(indPeValue) && peValue > indPeValue;
    }, [pe, indPE, tradeType]);

    useEffect(() => {
        if (amount > 0 && investableAmount > 0) {
            const percentage = (amount / investableAmount) * 100;
            setInvestedPercent(percentage.toFixed(2));
        } else {
            setInvestedPercent('');
        }
    }, [amount, investableAmount]);

    useEffect(() => {
        if (transactionToEdit) {
            setStockName(transactionToEdit.stockName);
            setSymbolTicker(transactionToEdit.stockSymbol || '');
            setQuantity(transactionToEdit.quantity.toString());
            setRate(transactionToEdit.price.toString());
            setPe(transactionToEdit.pe?.toString() || '');
            setDate(transactionToEdit.date);
            setIndPE(transactionToEdit.indPE?.toString() || '');
            setInvestedPercent(transactionToEdit.investedPercent?.toString() || '');
            setTarget(transactionToEdit.target?.toString() || '');
        } else {
            setStockName('');
            setSymbolTicker('');
            setQuantity('');
            setRate('');
            setPe('');
            setDate(format(new Date(), 'yyyy-MM-dd'));
            setIndPE('');
            setInvestedPercent('');
            setTarget('');
        }
    }, [transactionToEdit, open]);
    
    const handleAlertSave = (alertConfig: Omit<AlertConfig, 'stockId' | 'stockName'>) => {
        if (!stockName) {
            toast({ title: "Stock name required", description: "Please enter a stock name before setting an alert.", variant: "destructive" });
            return;
        }
        const stockSymbol = allStocks.find(s => s.name === stockName)?.symbol || stockName;
        const newAlert: AlertConfig = { ...alertConfig, stockId: stockSymbol, stockName: stockName, createdAt: Date.now() };
        setAlerts([...alerts, newAlert]);
    };

    const handleSave = () => {
        if (!stockName || !quantity || !rate || !date) {
            toast({ title: "Error", description: "Please fill at least Stock, Quantity, Rate, and Date.", variant: "destructive" });
            return;
        }
        
        if(tradeType === 'sell') {
            const stockToSell = ownedStocks?.find(s => s.name === stockName);
            if (!stockToSell || Number(quantity) > stockToSell.quantity) {
                 toast({ title: "Error", description: `You cannot sell more than you own. You have ${stockToSell?.quantity || 0} shares of ${stockName}.`, variant: "destructive" });
                 return;
            }
        }

        onSave({
            stockName,
            stockSymbol: symbolTicker,
            type: tradeType,
            quantity: Number(quantity),
            price: Number(rate),
            pe: pe ? Number(pe) : undefined,
            date,
            indPE: indPE ? Number(indPE) : undefined,
            investedPercent: investedPercent ? Number(investedPercent) : undefined,
            target: target !== '' ? Number(target) : undefined,
        });

        toast({ title: "Trade Saved", description: `Your ${tradeType} trade for ${stockName} has been recorded.` });

        setOpen(false);
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{transactionToEdit ? 'Edit' : 'Add'} {tradeType === 'buy' ? 'Buy' : 'Sell'} Trade</DialogTitle>
                </DialogHeader>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="stock">Stock</Label>
                        {tradeType === 'sell' ? (
                            <Select onValueChange={setStockName} value={stockName}>
                                <SelectTrigger id="stock-select">
                                    <SelectValue placeholder="Select stock to sell" /></SelectTrigger>
                                <SelectContent>
                                    {ownedStocks?.map(stock => (
                                        <SelectItem key={stock.name} value={stock.name}>
                                            {stock.name} (Qty: {stock.quantity})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input id="stock" value={stockName} onChange={e => setStockName(e.target.value)} placeholder="e.g. Reliance Industries" />
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="symbol-ticker">Symbol / Ticker</Label>
                        <Input id="symbol-ticker" value={symbolTicker} onChange={e => setSymbolTicker(e.target.value)} placeholder="e.g. TV18BRDCST.BSE for YFinance" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 100" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rate">Price</Label>
                        <Input id="rate" type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 150.50" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input id="amount" value={amount.toFixed(2)} readOnly disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="ind-pe">Ind. PE</Label>
                        <Input id="ind-pe" type="number" value={indPE} onChange={e => setIndPE(e.target.value)} placeholder="e.g. 30" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pe">P/E</Label>
                        <Input id="pe" type="number" value={pe} onChange={e => setPe(e.target.value)} placeholder="e.g. 25" className={cn(isPeHigh && 'text-red-600 font-bold')} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="invested-percent">Invested %</Label>
                        <Input id="invested-percent" type="number" value={investedPercent} onChange={e => setInvestedPercent(e.target.value)} placeholder="e.g. 5" disabled readOnly />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="target">Target</Label>
                        <Input id="target" type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 3200" />
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:items-center">
                    <SetAlertsDialog stockName={stockName} onSave={handleAlertSave} allAlerts={alerts}>
                        <Button variant="outline"><BellPlus className="mr-2" />Set Alerts</Button>
                    </SetAlertsDialog>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} variant={isPeHigh ? 'destructive' : 'default'}>Save Trade</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

type Holding = { 
    name: string;
    symbol: string;
    quantity: number;
    avgPrice: number;
    investedValue: number;
    currentValue: number;
    pnl: number;
    percentChange: number;
    lastTradeDate: string;
    livePrice?: number;
};


const MyHoldings = ({ transactions, ownedStocks, alerts, setAlerts, userId }: { transactions: Transaction[], ownedStocks: { name: string, symbol: string, quantity: number}[], alerts: AlertConfig[], setAlerts: (alerts: AlertConfig[]) => void, userId: string }) => {
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [isRefreshing, setIsRefreshing] = useTransition();
    const { toast } = useToast();

    const calculateHoldings = useCallback((transactions: Transaction[], livePrices: Map<string, number>): Holding[] => {
        const portfolio: { [key: string]: { name: string, symbol: string, quantity: number, totalCost: number, totalSellValue: number, totalBuyQty: number, lastTradeDate: string } } = {};

        [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(tx => {
            const key = tx.stockName.toLowerCase().trim();
            if (!portfolio[key]) {
                const symbol = tx.stockSymbol || (() => {
                    const found = allStocks.find(s => s.name.toLowerCase() === tx.stockName.toLowerCase());
                    return found ? found.symbol : tx.stockName.toUpperCase().replace(/\s/g, '');
                })();
                portfolio[key] = { name: tx.stockName, symbol, quantity: 0, totalCost: 0, totalSellValue: 0, totalBuyQty: 0, lastTradeDate: tx.date };
            }
            const stock = portfolio[key];
            const amount = tx.quantity * tx.price;

            if (tx.type === 'buy') {
                stock.quantity += tx.quantity;
                stock.totalCost += amount;
                stock.totalBuyQty += tx.quantity;
            } else {
                stock.quantity -= tx.quantity;
                stock.totalSellValue += amount;
            }
             stock.lastTradeDate = tx.date;
        });
        
        return Object.values(portfolio).filter(s => s.quantity > 0).map(s => {
            const livePrice = livePrices.get(s.symbol) ?? 0;
            
            const investedValue = s.totalCost - s.totalSellValue;
            const currentValue = livePrice > 0 ? livePrice * s.quantity : 0;
            const pnl = currentValue > 0 ? currentValue - investedValue : 0;
            const percentChange = investedValue !== 0 ? (pnl / investedValue) * 100 : 0;
            
            const avgPrice = s.totalBuyQty > 0 ? s.totalCost / s.totalBuyQty : 0;

            return {
                ...s,
                avgPrice: avgPrice,
                investedValue,
                currentValue,
                pnl,
                percentChange,
                livePrice
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, []);

    const refreshLivePrices = useCallback(async (isAutoRefresh = false) => {
        const uniqueSymbols = ownedStocks.map(h => h.symbol);
        
        if (uniqueSymbols.length === 0) {
            setHoldings([]);
            return;
        }

        setIsRefreshing(async () => {
            if (!isAutoRefresh) {
                toast({ title: 'Refreshing Prices...', description: 'Fetching latest market data.' });
            }

            const prices = new Map<string, number>();
            const pricePromises = uniqueSymbols.map(async (symbol) => {
                try {
                    const res = await fetch(`/api/yahoo-price?symbol=${encodeURIComponent(symbol)}`);
                    const data = await res.json();
                    const quote = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
                    if (quote && quote > 0) prices.set(symbol, quote);
                } catch {}
            });

            await Promise.all(pricePromises);
            setHoldings(calculateHoldings(transactions, prices));
            
            if (!isAutoRefresh) {
                toast({ title: 'Prices Refreshed', description: 'Your portfolio has been updated.' });
            }
        });
    }, [ownedStocks, transactions, calculateHoldings, toast]);


    useEffect(() => {
        const initialHoldings = calculateHoldings(transactions, new Map());
        setHoldings(initialHoldings);
    }, [transactions, calculateHoldings]);

     useEffect(() => {
        if (ownedStocks.length > 0) {
            refreshLivePrices(true); // Initial fetch without toast
            const intervalId = setInterval(() => refreshLivePrices(true), 15000);
            return () => clearInterval(intervalId);
        }
    }, [ownedStocks, refreshLivePrices]);
    
    const handleAlertSave = (stockName: string, alertConfig: Omit<AlertConfig, 'stockId' | 'stockName'>) => {
        const stockSymbol = allStocks.find(s => s.name === stockName)?.symbol || stockName;
        const newAlert: AlertConfig = { ...alertConfig, stockId: stockSymbol, stockName: stockName, createdAt: Date.now() };
        setAlerts([...alerts, newAlert]);
    };

    const handleAddToWatchlist = (stockName: string) => {
        if (!userId) return;
        const added = addToSmartWatchlist(stockName, userId);
        if (added) {
            toast({ title: 'Added to Watchlist', description: `${stockName} has been added to your Smart Watchlist.` });
        } else {
            toast({ title: 'Already in Watchlist', description: `${stockName} is already in your Smart Watchlist.` });
        }
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    
    const totalInvested = useMemo(() => holdings.reduce((sum, h) => sum + h.investedValue, 0), [holdings]);
    const totalCurrentValue = useMemo(() => holdings.reduce((sum, h) => sum + h.currentValue, 0), [holdings]);
    const totalPnl = useMemo(() => totalCurrentValue - totalInvested, [totalCurrentValue, totalInvested]);

    return (
        <SectionCard
            title={
                <div className="flex items-center gap-2">
                    My Holdings
                    <Badge variant="secondary">{ownedStocks.length}</Badge>
                </div>
            }
            description="A summary of your current stock portfolio and holdings."
            action={<Button variant="outline" onClick={() => refreshLivePrices(false)} disabled={isRefreshing} className="text-white">
                {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh Live Prices
                </Button>}
        >
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Stock</TableHead>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Invested Value</TableHead>
                            <TableHead>Current Price</TableHead>
                            <TableHead>Current Value</TableHead>
                            <TableHead>P&L</TableHead>
                            <TableHead>% Change</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {holdings.length > 0 ? (
                            holdings.map(h => (
                                    <TableRow key={h.symbol}>
                                        <TableCell className="font-medium">
                                            <ContextMenu>
                                                <ContextMenuTrigger>{h.name}</ContextMenuTrigger>
                                                <ContextMenuContent>
                                                    <ContextMenuItem onClick={() => handleAddToWatchlist(h.name)}>
                                                        Add to Smart Watchlist
                                                    </ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{h.symbol}</TableCell>
                                        <TableCell>{h.quantity.toLocaleString()}</TableCell>
                                    <TableCell>{h.avgPrice}</TableCell>
                                    <TableCell>{formatCurrency(h.investedValue)}</TableCell>
                                    <TableCell>{h.livePrice ? formatCurrency(h.livePrice) : <span className="text-gray-500">N/A</span>}</TableCell>
                                    <TableCell>{formatCurrency(h.currentValue)}</TableCell>
                                    <TableCell className={cn(h.pnl > 0 ? 'text-green-600' : h.pnl < 0 ? 'text-red-600' : 'text-gray-500')}>
                                        {formatCurrency(h.pnl)}
                                    </TableCell>
                                     <TableCell className={cn(h.percentChange > 0 ? 'text-green-600' : h.percentChange < 0 ? 'text-red-600' : 'text-gray-500')}>
                                         {h.livePrice ? `${h.percentChange.toFixed(2)}%` : <span className="text-gray-500">N/A</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <SetAlertsDialog stockName={h.name} onSave={(config) => handleAlertSave(h.name, config)} allAlerts={alerts}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7"><BellPlus size={14} /></Button>
                                        </SetAlertsDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                                    You have no holdings yet. Add a trade below.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    {holdings.length > 0 && (
                    <TableFooter>
                        <TableRow className="font-bold">
                            <TableCell colSpan={4} className="text-right">Total</TableCell>
                            <TableCell>{formatCurrency(totalInvested)}</TableCell>
                            <TableCell></TableCell>
                            <TableCell>{formatCurrency(totalCurrentValue)}</TableCell>
                            <TableCell className={cn(totalPnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                                {formatCurrency(totalPnl)}
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                        </TableRow>
                    </TableFooter>
                    )}
                </Table>
            </div>
        </SectionCard>
    );
};

const TradeHistory = ({ transactions, onAddTrade, onDeleteTrade, onEditTrade, investableAmount, ownedStocks, alerts, setAlerts, userId }: { transactions: Transaction[], onAddTrade: (trade: Omit<Transaction, 'id'>) => void, onDeleteTrade: (tradeId: string) => void, onEditTrade: (trade: Transaction) => void, investableAmount: number, ownedStocks: { name: string, quantity: number }[], alerts: AlertConfig[], setAlerts: (alerts: AlertConfig[]) => void, userId: string }) => {
    const [showTradeHistory, setShowTradeHistory] = useState(false);
    const { toast } = useToast();
    
    const handleSave = useCallback((trade: Omit<Transaction, 'id'>) => {
        const stockSymbol = trade.stockSymbol || (() => {
            const stock = allStocks.find(s => s.name.toLowerCase() === trade.stockName.toLowerCase());
            return stock ? stock.symbol : trade.stockName.toUpperCase().replace(/\s/g, '');
        })();
        onAddTrade({ ...trade, stockSymbol });
    }, [onAddTrade]);
    
    const handleAddToWatchlist = (stockName: string) => {
        if (!userId) return;
        const added = addToSmartWatchlist(stockName, userId);
        if (added) {
            toast({ title: 'Added to Watchlist', description: `${stockName} has been added to your Smart Watchlist.` });
        } else {
            toast({ title: 'Already in Watchlist', description: `${stockName} is already in your Smart Watchlist.` });
        }
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    
    const sortedTransactions = useMemo(() => {
        return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);
    
    const handleExport = () => {
        const headers = ["Stock", "Symbol", "Date", "Transaction", "Qty", "Price", "Amount", "Ind. PE", "P/E", "Invested %", "Target"];
        const csvContent = [
            headers.join(','),
            ...sortedTransactions.map(tx => [
                `"${tx.stockName}"`,
                tx.stockSymbol || '',
                tx.date,
                tx.type,
                tx.quantity,
                tx.price,
                tx.quantity * tx.price,
                tx.indPE || '',
                tx.pe || '',
                tx.investedPercent || '',
                tx.target || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "trade-history.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };


    return (
        <SectionCard
            title="Trade History"
            description="A complete log of all your buy and sell transactions."
             action={
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowTradeHistory(prev => !prev)} className="text-white">
                        {showTradeHistory ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                        {showTradeHistory ? 'Hide' : 'View'} History
                    </Button>
                    <AddTradeDialog onSave={handleSave} tradeType="buy" investableAmount={investableAmount} alerts={alerts} setAlerts={setAlerts}>
                         <Button><PlusCircle className="mr-2 h-4 w-4" />Add Buy</Button>
                    </AddTradeDialog>
                     <AddTradeDialog onSave={handleSave} tradeType="sell" investableAmount={investableAmount} ownedStocks={ownedStocks} alerts={alerts} setAlerts={setAlerts}>
                        <Button variant="secondary"><PlusCircle className="mr-2 h-4 w-4" />Add Sell</Button>
                    </AddTradeDialog>
                    <Button variant="outline" onClick={handleExport} className="text-white"><Download className="mr-2 h-4 w-4" />Export</Button>
                </div>
            }
        >
             {showTradeHistory && (
                <div className="border rounded-lg animate-in fade-in duration-300">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Stock</TableHead>
                                <TableHead>Symbol</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Transaction</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Ind. PE</TableHead>
                                <TableHead>P/E</TableHead>
                                <TableHead>Inv.%</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedTransactions.length > 0 ? (
                                sortedTransactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="font-medium">
                                            <ContextMenu>
                                                <ContextMenuTrigger>{tx.stockName}</ContextMenuTrigger>
                                                <ContextMenuContent>
                                                    <ContextMenuItem onClick={() => handleAddToWatchlist(tx.stockName)}>
                                                        Add to Smart Watchlist
                                                    </ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        </TableCell>
                                        <TableCell>{tx.stockSymbol}</TableCell>
                                        <TableCell>{tx.date}</TableCell>
                                        <TableCell>
                                            <Badge variant={tx.type === 'buy' ? 'default' : 'destructive'} className="capitalize">{tx.type}</Badge>
                                        </TableCell>
                                        <TableCell>{tx.quantity}</TableCell>
                                        <TableCell>{tx.price}</TableCell>
                                        <TableCell>{formatCurrency(tx.price * tx.quantity)}</TableCell>
                                        <TableCell>{tx.indPE || '-'}</TableCell>
                                        <TableCell className={tx.pe && tx.indPE && tx.pe > tx.indPE ? 'text-red-600 font-bold' : ''}>{tx.pe || '-'}</TableCell>
                                        <TableCell>{tx.investedPercent ? `${tx.investedPercent}%` : '-'}</TableCell>
                                        <TableCell>{tx.target ? formatCurrency(tx.target) : '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <AddTradeDialog onSave={(trade) => onEditTrade({ ...trade, id: tx.id })} tradeType={tx.type} transactionToEdit={tx} investableAmount={investableAmount} ownedStocks={ownedStocks} alerts={alerts} setAlerts={setAlerts}>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7"><Edit size={14} /></Button>
                                                </AddTradeDialog>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteTrade(tx.id)}><Trash2 size={14} className="text-destructive" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={12} className="text-center text-muted-foreground py-12">
                                        You have no trades yet. Add one above.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </SectionCard>
    );
};


type InsiderTrade = {
    date: string;
    relationship: string;
    transaction: string;
    shares: number;
    value: number;
};

const INVESTORS_KEY = 'high_value_investors';
const LAST_FETCH_KEY = 'nse_bulk_deals_last_fetch';
const BULK_DEALS_KEY = 'nse_bulk_deals';
const EMAIL_CONFIG_KEY = 'email_smtp_config';

type InsiderTrade = {
    date: string;
    relationship: string;
    transaction: string;
    shares: number;
    value: number;
};

const TradesAndDeals = ({ ownedStocks }: { ownedStocks: { name: string, symbol: string }[] }) => {
    const [trades, setTrades] = useState<InsiderTrade[]>([]);
    const [investors, setInvestors] = useState<HighValueInvestor[]>([]);
    const [bulkDeals, setBulkDeals] = useState<BulkDeal[]>([]);
    const [investorDialogOpen, setInvestorDialogOpen] = useState(false);
    const [investorName, setInvestorName] = useState('');
    const [stockFinderOpen, setStockFinderOpen] = useState(false);
    const [stockFinderPeriod, setStockFinderPeriod] = useState<'1D' | '1W'>('1D');
    const [stockFinderResults, setStockFinderResults] = useState<any[]>([]);
    const [isFindingStocks, setIsFindingStocks] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isFetchingDeals, setIsFetchingDeals] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        try {
            const stored = localStorage.getItem(INVESTORS_KEY);
            if (stored) setInvestors(JSON.parse(stored));
            const storedDeals = localStorage.getItem(BULK_DEALS_KEY);
            if (storedDeals) setBulkDeals(JSON.parse(storedDeals));
        } catch {}
    }, []);

    useEffect(() => {
        localStorage.setItem(INVESTORS_KEY, JSON.stringify(investors));
    }, [investors]);

    useEffect(() => {
        const checkAndFetch = () => {
            const lastFetch = localStorage.getItem(LAST_FETCH_KEY);
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const afterCutoff = hours > 0 || (hours === 0 && minutes >= 10);
            if (lastFetch !== today && afterCutoff) {
                fetchBulkDeals();
            }
        };
        checkAndFetch();
        const interval = setInterval(checkAndFetch, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (ownedStocks.length === 0) return;
        const indianStocks = ownedStocks.filter(s => s.symbol.includes('.BSE') || s.symbol.includes('.NSE'));
        if (indianStocks.length === 0) return;
        startTransition(async () => {
            const allTrades: InsiderTrade[] = [];
            for (const stock of indianStocks.slice(0, 5)) {
                try {
                    const ySymbol = stock.symbol.replace(/\.BSE$/i, '.BO').replace(/\.NSE$/i, '.NS');
                    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySymbol)}?modules=insiderTransactions`;
                    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (!res.ok) continue;
                    const data = await res.json();
                    const txns = data?.quoteSummary?.result?.[0]?.insiderTransactions?.transactions || [];
                    for (const t of txns.slice(0, 3)) {
                        allTrades.push({
                            date: t?.filerRelation?.value || '',
                            relationship: t?.filerRelation?.description || '',
                            transaction: t?.transactionDescription || t?.shares?.description || '',
                            shares: parseInt(t?.shares?.raw) || 0,
                            value: Math.abs(parseInt(t?.value?.raw) || 0),
                        });
                    }
                } catch { continue; }
            }
            setTrades(allTrades);
        });
    }, [ownedStocks, toast]);

    const fetchBulkDeals = async () => {
        setIsFetchingDeals(true);
        try {
            const res = await fetch('/api/nse-bulk-deals');
            const result = await res.json();
            if (result.success && result.data.length > 0) {
                setBulkDeals(result.data);
                localStorage.setItem(BULK_DEALS_KEY, JSON.stringify(result.data));
                localStorage.setItem(LAST_FETCH_KEY, new Date().toISOString().split('T')[0]);
            }
        } catch {} finally {
            setIsFetchingDeals(false);
        }
    };

    const findStocks = async () => {
        setIsFindingStocks(true);
        setStockFinderResults([]);
        try {
            let deals = [...bulkDeals];
            if (stockFinderPeriod === '1W' || deals.length === 0) {
                setIsFetchingDeals(true);
                const daysToFetch = stockFinderPeriod === '1W' ? 7 : 1;
                const allDeals: BulkDeal[] = [];
                for (let d = 0; d < daysToFetch; d++) {
                    const date = new Date();
                    date.setDate(date.getDate() - d);
                    const dateStr = date.toISOString().split('T')[0];
                    try {
                        const res = await fetch(`/api/nse-bulk-deals?date=${dateStr}`);
                        const result = await res.json();
                        if (result.success) allDeals.push(...result.data);
                    } catch {}
                }
                deals = allDeals;
                if (allDeals.length > 0) {
                    setBulkDeals(allDeals);
                    localStorage.setItem(BULK_DEALS_KEY, JSON.stringify(allDeals));
                }
                setIsFetchingDeals(false);
            }
            const results: any[] = [];
            investors.forEach(inv => {
                const investorDeals = deals.filter(d =>
                    d.clientName.toLowerCase().includes(inv.name.toLowerCase())
                );
                const byStock: Record<string, { symbol: string, securityName: string, buyQty: number, sellQty: number, buyVal: number, sellVal: number }> = {};
                investorDeals.forEach(d => {
                    const key = d.symbol || d.securityName;
                    if (!key) return;
                    if (!byStock[key]) byStock[key] = { symbol: d.symbol, securityName: d.securityName, buyQty: 0, sellQty: 0, buyVal: 0, sellVal: 0 };
                    if (d.buySell === 'BUY') { byStock[key].buyQty += d.quantityTraded; byStock[key].buyVal += d.quantityTraded * d.tradePrice; }
                    else { byStock[key].sellQty += d.quantityTraded; byStock[key].sellVal += d.quantityTraded * d.tradePrice; }
                });
                Object.entries(byStock).forEach(([stockKey, s]) => {
                    const netQty = s.buyQty - s.sellQty;
                    if (netQty !== 0) {
                        results.push({ investorName: inv.name, symbol: s.symbol, securityName: s.securityName, buyQty: s.buyQty, sellQty: s.sellQty, netQty, netVal: s.buyVal - s.sellVal });
                    }
                });
            });
            results.sort((a, b) => Math.abs(b.netVal) - Math.abs(a.netVal));
            setStockFinderResults(results);
            if (results.length === 0) toast({ title: 'No results', description: 'No matching bulk/block deals found for your tracked investors.' });
        } catch {} finally {
            setIsFindingStocks(false);
        }
    };

    const addInvestor = () => {
        const name = investorName.trim();
        if (!name) return;
        if (investors.some(i => i.name.toLowerCase() === name.toLowerCase())) {
            toast({ title: 'Investor already exists', variant: 'destructive' });
            return;
        }
        const newInvestor: HighValueInvestor = {
            id: Date.now().toString(),
            name,
            addedAt: new Date().toISOString(),
        };
        setInvestors(prev => [...prev, newInvestor]);
        setInvestorName('');
        setInvestorDialogOpen(false);
        toast({ title: `Investor "${name}" added` });
        if (investors.length === 0) fetchBulkDeals();
    };

    const removeInvestor = (id: string) => {
        const inv = investors.find(i => i.id === id);
        setInvestors(prev => prev.filter(i => i.id !== id));
        toast({ title: `Investor "${inv?.name}" removed` });
    };

    const matchedDeals = useMemo(() => {
        if (investors.length === 0 || bulkDeals.length === 0) return [];
        return bulkDeals.filter(deal =>
            investors.some(inv =>
                deal.clientName.toLowerCase().includes(inv.name.toLowerCase())
            )
        );
    }, [investors, bulkDeals]);

    return (
        <SectionCard
            title="Trades & Deals"
            description="Bulk, block, insider trades, and high-value investor activity."
            action={
                <div className="flex gap-2 items-center">
                    {isFetchingDeals && <Loader2 className="animate-spin h-4 w-4" />}
                    <Dialog open={stockFinderOpen} onOpenChange={setStockFinderOpen}>
                        <DialogTrigger asChild>
                            <Button variant="default" size="sm" className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                                <TrendingUp size={14} /> Find Stock
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Find Stock by Investor Activity</DialogTitle>
                                <DialogDescription>Analyze bulk/block deals to find stocks with investor activity.</DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center gap-4 py-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="period-select">Period:</Label>
                                    <select id="period-select" value={stockFinderPeriod} onChange={e => setStockFinderPeriod(e.target.value as '1D' | '1W')} className="border rounded px-2 py-1 text-sm">
                                        <option value="1D">1 Day</option>
                                        <option value="1W">1 Week</option>
                                    </select>
                                </div>
                                <Button onClick={findStocks} disabled={isFindingStocks} size="sm">
                                    {isFindingStocks ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : <Search size={14} className="mr-1" />}
                                    Find Stocks
                                </Button>
                            </div>
                            {stockFinderResults.length > 0 && (
                                <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="border">Investor</TableHead>
                                                <TableHead className="border">Symbol</TableHead>
                                                <TableHead className="border">Security</TableHead>
                                                <TableHead className="border text-right">Buy Qty</TableHead>
                                                <TableHead className="border text-right">Sell Qty</TableHead>
                                                <TableHead className="border text-right">Net Qty</TableHead>
                                                <TableHead className="border text-right">Net Value (₹)</TableHead>
                                                <TableHead className="border">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {stockFinderResults.map((r, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="border font-medium">{r.investorName}</TableCell>
                                                    <TableCell className="border font-medium">{r.symbol}</TableCell>
                                                    <TableCell className="border">{r.securityName}</TableCell>
                                                    <TableCell className="border text-right">{r.buyQty.toLocaleString()}</TableCell>
                                                    <TableCell className="border text-right">{r.sellQty.toLocaleString()}</TableCell>
                                                    <TableCell className="border text-right font-mono">{r.netQty.toLocaleString()}</TableCell>
                                                    <TableCell className="border text-right font-mono">{(Math.abs(r.netVal) / 10000000).toFixed(2)} Cr</TableCell>
                                                    <TableCell className="border">
                                                        <Badge variant={r.netVal > 0 ? 'default' : 'destructive'}>{r.netVal > 0 ? 'INCREASED' : 'DECREASED'}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                    <Dialog open={investorDialogOpen} onOpenChange={setInvestorDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="default" size="sm" className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                                <PlusCircle size={14} /> Add Investor
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Track High Value Investor</DialogTitle>
                                <DialogDescription>
                                    Add an investor or fund name to track their bulk/block deals from NSE.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Label htmlFor="investor-name">Investor / Fund Name</Label>
                                <Input
                                    id="investor-name"
                                    value={investorName}
                                    onChange={e => setInvestorName(e.target.value)}
                                    placeholder="e.g. HDFC Mutual Fund, Rakesh Jhunjhunwala"
                                    onKeyDown={e => e.key === 'Enter' && addInvestor()}
                                />
                            </div>
                            <DialogFooter>
                                <Button onClick={addInvestor}>Add</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            }
        >
            <div className="space-y-4">
                {investors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {investors.map(inv => (
                            <Badge key={inv.id} variant="secondary" className="gap-1 pr-1">
                                {inv.name}
                                <button onClick={() => removeInvestor(inv.id)} className="ml-1 hover:text-destructive font-bold">×</button>
                            </Badge>
                        ))}
                    </div>
                )}

                {matchedDeals.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Matched Bulk/Block Deals</h4>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="border">Date</TableHead>
                                        <TableHead className="border">Security</TableHead>
                                        <TableHead className="border">Client</TableHead>
                                        <TableHead className="border">Type</TableHead>
                                        <TableHead className="border text-right">Qty</TableHead>
                                        <TableHead className="border text-right">Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {matchedDeals.map((deal, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="border">{deal.date}</TableCell>
                                            <TableCell className="border">{deal.securityName || deal.symbol}</TableCell>
                                            <TableCell className="border font-medium">{deal.clientName}</TableCell>
                                            <TableCell className="border">
                                                <Badge variant={deal.buySell === 'BUY' ? 'default' : 'destructive'}>{deal.buySell}</Badge>
                                            </TableCell>
                                            <TableCell className="border text-right">{deal.quantityTraded.toLocaleString()}</TableCell>
                                            <TableCell className="border text-right">{'₹' + deal.tradePrice.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {isPending ? (
                    <div className="h-40 flex items-center justify-center text-center text-muted-foreground">
                        <p>Loading insider trades...</p>
                    </div>
                ) : trades.length > 0 ? (
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Yahoo Finance Insider Trades</h4>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="border">Insider</TableHead>
                                        <TableHead className="border">Transaction</TableHead>
                                        <TableHead className="border text-right">Shares</TableHead>
                                        <TableHead className="border text-right">Value (INR)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {trades.map((t, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="border font-medium">{t.relationship}</TableCell>
                                            <TableCell className="border">{t.transaction || 'N/A'}</TableCell>
                                            <TableCell className="border text-right">{t.shares.toLocaleString()}</TableCell>
                                            <TableCell className="border text-right">{'₹' + t.value.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="h-20 flex items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>No trades or deals to show.</p>
                    </div>
                )}
            </div>
        </SectionCard>
    );
};

const PortfolioNewsFeed = ({ ownedStocks, watchlist }: { ownedStocks: {name: string, symbol: string, quantity: number }[], watchlist?: { name: string, symbol: string }[] }) => {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [isPending, startTransition] = useTransition();
    const [showEmpty, setShowEmpty] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        const isIndianStock = (s: { symbol: string }) => s.symbol.includes('.BSE') || s.symbol.includes('.NSE');
        const allSymbols = [
            ...ownedStocks.filter(isIndianStock).map(s => s.symbol),
            ...(watchlist || []).filter(isIndianStock).map(s => s.symbol),
        ];
        const uniqueSymbols = [...new Set(allSymbols)];
        if (uniqueSymbols.length > 0) {
            setShowEmpty(false);
            startTransition(async () => {
                const result = await getPortfolioNews(uniqueSymbols);
                if (result.success && result.news && result.news.length > 0) {
                    setNews(result.news);
                } else {
                    setNews([]);
                    if (result.error) {
                         toast({
                            title: "Could not fetch news",
                            description: result.error,
                            variant: 'destructive'
                        });
                    }
                   // Show the empty message only after a short delay
                    timeoutId = setTimeout(() => setShowEmpty(true), 500);
                }
            });
        } else {
            setNews([]);
            setShowEmpty(true);
        }
        return () => clearTimeout(timeoutId);
    }, [ownedStocks, toast]);
    
    const formatPublishedDate = (published: string) => {
        try {
            // Check if it's already in a relative format
            if (published.includes('ago')) return published;

            // Otherwise, parse and format
            const date = new Date(published.replace(' ', 'T') + 'Z'); // Handle YYYY-MM-DD HH:MM:SS
            return formatDistanceToNow(date, { addSuffix: true });
        } catch (error) {
            // Fallback for unexpected formats
            return published;
        }
    };

    const renderContent = () => {
        if (isPending) {
            return (
                <div className="p-4 text-center text-muted-foreground">
                    <p>Fetching latest news...</p>
                </div>
            );
        }

        if (news.length > 0) {
            return news.map((article, index) => (
                <div key={index} className="p-4 border rounded-lg bg-secondary/30">
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        <h4 className="font-semibold flex items-center gap-2">{article.title} <ExternalLink size={14} /></h4>
                    </a>
                    <p className="text-xs text-muted-foreground mb-2">{article.source} - {formatPublishedDate(article.published)}</p>
                    <p className="text-sm">{article.summary}</p>
                </div>
            ));
        }

        if (showEmpty) {
            return (
                <div className="p-4 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>No news related to your holdings.</p>
                </div>
            );
        }

        return null;
    }

    return (
        <SectionCard
            title="Portfolio News Feed"
            description="Latest news and updates for stocks in your portfolio."
            action={isPending && <Loader2 className="animate-spin" />}
        >
            <div className="space-y-4">
                {renderContent()}
            </div>
        </SectionCard>
    );
};


const EditInvestableAmountDialog = ({ onSave, currentAmount }: { onSave: (amount: number) => void, currentAmount: number }) => {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState(currentAmount.toString());

    useEffect(() => {
        setAmount(currentAmount.toString());
    }, [currentAmount, open]);

    const handleSave = () => {
        const newAmount = parseFloat(amount);
        if (!isNaN(newAmount)) {
            onSave(newAmount);
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Edit size={14} /></Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle>Set Investable Amount</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="investable-amount">Amount</Label>
                    <Input id="investable-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter total amount" />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type EmailConfig = {
    email: string;
    appPassword: string;
};

const EmailSettingsDialog = ({ userEmail, userName }: { userEmail: string, userName: string }) => {
    const [open, setOpen] = useState(false);
    const [config, setConfig] = useState<EmailConfig>({ email: userEmail, appPassword: '' });
    const [sending, setSending] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        try {
            const saved = localStorage.getItem(EMAIL_CONFIG_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as EmailConfig;
                setConfig(parsed);
                setIsConfigured(!!(parsed.email && parsed.appPassword));
            }
        } catch {}
    }, [open]);

    const handleSave = () => {
        if (!config.appPassword) {
            toast({ title: 'App Password Required', description: 'Enter your Gmail App Password.', variant: 'destructive' });
            return;
        }
        localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(config));
        setIsConfigured(true);
        setOpen(false);
        toast({ title: 'Email Settings Saved', description: `Alerts will be sent from ${config.email}` });
    };

    const handleTest = async () => {
        setSending(true);
        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: config.email,
                    subject: 'Test Email from Stock Alert App',
                    text: `Hi ${userName},\n\nThis is a test email from your Stock Alert App. If you received this, email alerts are working!\n\nRegards,\nStock Alert App`,
                    smtpUser: config.email,
                    smtpPass: config.appPassword,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Test Email Sent', description: `Check ${config.email} inbox.` });
            } else {
                toast({ title: 'Failed', description: data.error || 'Check your SMTP settings.', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Could not send test email.', variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" title={isConfigured ? 'Email configured' : 'Configure email alerts'}>
                    <Mail size={14} className={isConfigured ? 'text-green-500' : ''} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Email Alert Settings</DialogTitle>
                    <DialogDescription>
                        Configure Gmail SMTP to send email alerts. Use a <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="underline">Gmail App Password</a>.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label>From Email</Label>
                        <Input value={config.email} onChange={e => setConfig(prev => ({ ...prev, email: e.target.value }))} placeholder="your@gmail.com" />
                    </div>
                    <div>
                        <Label>App Password</Label>
                        <Input type="password" value={config.appPassword} onChange={e => setConfig(prev => ({ ...prev, appPassword: e.target.value }))} placeholder="16-char Gmail App Password" />
                        <p className="text-xs text-muted-foreground mt-1">Generate from Google Account → Security → App Passwords</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleTest} disabled={sending || !config.email || !config.appPassword} className="w-full">
                        {sending ? 'Sending...' : 'Send Test Email'}
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export function PortfolioDashboard({ 
    investableAmount, 
    onSetInvestableAmount, 
    transactions, 
    setTransactions,
    userId,
    userName,
    userEmail
}: { 
    investableAmount: number; 
    onSetInvestableAmount: (amount: number) => void;
    transactions: Transaction[];
    setTransactions: (transactions: Transaction[]) => void;
    userId: string;
    userName: string;
    userEmail: string;
}) {
    const { toast } = useToast();
    const [alerts, setAlerts] = useState<AlertConfig[]>([]);
    const [watchlist, setWatchlist] = useState<{ name: string, symbol: string }[]>([]);

    useEffect(() => {
        if (!userId) return;
        try {
            const savedAlerts = localStorage.getItem(`stockAlerts_${userId}`);
            if (savedAlerts) {
                setAlerts(JSON.parse(savedAlerts));
            } else {
                setAlerts([]);
            }
            const savedWatchlist = localStorage.getItem(`smartWatchlist_${userId}`);
            if (savedWatchlist) {
                const parsed = JSON.parse(savedWatchlist);
                setWatchlist(parsed.map((s: any) => ({ name: s.name, symbol: s.symbol || s.name })));
            }
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        }
    }, [userId]);

    const SENT_ALERTS_KEY = `sentEmailAlerts_${userId}`;
    const [checkingAlerts, setCheckingAlerts] = useState(false);

    const sendDueAlerts = useCallback(async (forceAll = false) => {
        const emailConfig = localStorage.getItem(EMAIL_CONFIG_KEY);
        if (!emailConfig) { toast({ title: 'Email Not Configured', description: 'Set up email in Email Settings first.', variant: 'destructive' }); return; }
        const config: EmailConfig = JSON.parse(emailConfig);
        if (!config.email || !config.appPassword) { toast({ title: 'Email Not Configured', description: 'Set up email in Email Settings first.', variant: 'destructive' }); return; }

        setCheckingAlerts(true);
        const now = Date.now();
        const sentIds: string[] = JSON.parse(localStorage.getItem(SENT_ALERTS_KEY) || '[]');
        const storedAlerts: AlertConfig[] = JSON.parse(localStorage.getItem(`stockAlerts_${userId}`) || '[]');
        const due = storedAlerts.filter(a => {
            if (!a.email) return false;
            const id = `${a.stockId}_${a.threshold}_${a.period}`;
            if (sentIds.includes(id)) return false;
            if (forceAll) return true;
            return (now - (a.createdAt || now)) >= 60000;
        });

        if (due.length === 0) { setCheckingAlerts(false); if (!forceAll) return; toast({ title: 'No Due Alerts' }); return; }

        let sent = 0;
        for (const alert of due) {
            try {
                const r = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to: config.email, subject: `Stock Alert: ${alert.stockName} - ${alert.threshold}`,
                        text: `Hi ${userName},\n\nAlert for ${alert.stockName} triggered!\n\nThreshold: ${alert.threshold}\nPeriod: ${alert.period}\n\nRegards,\nStock Alert App`,
                        smtpUser: config.email, smtpPass: config.appPassword }) });
                const d = await r.json();
                if (!d.success) { console.error('Send fail:', d.error); continue; }
                const id = `${alert.stockId}_${alert.threshold}_${alert.period}`;
                localStorage.setItem(SENT_ALERTS_KEY, JSON.stringify([...JSON.parse(localStorage.getItem(SENT_ALERTS_KEY) || '[]'), id]));
                sent++;
            } catch (e) { console.error('Alert error:', e); }
        }
        setCheckingAlerts(false);
        if (sent > 0) toast({ title: `Alert${sent > 1 ? 's' : ''} Sent`, description: `${sent} email(s) sent.` });
    }, [userName, toast]);

    useEffect(() => {
        sendDueAlerts(false);
        const iv = setInterval(() => sendDueAlerts(false), 10000);
        return () => clearInterval(iv);
    }, [sendDueAlerts]);

    useEffect(() => {
        if (!userId) return;
        const storedAlerts: AlertConfig[] = JSON.parse(localStorage.getItem(`stockAlerts_${userId}`) || '[]');
        storedAlerts.forEach(a => {
            if (!a.createdAt) { a.createdAt = Date.now(); }
        });
        localStorage.setItem(`stockAlerts_${userId}`, JSON.stringify(storedAlerts));
    }, [userId]);

    const handleSetAlerts = useCallback((newAlerts: AlertConfig[]) => {
        if (!userId) return;
        setAlerts(newAlerts);
        localStorage.setItem(`stockAlerts_${userId}`, JSON.stringify(newAlerts));
    }, [userId]);
    
     const ownedStocks = useMemo(() => {
        const portfolio: { [key: string]: { name: string, symbol: string, quantity: number } } = {};
        const lookupSymbol = (stockName: string, stockSymbol: string) => {
            if (stockSymbol) return stockSymbol;
            const found = allStocks.find(s => s.name.toLowerCase() === stockName.toLowerCase());
            return found ? found.symbol : stockName.toUpperCase().replace(/\s/g, '');
        };

        transactions.forEach(tx => {
            const key = tx.stockName.toLowerCase().trim();
            if (!portfolio[key]) {
                portfolio[key] = { name: tx.stockName, symbol: lookupSymbol(tx.stockName, tx.stockSymbol), quantity: 0 };
            }
            if (tx.type === 'buy') {
                portfolio[key].quantity += tx.quantity;
            } else {
                portfolio[key].quantity -= tx.quantity;
            }
        });

        return Object.values(portfolio).filter(stock => stock.quantity > 0);
    }, [transactions]);
    
    const summary = useMemo(() => {
        const invested = transactions.filter(t => t.type === 'buy').reduce((sum, tx) => sum + (tx.quantity * tx.price), 0);
        const sold = transactions.filter(t => t.type === 'sell').reduce((sum, tx) => sum + (tx.quantity * tx.price), 0);
        const availableBalance = investableAmount - invested + sold;
        
        const tempPortfolio: { [key: string]: { quantity: number, totalCost: number, totalBuyQty: number, salesValue: number, totalSellQty: number } } = {};
        transactions.forEach(tx => {
            if (!tempPortfolio[tx.stockSymbol]) tempPortfolio[tx.stockSymbol] = { quantity: 0, totalCost: 0, totalBuyQty: 0, salesValue: 0, totalSellQty: 0 };
            const stock = tempPortfolio[tx.stockSymbol];
            const amount = tx.quantity * tx.price;
            if (tx.type === 'buy') {
                stock.quantity += tx.quantity;
                stock.totalCost += amount;
                stock.totalBuyQty += tx.quantity;
            } else {
                stock.quantity -= tx.quantity;
                stock.salesValue += amount;
                stock.totalSellQty += tx.quantity;
            }
        });

        const costOfCurrentHoldings = Object.values(tempPortfolio)
            .filter(s => s.quantity > 0)
            .reduce((sum, s) => {
                const avgBuyPrice = s.totalBuyQty > 0 ? s.totalCost / s.totalBuyQty : 0;
                return sum + (s.quantity * avgBuyPrice);
            }, 0);

        const totalRealizedPnl = Object.values(tempPortfolio).reduce((sum, s) => {
            if (s.totalSellQty > 0) {
                const avgBuyPrice = s.totalBuyQty > 0 ? s.totalCost / s.totalBuyQty : 0;
                const costOfSoldShares = s.totalSellQty * avgBuyPrice;
                return sum + (s.salesValue - costOfSoldShares);
            }
            return sum;
        }, 0);

        return {
            invested: costOfCurrentHoldings,
            realizedPnl: totalRealizedPnl,
            availableBalance
        };
    }, [transactions, investableAmount]);


    const handleAddTrade = useCallback((newTrade: Omit<Transaction, 'id'>) => {
        setTransactions([...transactions, { ...newTrade, id: Date.now().toString() }]);
    }, [transactions, setTransactions]);

    const handleEditTrade = useCallback((updatedTrade: Transaction) => {
        setTransactions(transactions.map(tx => tx.id === updatedTrade.id ? updatedTrade : tx));
        toast({ title: "Trade Updated", description: `Details for ${updatedTrade.stockName} have been updated.`})
    }, [transactions, setTransactions, toast]);

    const handleDeleteTrade = useCallback((tradeId: string) => {
        const tradeToDelete = transactions.find(tx => tx.id === tradeId);
        setTransactions(transactions.filter(tx => tx.id !== tradeId));
        if (tradeToDelete) {
             toast({ title: "Trade Deleted", description: `${tradeToDelete.stockName} trade removed from history.`, variant: "destructive" });
        }
    }, [transactions, setTransactions, toast]);
    
    const formatCurrencyNoDecimal = (amount: number) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
    
    return (
        <div className="space-y-6">
            <Card className="shadow-md mb-6">
                <CardContent className="p-4 space-y-2">
                     <div className="grid grid-cols-3 text-center">
                        <div>
                            <div className="flex items-center justify-center gap-2">
                                <p className="text-muted-foreground text-sm">Investable Amount</p>
                                <EditInvestableAmountDialog onSave={onSetInvestableAmount} currentAmount={investableAmount} />
                                <EmailSettingsDialog userEmail={userEmail} userName={userName} />
                            </div>
                            <p className="text-sm font-bold">{formatCurrencyNoDecimal(investableAmount)}</p>
                        </div>
                         <div>
                            <p className="text-muted-foreground text-sm">Invested</p>
                            <p className="text-sm font-bold">{formatCurrencyNoDecimal(summary.invested)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm">Balance</p>
                            <p className="text-sm font-bold">{formatCurrencyNoDecimal(summary.availableBalance)}</p>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="flex justify-around items-center text-center">
                         <p className="text-sm text-muted-foreground">Portfolio P&L Summary</p>
                         <div>
                              <p className="text-xs text-muted-foreground">Realized P&L</p>
                              <div className={cn("text-sm font-bold", summary.realizedPnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                                 {formatCurrencyNoDecimal(summary.realizedPnl)}
                              </div>
                         </div>
                    </div>
                </CardContent>
            </Card>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="link" size="sm" onClick={() => sendDueAlerts(true)} disabled={checkingAlerts} className="h-6 text-xs">
                        {checkingAlerts ? 'Sending...' : 'Send Alerts Now'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                        localStorage.removeItem(SENT_ALERTS_KEY);
                        localStorage.removeItem(`stockAlerts_${userId}`);
                        toast({ title: 'Alerts Reset', description: 'All alerts and sent history cleared.' });
                    }} className="h-6 text-xs text-muted-foreground">
                        Reset Alerts
                    </Button>
                </div>
                <div />
            </div>
            {alerts.length > 0 && (
                <details className="text-xs text-muted-foreground border rounded p-2">
                    <summary className="cursor-pointer">Alert Debug ({alerts.length})</summary>
                    <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px]">
                        {JSON.stringify(alerts.map(a => ({
                            stock: a.stockName,
                            threshold: a.threshold,
                            period: a.period,
                            email: a.email,
                            createdAt: a.createdAt ? new Date(a.createdAt).toLocaleTimeString() : 'N/A',
                            elapsed: a.createdAt ? Math.round((Date.now() - a.createdAt)/1000) + 's' : 'N/A',
                            sentBefore: JSON.parse(localStorage.getItem(SENT_ALERTS_KEY) || '[]').includes(`${a.stockId}_${a.threshold}_${a.period}`),
                        })), null, 2)}
                    </pre>
                </details>
            )}
            <MyHoldings transactions={transactions} ownedStocks={ownedStocks} alerts={alerts} setAlerts={handleSetAlerts} userId={userId} />
            <TradeHistory 
                transactions={transactions} 
                onAddTrade={handleAddTrade} 
                onDeleteTrade={handleDeleteTrade}
                onEditTrade={handleEditTrade}
                investableAmount={investableAmount} 
                ownedStocks={ownedStocks} 
                alerts={alerts}
                setAlerts={handleSetAlerts}
                userId={userId}
            />
            <TradesAndDeals ownedStocks={ownedStocks} />
            <PortfolioNewsFeed ownedStocks={ownedStocks.filter(s => s.symbol.includes('.BSE') || s.symbol.includes('.NSE'))} watchlist={watchlist.filter(s => s.symbol.includes('.BSE') || s.symbol.includes('.NSE'))} />
        </div>
    );
}

    
