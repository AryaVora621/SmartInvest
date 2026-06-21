'use client';

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "./ui/button";
import { Download, Plus, Trash2, Pencil } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";

type Entry = {
    id: string;
    date: string;
    type: 'bank-to-broker' | 'broker-to-bank' | 'dividend';
    amount: number;
    narration: string;
};

const typeConfig = {
    'bank-to-broker': { label: 'SENT TO BROCKER\'S A/C.' },
    'broker-to-bank': { label: 'RECEIVED FROM BROCKER\'S A/C.' },
    'dividend': { label: 'DIVIDEND RECEIVED' },
};

const blueBtn = 'bg-blue-600 hover:bg-blue-700 text-white';

function formatINR(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function CashbookDashboard() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<Entry['type']>('bank-to-broker');
    const [amount, setAmount] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const saved = localStorage.getItem('personalAcEntries');
        if (saved) setEntries(JSON.parse(saved));
    }, []);

    const saveEntries = useCallback((newEntries: Entry[]) => {
        setEntries(newEntries);
        localStorage.setItem('personalAcEntries', JSON.stringify(newEntries));
        window.dispatchEvent(new Event('storage'));
    }, []);

    const totalToBroker = entries.filter(e => e.type === 'bank-to-broker').reduce((s, e) => s + e.amount, 0);
    const totalFromBroker = entries.filter(e => e.type === 'broker-to-bank').reduce((s, e) => s + e.amount, 0);
    const totalDividend = entries.filter(e => e.type === 'dividend').reduce((s, e) => s + e.amount, 0);
    const netBalance = totalFromBroker + totalDividend - totalToBroker;

    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const displayEntries = showAll ? sortedEntries : sortedEntries.slice(-3);

    const handleAddEntry = () => {
        const amt = parseFloat(amount) || 0;
        if (amt <= 0) {
            toast({ title: "Error", description: "Please enter a valid amount.", variant: "destructive" });
            return;
        }
        if (editingId) {
            const updated = entries.map(e => e.id === editingId ? { ...e, date, type, amount: amt } : e);
            saveEntries(updated);
            setEditingId(null);
            toast({ title: "Entry Updated", description: `${typeConfig[type].label} updated.` });
        } else {
            const newEntry: Entry = { id: Date.now().toString(), date, type, amount: amt, narration: '' };
            saveEntries([...entries, newEntry]);
            toast({ title: "Entry Added", description: `${typeConfig[type].label} recorded.` });
        }
        setAmount('');
    };

    const handleEditEntry = (entry: Entry) => {
        setDate(entry.date);
        setType(entry.type);
        setAmount(entry.amount.toString());
        setEditingId(entry.id);
    };

    const handleDeleteEntry = (id: string) => {
        saveEntries(entries.filter(e => e.id !== id));
        toast({ title: "Entry Deleted", description: "Entry has been removed." });
    };

    const handleExport = () => {
        if (sortedEntries.length === 0) {
            toast({ title: "No Data", description: "No entries to export.", variant: "destructive" });
            return;
        }
        const headers = ["Date", "Type", "CREDIT (IN)", "DEBIT (OUT)", "Running Balance ($)"];
        const csvRows = [headers.join(',')];
        let bal = 0;
        sortedEntries.forEach(e => {
            if (e.type === 'bank-to-broker') bal -= e.amount;
            else bal += e.amount;
            const credit = e.type === 'broker-to-bank' || e.type === 'dividend' ? e.amount.toFixed(2) : '';
            const debit = e.type === 'bank-to-broker' ? e.amount.toFixed(2) : '';
            csvRows.push([e.date, typeConfig[e.type].label, credit, debit, bal.toFixed(2)].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", 'personal-account.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Complete", description: "Personal A/C data exported." });
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <div className="flex items-baseline gap-2">
                        <CardTitle className="font-headline text-base">Personal A/C</CardTitle>
                        <CardDescription className="text-xs">Track fund movements between your bank and Broker's A/C, plus dividends.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="bg-orange-500/10 rounded-lg p-4 text-center">
                            <p className="text-xs text-muted-foreground">To Broker (Sent)</p>
                            <p className="text-2xl font-bold text-orange-600">{formatINR(totalToBroker)}</p>
                        </div>
                        <div className="bg-blue-500/10 rounded-lg p-4 text-center">
                            <p className="text-xs text-muted-foreground">From Broker (Recv)</p>
                            <p className="text-2xl font-bold text-blue-600">{formatINR(totalFromBroker)}</p>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-4 text-center">
                            <p className="text-xs text-muted-foreground">Dividends</p>
                            <p className="text-2xl font-bold text-green-600">{formatINR(totalDividend)}</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-4 text-center">
                            <p className="text-xs text-muted-foreground">Total Entries</p>
                            <p className="text-2xl font-bold">{entries.length}</p>
                        </div>
                    </div>

                    <div className="border rounded-lg p-4 space-y-4 mb-6">
                        <h4 className="font-semibold text-sm flex items-center gap-2"><Plus size={14} />New Entry</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-white">Date</Label>
                                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-white">Type</Label>
                                <select
                                    value={type}
                                    onChange={e => setType(e.target.value as Entry['type'])}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white"
                                >
                                    {Object.entries(typeConfig).map(([key, cfg]) => (
                                        <option key={key} value={key} className="text-white">{cfg.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-white">Amount ($)</Label>
                                <Input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="text-white placeholder:text-white" />
                            </div>
                            <div className="flex items-end">
                                <Button className={blueBtn} onClick={handleAddEntry}><Plus className="mr-1 h-4 w-4" />{editingId ? 'Update Entry' : 'Add Entry'}</Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mb-4">
                        {entries.length > 3 && (
                            <Button className={blueBtn} onClick={() => setShowAll(!showAll)}>
                                {showAll ? 'HIDE' : 'SEE ALL'}
                            </Button>
                        )}
                        <Button className={blueBtn} onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />Export to Excel
                        </Button>
                    </div>

                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="border text-black">Date</TableHead>
                                    <TableHead className="border text-black">Type</TableHead>
                                    <TableHead className="border text-right text-green-600">CREDIT (IN)</TableHead>
                                    <TableHead className="border text-right text-red-600">DEBIT (OUT)</TableHead>
                                    <TableHead className="border text-right text-black">Running Balance ($)</TableHead>
                                    <TableHead className="border text-center text-black">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayEntries.length > 0 ? (() => {
                                    let bal = 0;
                                    for (const e of sortedEntries) {
                                        if (e.type === 'bank-to-broker') bal -= e.amount;
                                        else bal += e.amount;
                                    }
                                    const reversed = [...displayEntries].reverse();
                                    const rows: any[] = [];
                                    const displaySet = new Set(displayEntries.map(e => e.id));
                                    for (const e of sortedEntries) {
                                        if (e.type === 'bank-to-broker') bal -= e.amount;
                                        else bal += e.amount;
                                        if (displaySet.has(e.id)) {
                                            rows.push({ entry: e, balance: bal });
                                        }
                                    }
                                    return rows.reverse().map(({ entry: e, balance }) => {
                                        const cfg = typeConfig[e.type];
                                        return (
                                            <TableRow key={e.id}>
                                                <TableCell className="border whitespace-nowrap text-black">{e.date}</TableCell>
                                                <TableCell className="border text-black">{cfg.label}</TableCell>
                                                <TableCell className="border text-right text-green-600 font-medium">{e.type === 'broker-to-bank' || e.type === 'dividend' ? formatINR(e.amount) : ''}</TableCell>
                                                <TableCell className="border text-right text-red-600 font-medium">{e.type === 'bank-to-broker' ? formatINR(e.amount) : ''}</TableCell>
                                                <TableCell className="border text-right font-semibold text-black">{formatINR(balance)}</TableCell>
                                                <TableCell className="border text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEntry(e)}>
                                                            <Pencil size={14} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteEntry(e.id)}>
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    });
                                })() : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="border text-center text-black py-12">No entries yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}