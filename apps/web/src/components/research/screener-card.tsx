

'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ListFilter, PlusCircle, Edit, Trash2, ChevronDown } from "lucide-react";
import type { Screener } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '@/lib/utils';

const initialScreeners: Screener[] = [
    { id: '1', name: '0001 - Value Large Caps', criteria: 'Market Cap > $10B AND P/E Ratio < 15 AND ROCE > 15%' },
    { id: '2', name: '0002 - Tech Growth Stars', criteria: 'Sector = "Technology" AND Sales Growth (3Y) > 20% AND Country = "USA"' },
];

export function ScreenerCard({ onFindStocks, userId }: { onFindStocks: (criteria: string) => void, userId: string }) {
    const [screeners, setScreeners] = useState<Screener[]>([]);
    const [selectedScreener, setSelectedScreener] = useState<Screener | null>(null);
    const { toast } = useToast();

    const handleSetScreeners = useCallback((newScreeners: Screener[]) => {
        if (!userId) return;
        setScreeners(newScreeners);
        try {
            localStorage.setItem(`screeners_${userId}`, JSON.stringify(newScreeners));
        } catch (error) {
             toast({ title: "Error", description: "Could not save screeners.", variant: "destructive" });
        }
    }, [userId, toast]);

    useEffect(() => {
        if (!userId) return;

        try {
            const savedScreeners = localStorage.getItem(`screeners_${userId}`);
            if (savedScreeners) {
                const parsedScreeners = JSON.parse(savedScreeners);
                setScreeners(parsedScreeners);
                if (!selectedScreener || !parsedScreeners.find((s: Screener) => s.id === selectedScreener.id)) {
                    setSelectedScreener(parsedScreeners[0] || null);
                }
            } else {
                handleSetScreeners(initialScreeners);
                setSelectedScreener(initialScreeners[0] || null);
            }
        } catch (error) {
            console.error("Failed to load screeners:", error);
            setScreeners(initialScreeners);
            setSelectedScreener(initialScreeners[0] || null);
            toast({ title: "Error", description: "Could not load screeners from local storage.", variant: "destructive" });
        }
    }, [userId, toast, handleSetScreeners, selectedScreener]);

    const handleSelectScreener = (screenerId: string) => {
        const screener = screeners.find(s => s.id === screenerId);
        if (screener) {
            setSelectedScreener(screener);
            toast({ title: 'Screener Selected', description: screener.name });
        }
    };
    
    const findStocks = () => {
        if (selectedScreener) {
            onFindStocks(selectedScreener.criteria);
            toast({ title: "Searching for stocks...", description: `Using screener: ${selectedScreener.name}` });
        } else {
            toast({ title: "No Screener Selected", description: "Please select a screener first.", variant: 'destructive'});
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                        <CardTitle className="flex items-center gap-2 font-headline text-base">
                            <ListFilter className="text-primary" />
                            Screener
                        </CardTitle>
                        <CardDescription className="text-xs">Select or create a screener to find investment opportunities.</CardDescription>
                    </div>
                     <ManageScreensDialog screeners={screeners} setScreeners={handleSetScreeners} />
                </div>
            </CardHeader>
            <CardContent>
                {screeners.length > 0 ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
                            <div className="space-y-1">
                                <Label htmlFor="screener-select" className="text-xs">Select a Screen</Label>
                                <Select onValueChange={handleSelectScreener} value={selectedScreener?.id}>
                                    <SelectTrigger id="screener-select" className="text-white">
                                        <SelectValue placeholder="Select a screener" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {screeners.map((screener) => (
                                            <SelectItem key={screener.id} value={screener.id}>{screener.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full md:w-auto" onClick={findStocks} disabled={!selectedScreener}>Find Stocks</Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        <p>No screeners available.</p>
                        <p className="text-xs">Create one to get started.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ManageScreensDialog({ screeners, setScreeners }: { screeners: Screener[], setScreeners: (screeners: Screener[]) => void }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handleAdd = (screener: Omit<Screener, 'id'>) => {
        const newScreeners = [...screeners, { ...screener, id: Date.now().toString() }];
        setScreeners(newScreeners);
        toast({ title: "Screener Created", description: `Successfully created "${screener.name}".` });
    };
    
    const handleEdit = (updatedScreener: Screener) => {
        const newScreeners = screeners.map(s => s.id === updatedScreener.id ? updatedScreener : s);
        setScreeners(newScreeners);
        toast({ title: "Screener Updated", description: `Successfully updated "${updatedScreener.name}".` });
    };

    const handleDelete = (id: string) => {
        const newScreeners = screeners.filter(s => s.id !== id);
        setScreeners(newScreeners);
        toast({ title: "Screener Deleted" });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-white">Create / Edit Screens</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <div className="flex items-baseline gap-2">
                        <DialogTitle className="text-base">Manage Custom Screens</DialogTitle>
                        <DialogDescription className="text-xs">Create, edit, or delete your custom screeners.</DialogDescription>
                    </div>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <AddEditScreenerDialog onSave={handleAdd}>
                        <Button><PlusCircle className="mr-2 h-4 w-4" />Create New Screen</Button>
                    </AddEditScreenerDialog>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {screeners.map(screener => (
                            <div key={screener.id} className="p-3 border rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-sm">{screener.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{screener.criteria}</p>
                                </div>
                                <div className="flex gap-2">
                                     <AddEditScreenerDialog screener={screener} onSave={handleEdit}>
                                        <Button size="icon" variant="ghost"><Edit size={16} /></Button>
                                    </AddEditScreenerDialog>
                                    <Button size="icon" variant="ghost" onClick={() => handleDelete(screener.id)}><Trash2 size={16} className="text-destructive" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function AddEditScreenerDialog({ children, screener, onSave }: { children: React.ReactNode, screener?: Screener, onSave: (data: any) => void }) {
    const [open, setOpen] = useState(false);
    const [criteriaOpen, setCriteriaOpen] = useState(false);
    const [name, setName] = useState(screener?.name || '');
    const [criteria, setCriteria] = useState(screener?.criteria || '');
    
    useEffect(() => {
        if (open) {
            if (screener) {
                setName(screener.name);
                setCriteria(screener.criteria);
            } else {
                setName('');
                setCriteria('');
            }
            setCriteriaOpen(!!screener);
        }
    }, [screener, open]);


    const handleSave = () => {
        onSave({ id: screener?.id, name, criteria });
        setOpen(false);
        if(!screener) {
            setName('');
            setCriteria('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-base">{screener ? 'Edit' : 'Create'} Screener</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Input placeholder="Screener Name" value={name} onChange={e => setName(e.target.value)} />
                    <Collapsible open={criteriaOpen} onOpenChange={setCriteriaOpen}>
                        <CollapsibleTrigger asChild>
                             <div className='flex items-center justify-between border p-2 rounded-md cursor-pointer'>
                                <Label className="cursor-pointer text-sm">Criteria</Label>
                                <Button variant="ghost" size="sm" className="w-9 p-0">
                                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", criteriaOpen && "rotate-180" )} />
                                    <span className="sr-only">Toggle Criteria</span>
                                </Button>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                             <Textarea placeholder="Market Cap > $10B AND P/E Ratio < 15..." rows={6} value={criteria} onChange={e => setCriteria(e.target.value)} />
                        </CollapsibleContent>
                    </Collapsible>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Screener</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

    
