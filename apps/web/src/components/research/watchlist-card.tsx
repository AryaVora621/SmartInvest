

'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BellPlus, ListPlus, Trash2, BellRing, Mail, Send, History, PlusCircle } from "lucide-react";
import type { Stock, WatchlistStock, AlertConfig, SentAlert } from "@/types";
import { evaluateAlerts } from "@/actions/alert-actions";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { useAlertThresholds } from '@/hooks/use-alert-thresholds';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';


const alertPeriods = ["Auto", "15 min.", "30 min.", "1 hour", "1 Day", "Week", "4 Week", "52 Week"];

const initialSentAlerts: SentAlert[] = [
    { id: 1, stockName: 'Apple', message: 'Price Gain > 10%', sentVia: ['email', 'telegram'], time: new Date(Date.now() - 2 * 60 * 60 * 1000), source: 'Port' },
    { id: 2, stockName: 'NVIDIA', message: 'Near 52 Week High', sentVia: ['email'], time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), source: 'WL' },
    { id: 3, stockName: 'JPMorgan Chase', message: 'Golden Crossover', sentVia: ['telegram'], time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), source: 'Port' },
];

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
        onOpenChange(false);
    }

    return (
         <DialogContent className="w-full max-w-lg">
            <DialogHeader>
                <DialogTitle className="text-base">Add Custom Threshold</DialogTitle>
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

const SetAlertsDialog = ({ stock, children, onAlertSave, allAlerts }: { stock: WatchlistStock, children: React.ReactNode, onAlertSave: (alert: AlertConfig) => void, allAlerts: AlertConfig[] }) => {
    const [open, setOpen] = useState(false);
    const [addThresholdOpen, setAddThresholdOpen] = useState(false);
    const { alertThresholds } = useAlertThresholds();

    const [period, setPeriod] = useState(alertPeriods[0]);
    const [threshold, setThreshold] = useState('');
    const [email, setEmail] = useState(false);
    const [telegram, setTelegram] = useState(false);
    const { toast } = useToast();
    
    const handleSave = () => {
        const stockAlerts = allAlerts.filter(a => a.stockId === stock.id);
        const isUpdating = stockAlerts.some(a => a.threshold === threshold);

        if (!isUpdating && stockAlerts.length >= 5) {
             toast({
                title: "Alert Limit Reached",
                description: "You can only set a maximum of 5 alerts per stock.",
                variant: "destructive",
            });
            return;
        }
        onAlertSave({ stockId: stock.id, stockName: stock.name, period, threshold, email, telegram });
        setOpen(false);
    };

    return (
        <>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-base">Set Alerts for {stock?.name}</DialogTitle>
                </DialogHeader>
                <div className="pt-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Period</Label>
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger><SelectValue placeholder="Select Time Period" /></SelectTrigger>
                            <SelectContent>
                                {alertPeriods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                        <div className="space-y-2">
                        <Label>Threshold</Label>
                        <Select value={threshold} onValueChange={setThreshold}>
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
                                <Separator/>
                                <Button variant="ghost" className="w-full justify-start mt-1" onClick={() => { setAddThresholdOpen(true); setOpen(false); }}>
                                    <PlusCircle className="mr-2" /> Add Threshold
                                </Button>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="email-alert" checked={email} onCheckedChange={(c) => setEmail(Boolean(c))} />
                            <Label htmlFor="email-alert" className="flex items-center gap-1"><Mail size={14}/>Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="telegram-alert" checked={telegram} onCheckedChange={(c) => setTelegram(Boolean(c))} />
                            <Label htmlFor="telegram-alert" className="flex items-center gap-1"><Send size={14}/>Telegram</Label>
                        </div>
                    </div>
                    <Button variant="secondary" className="w-full" onClick={handleSave}>Add Alert</Button>
                </div>
            </DialogContent>
        </Dialog>
        <Dialog open={addThresholdOpen} onOpenChange={setAddThresholdOpen}>
            <AddThresholdDialog onOpenChange={setAddThresholdOpen} />
        </Dialog>
        </>
    );
};

export function WatchlistCard({ onStockSelect, userId }: { onStockSelect: (stock: Stock) => void, userId: string }) {
    const { toast } = useToast();
    const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
    const [alerts, setAlerts] = useState<AlertConfig[]>([]);
    const [sentAlerts, setSentAlerts] = useState<SentAlert[]>([]);
    const [checking, setChecking] = useState(false);
    
    const loadData = useCallback(() => {
        if (!userId) return;
        try {
            const savedWatchlist = localStorage.getItem(`smartWatchlist_${userId}`);
            if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
            else setWatchlist([]);
            
            const savedAlerts = localStorage.getItem(`stockAlerts_${userId}`);
            if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
            else setAlerts([]);

            const savedSentAlerts = localStorage.getItem(`sentAlerts_${userId}`);
            const alertsToUse = savedSentAlerts ? JSON.parse(savedSentAlerts) : initialSentAlerts;

            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const filteredSentAlerts = alertsToUse.filter((alert: SentAlert) => new Date(alert.time) > threeDaysAgo);
            setSentAlerts(filteredSentAlerts.slice(0, 5));

        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        }
    }, [userId]);

    useEffect(() => {
        loadData();
        const handleStorageChange = () => loadData();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [userId, loadData]);

    const handleDeleteFromWatchlist = useCallback((stockId: string) => {
        if (!userId) return;
        const newWatchlist = watchlist.filter(s => s.id !== stockId);
        setWatchlist(newWatchlist);
        localStorage.setItem(`smartWatchlist_${userId}`, JSON.stringify(newWatchlist));
        
        const newAlerts = alerts.filter(a => a.stockId !== stockId);
        setAlerts(newAlerts);
        localStorage.setItem(`stockAlerts_${userId}`, JSON.stringify(newAlerts));

        toast({ title: "Stock Removed", description: "The stock and its alerts have been removed from your watchlist." });
    }, [userId, watchlist, alerts, toast]);

    const handleAddAlert = useCallback((newAlert: AlertConfig) => {
        if (!userId) return;
        const existingAlertIndex = alerts.findIndex(a => a.stockId === newAlert.stockId && a.threshold === newAlert.threshold);
        let newAlerts;
        if (existingAlertIndex > -1) {
            newAlerts = [...alerts];
            newAlerts[existingAlertIndex] = newAlert;
        } else {
            const stockAlerts = alerts.filter(a => a.stockId === newAlert.stockId);
            if (stockAlerts.length >= 5) {
                toast({
                    title: "Alert Limit Reached",
                    description: "You can only set a maximum of 5 alerts per stock.",
                    variant: "destructive",
                });
                return;
            }
            newAlerts = [...alerts, newAlert];
        }
        
        setAlerts(newAlerts);
        localStorage.setItem(`stockAlerts_${userId}`, JSON.stringify(newAlerts));
        
        toast({ title: "Alert Set", description: `New alert for ${newAlert.stockName} has been created.` });
    }, [userId, alerts, toast]);

    const handleDeleteAlert = useCallback((stockId: string, threshold: string) => {
        if (!userId) return;
        const newAlerts = alerts.filter(a => !(a.stockId === stockId && a.threshold === threshold));
        setAlerts(newAlerts);
        localStorage.setItem(`stockAlerts_${userId}`, JSON.stringify(newAlerts));
        toast({ title: "Alert Removed" });
    }, [userId, alerts, toast]);

    const handleDeleteSentAlert = useCallback((alertId: number) => {
        if (!userId) return;
        const newSentAlerts = sentAlerts.filter(alert => alert.id !== alertId);
        setSentAlerts(newSentAlerts);
        // Also update the full list in localStorage
        try {
            const allSentAlerts = JSON.parse(localStorage.getItem(`sentAlerts_${userId}`) || JSON.stringify(initialSentAlerts));
            const updatedAll = allSentAlerts.filter((a: SentAlert) => a.id !== alertId);
            localStorage.setItem(`sentAlerts_${userId}`, JSON.stringify(updatedAll));
        } catch (error) {
            console.error("Failed to update sent alerts in localStorage", error);
        }
        toast({ title: "Sent Alert Cleared" });
    }, [userId, sentAlerts, toast]);

    // Evaluate every configured alert against live Yahoo quotes, dispatch the ones that
    // fire over whatever channels the user has credentials for, and record them.
    const handleCheckNow = useCallback(async () => {
        if (!userId || !alerts.length) return;
        setChecking(true);
        try {
            const triggered = await evaluateAlerts(alerts);
            if (!triggered.length) {
                toast({ title: "No alerts triggered", description: "Checked live prices — nothing met your thresholds right now." });
                return;
            }

            let emailCfg: any = null;
            let tgCfg: any = null;
            try { emailCfg = JSON.parse(localStorage.getItem('email_smtp_config') || 'null'); } catch {}
            try { tgCfg = JSON.parse(localStorage.getItem('telegram_config') || 'null'); } catch {}

            const newEntries: SentAlert[] = [];
            let nextId = Date.now();
            for (const t of triggered) {
                const sentVia: ('email' | 'telegram')[] = [];
                if (t.via.includes('email') && emailCfg?.email && emailCfg?.appPassword) {
                    try {
                        const r = await fetch('/api/send-email', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ to: emailCfg.email, subject: `Stock Alert: ${t.stockName}`, text: t.message, smtpUser: emailCfg.email, smtpPass: emailCfg.appPassword }),
                        });
                        if ((await r.json()).success) sentVia.push('email');
                    } catch {}
                }
                if (t.via.includes('telegram') && tgCfg?.botToken && tgCfg?.chatId) {
                    try {
                        const r = await fetch('/api/send-telegram', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ botToken: tgCfg.botToken, chatId: tgCfg.chatId, text: t.message }),
                        });
                        if ((await r.json()).success) sentVia.push('telegram');
                    } catch {}
                }
                newEntries.push({ id: nextId++, stockName: t.stockName, message: t.message, sentVia, time: new Date(), source: 'WL' });
            }

            const stored = JSON.parse(localStorage.getItem(`sentAlerts_${userId}`) || '[]');
            const updated = [...newEntries, ...stored];
            localStorage.setItem(`sentAlerts_${userId}`, JSON.stringify(updated));
            setSentAlerts(updated.slice(0, 5));

            const dispatched = newEntries.filter(e => e.sentVia.length).length;
            toast({
                title: `${triggered.length} alert${triggered.length > 1 ? 's' : ''} triggered`,
                description: dispatched ? `${dispatched} sent via your configured channels.` : "Recorded below. Add email/Telegram credentials to auto-send.",
            });
        } catch (e) {
            toast({ title: "Check failed", description: e instanceof Error ? e.message : "Could not evaluate alerts.", variant: "destructive" });
        } finally {
            setChecking(false);
        }
    }, [userId, alerts, toast]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-baseline gap-2">
                    <CardTitle className="font-headline text-base flex items-baseline gap-2">
                        <ListPlus className="text-primary" />
                        Smart Watchlist
                    </CardTitle>
                    <CardDescription className="text-xs">Monitor stocks and set custom alerts to track opportunities.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <ScrollArea className="h-60">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">Company</TableHead>
                                <TableHead className="text-xs">Price</TableHead>
                                <TableHead className="text-xs">P/E</TableHead>
                                <TableHead className="text-right text-xs">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {watchlist.length > 0 ? watchlist.map(stock => (
                                <TableRow key={stock.id} className="text-xs">
                                    <TableCell>{format(new Date(stock.date), 'yyyy-MM-dd')}</TableCell>
                                    <TableCell className="font-medium">{stock.name}</TableCell>
                                    <TableCell>${stock.price.toFixed(2)}</TableCell>
                                    <TableCell>{stock.pe.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <SetAlertsDialog stock={stock} onAlertSave={handleAddAlert} allAlerts={alerts}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                <BellPlus size={14} />
                                            </Button>
                                        </SetAlertsDialog>
                                         <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteFromWatchlist(stock.id)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-xs">
                                        Your watchlist is empty. Add stocks from the calculators.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
                
                {alerts.length > 0 &&
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold flex items-center gap-2 text-sm"><BellRing size={14} /> Active Alerts</h4>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleCheckNow} disabled={checking}>
                                <BellRing size={12} /> {checking ? 'Checking…' : 'Check Now'}
                            </Button>
                        </div>
                        <ScrollArea className="h-32">
                        {alerts.map((alert, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md text-xs mb-1">
                                <div>
                                    <p className="font-medium">{alert.stockName}</p>
                                    <p className="text-xs text-muted-foreground">{alert.threshold} ({alert.period})</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {alert.email && <Mail size={14} className="text-muted-foreground" />}
                                    {alert.telegram && <Send size={14} className="text-muted-foreground" />}
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteAlert(alert.stockId, alert.threshold)}>
                                        <Trash2 size={14} className="text-destructive"/>
                                    </Button>
                                </div>
                            </div>
                        ))}
                        </ScrollArea>
                    </div>
                }

                {sentAlerts.length > 0 &&
                    <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2 text-sm"><History size={14} /> Last 3 Days Sent Alerts</h4>
                         <ScrollArea className="h-32">
                        {sentAlerts.map((alert) => (
                            <div key={alert.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md text-xs mb-1">
                                <div>
                                    <p className="font-medium">{alert.stockName}: {alert.message} ({alert.source})</p>
                                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(alert.time), { addSuffix: true })}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {alert.sentVia.includes('email') && <Mail size={14} className="text-muted-foreground" title="Sent via Email" />}
                                    {alert.sentVia.includes('telegram') && <Send size={14} className="text-muted-foreground" title="Sent via Telegram" />}
                                     <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteSentAlert(alert.id)}>
                                        <Trash2 size={14} className="text-destructive"/>
                                    </Button>
                                </div>
                            </div>
                        ))}
                        </ScrollArea>
                    </div>
                }
            </CardContent>
        </Card>
    );
}
