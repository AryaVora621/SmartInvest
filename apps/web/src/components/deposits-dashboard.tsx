
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import type { FixedDeposit } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from './ui/button';
import { PlusCircle, Trash2, Edit, Users, Landmark, BellPlus, Mail, Send, Download, TrendingUp, Calculator, Banknote, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { add, format, differenceInDays, isValid } from 'date-fns';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';

const defaultFamilyMembers = ["B. Patel", "Kirtida"];
const defaultBanks = ["Chase", "Bank of America", "Wells Fargo", "Citi"];

const defaultPpf = { accountNumber: "PPF987654321", currentValue: "625000", annualContribution: "150000", currentRate: "7.1" };
const defaultNps = { accountNumber: "NPS123456789", currentValue: "850000", monthlyContribution: "10000", expectedReturn: "8.2" };
const defaultMf = { folioNumber: "MF456789123", currentValue: "415000", monthlySip: "8000", cagr: "12.4" };
const defaultGovBond = { accountNumber: "", currentValue: "0", currentRate: "7.5", period: '', maturityAmount: '0', date: format(new Date(), "yyyy-MM-dd"), maturityDate: '' };


const formatCurrency = (amount: number, withPaise = true) => {
    const options: Intl.NumberFormatOptions = {
        style: 'decimal',
        minimumFractionDigits: withPaise ? 2 : 0,
        maximumFractionDigits: withPaise ? 2 : 0,
    };
    return new Intl.NumberFormat('en-US', options).format(amount);
};


const BorderedCell = ({ children, className, colSpan, rowSpan }: { children: React.ReactNode, className?: string, colSpan?: number, rowSpan?: number }) => (
    <TableCell className={cn("border p-0.5 text-xs", className)} colSpan={colSpan} rowSpan={rowSpan}>
        {children}
    </TableCell>
);

const BorderedHead = ({ children, className, colSpan, rowSpan }: { children: React.ReactNode, className?: string, colSpan?: number, rowSpan?: number }) => (
    <TableHead className={cn("border text-center font-bold p-0.5 bg-muted/50 align-middle text-xs", className)} colSpan={colSpan} rowSpan={rowSpan}>
        {children}
    </TableHead>
);

const ManageListDialog = ({ title, description, list, setList, placeholder, icon, buttonText }: { title: string, description: string, list: string[], setList: (list: string[]) => void, placeholder: string, icon: React.ReactNode, buttonText: string }) => {
    const [newItemName, setNewItemName] = React.useState('');
    const { toast } = useToast();

    const handleAddItem = () => {
        if (!newItemName) {
            toast({ title: 'Error', description: 'Item name cannot be empty.', variant: 'destructive' });
            return;
        }
        if (list.includes(newItemName)) {
            toast({ title: 'Error', description: 'This item already exists.', variant: 'destructive' });
            return;
        }
        setList([...list, newItemName]);
        setNewItemName('');
        toast({ title: 'Item Added', description: `${newItemName} has been added.` });
    };

    const handleDeleteItem = (itemName: string) => {
        setList(list.filter(m => m !== itemName));
        toast({ title: 'Item Removed', description: `${itemName} has been removed.` });
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-white">{buttonText}</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <div className="flex items-baseline gap-2">
                        <DialogTitle className="text-base">{title}</DialogTitle>
                        <DialogDescription className="text-xs">{description}</DialogDescription>
                    </div>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder={placeholder}
                        />
                        <Button onClick={handleAddItem}><PlusCircle className="mr-2" /> Add</Button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {list.map(item => (
                            <div key={item} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
                                <span>{item}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item)}>
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button>Done</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const SetAlertsDialog = ({ children, deposit }: { children: React.ReactNode, deposit: Omit<FixedDeposit, 'id'> }) => {
    const [open, setOpen] = React.useState(false);
    const { toast } = useToast();

    const handleSave = () => {
        toast({ title: "Alert Set", description: `Maturity reminder for ${deposit.bankName} FD has been set.` });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-baseline gap-2">
                        <DialogTitle className="text-base">Set Maturity Alert</DialogTitle>
                        <DialogDescription className="text-xs">
                            Get a reminder before your FD for {deposit.familyMember} with {deposit.bankName} matures on {deposit.maturityDate}.
                        </DialogDescription>
                    </div>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Reminder Time</Label>
                        <Select defaultValue="7">
                            <SelectTrigger><SelectValue placeholder="Select Reminder Time" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 day before</SelectItem>
                                <SelectItem value="3">3 days before</SelectItem>
                                <SelectItem value="7">1 week before</SelectItem>
                                <SelectItem value="14">2 weeks before</SelectItem>
                                <SelectItem value="30">1 month before</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-4 pt-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id={`email-alert-${deposit.familyMember}-${deposit.bankName}`} defaultChecked />
                            <Label htmlFor={`email-alert-${deposit.familyMember}-${deposit.bankName}`} className="flex items-center gap-1"><Mail size={14}/>Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id={`telegram-alert-${deposit.familyMember}-${deposit.bankName}`} />
                            <Label htmlFor={`telegram-alert-${deposit.familyMember}-${deposit.bankName}`} className="flex items-center gap-1"><Send size={14}/>Telegram</Label>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Alert</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const WithdrawDepositDialog = ({ children, onWithdraw, familyMembers, deposits }: { children: React.ReactNode, onWithdraw: (id: string) => void, familyMembers: string[], deposits: FixedDeposit[] }) => {
    const [open, setOpen] = React.useState(false);
    const [selectedMember, setSelectedMember] = React.useState('');
    const [selectedDepositId, setSelectedDepositId] = React.useState('');
    const [withdrawalDate, setWithdrawalDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
    const [withdrawalAmount, setWithdrawalAmount] = React.useState('');
    const { toast } = useToast();

    const memberDeposits = React.useMemo(() => {
        return deposits.filter(d => d.familyMember === selectedMember);
    }, [selectedMember, deposits]);

    const handleWithdraw = () => {
        if (!selectedDepositId) {
            toast({ title: 'Error', description: 'Please select a deposit to withdraw.', variant: 'destructive' });
            return;
        }
        onWithdraw(selectedDepositId);
        toast({ title: 'Withdrawal Recorded', description: 'The deposit has been marked as withdrawn.' });
        setOpen(false);
        // Reset form
        setSelectedMember('');
        setSelectedDepositId('');
        setWithdrawalAmount('');
        setWithdrawalDate(format(new Date(), 'yyyy-MM-dd'));
    };
    
    const selectedDeposit = deposits.find(d => d.id === selectedDepositId);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <div className="flex items-baseline gap-2">
                        <DialogTitle className="text-base">Withdraw Fixed Deposit</DialogTitle>
                        <DialogDescription className="text-xs">Record a full or partial withdrawal of a fixed deposit.</DialogDescription>
                    </div>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="familyMemberWithdraw">Family Member</Label>
                        <Select onValueChange={setSelectedMember} value={selectedMember}>
                            <SelectTrigger><SelectValue placeholder="Select Member" /></SelectTrigger>
                            <SelectContent>
                                {familyMembers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="depositToWithdraw">Deposit to Withdraw</Label>
                        <Select onValueChange={setSelectedDepositId} value={selectedDepositId} disabled={!selectedMember}>
                            <SelectTrigger><SelectValue placeholder="Select Deposit" /></SelectTrigger>
                            <SelectContent>
                                {memberDeposits.map(d => (
                                    <SelectItem key={d.id} value={d.id}>
                                        {d.bankName} - ${formatCurrency(d.principal, false)} @ {d.interestRate}%
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedDeposit && (
                         <div className="grid grid-cols-2 gap-4 text-sm p-2 bg-secondary/50 rounded-md">
                            <p><strong>Maturity Date:</strong> {selectedDeposit.maturityDate}</p>
                            <p><strong>Maturity Amount:</strong> ${formatCurrency(selectedDeposit.maturityAmount)}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="withdrawalDate">Withdrawal Date</Label>
                            <Input id="withdrawalDate" type="date" value={withdrawalDate} onChange={e => setWithdrawalDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="withdrawalAmount">Withdrawal Amount ($)</Label>
                            <Input id="withdrawalAmount" type="number" value={withdrawalAmount} onChange={e => setWithdrawalAmount(e.target.value)} placeholder="e.g. 50000" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleWithdraw} disabled={!selectedDepositId}>Confirm Withdrawal</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const useRetirementPlanState = (userId: string | undefined, key: string, defaultValue: any) => {
    const [state, setState] = React.useState(defaultValue);

    React.useEffect(() => {
        if (!userId || !key) return;
        try {
            const savedData = localStorage.getItem(`retirementPlan_${key}_${userId}`);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                setState(parsedData);
            } else {
                 setState(defaultValue);
            }
        } catch (e) {
            console.error(`Failed to load ${key} from localStorage`, e);
             setState(defaultValue);
        }
    }, [userId, key, defaultValue]);
    
    const updateState = React.useCallback((newState: any) => {
        if (userId) {
            try {
                const updatedState = typeof newState === 'function' ? newState(state) : newState;
                setState(updatedState);
                localStorage.setItem(`retirementPlan_${key}_${userId}`, JSON.stringify(updatedState));
            } catch (e) {
                console.error(`Failed to save ${key} to localStorage`, e);
            }
        }
    }, [userId, key, state]);

    return { state, updateState };
};

const AddEditDepositDialog = ({ children, deposit, onSave, familyMembers, banks }: { children: React.ReactNode, deposit?: FixedDeposit, onSave: (deposit: Omit<FixedDeposit, 'id'>, id?: string) => void, familyMembers: string[], banks: string[] }) => {
    const [open, setOpen] = React.useState(false);
    const [bankName, setBankName] = React.useState('');
    const [familyMember, setFamilyMember] = React.useState('');
    const [principal, setPrincipal] = React.useState('');
    const [startDate, setStartDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
    const [years, setYears] = React.useState('0');
    const [months, setMonths] = React.useState('0');
    const [days, setDays] = React.useState('0');
    const [interestRate, setInterestRate] = React.useState('');
    const [maturityDate, setMaturityDate] = React.useState('');
    const { toast } = useToast();

    React.useEffect(() => {
        if (open && deposit) {
            setBankName(deposit.bankName);
            setFamilyMember(deposit.familyMember);
            setPrincipal(deposit.principal.toString());
            setStartDate(deposit.startDate);
            setYears(deposit.period.years.toString());
            setMonths(deposit.period.months.toString());
            setDays(deposit.period.days.toString());
            setInterestRate(deposit.interestRate.toString());
        } else if (!open) {
            clearForm();
        }
    }, [open, deposit]);

    React.useEffect(() => {
        const y = parseInt(years) || 0;
        const m = parseInt(months) || 0;
        const d = parseInt(days) || 0;
        const sDate = new Date(startDate);
        
        if (isValid(sDate) && (y > 0 || m > 0 || d > 0)) {
            const period = { years: y, months: m, days: d };
            const mDate = add(sDate, period);
            setMaturityDate(format(mDate, 'yyyy-MM-dd'));
        } else {
            setMaturityDate('');
        }
    }, [startDate, years, months, days]);

    const clearForm = () => {
        setBankName('');
        setFamilyMember('');
        setPrincipal('');
        setStartDate(format(new Date(), 'yyyy-MM-dd'));
        setYears('0');
        setMonths('0');
        setDays('0');
        setInterestRate('');
    };

    const handleSave = () => {
        if (!bankName || !familyMember || !principal || !interestRate) {
            toast({ title: "Error", description: "Please fill Bank, Family Member, Principal, and Interest Rate.", variant: "destructive" });
            return;
        }

        const p = parseFloat(principal);
        const rate = parseFloat(interestRate);
        const y = parseInt(years) || 0;
        const m = parseInt(months) || 0;
        const d = parseInt(days) || 0;
        if (y === 0 && m === 0 && d === 0) {
            toast({ title: "Error", description: "Period must be at least 1 day.", variant: "destructive" });
            return;
        }
        const period = { years: y, months: m, days: d };
        
        const sDate = new Date(startDate);
        if (!isValid(sDate)) {
            toast({ title: "Error", description: "Invalid start date.", variant: "destructive" });
            return;
        }
        const mDate = add(sDate, period);
        const computedMaturityDate = format(mDate, 'yyyy-MM-dd');
        const numberOfDays = differenceInDays(mDate, sDate);
        
        const timeInYears = numberOfDays / 365;
        const interestAmount = (p * rate * timeInYears) / 100;
        const maturityAmount = p + interestAmount;
        const daysToMaturity = differenceInDays(mDate, new Date());

        const newDeposit: Omit<FixedDeposit, 'id'> = {
            bankName,
            familyMember,
            principal: p,
            startDate: format(sDate, 'yyyy-MM-dd'),
            period,
            maturityDate: computedMaturityDate,
            numberOfDays,
            interestRate: rate,
            interestAmount,
            maturityAmount,
            daysToMaturity: daysToMaturity > 0 ? daysToMaturity : 0,
        };

        onSave(newDeposit, deposit?.id);
        toast({ title: deposit ? "Deposit Updated" : "Deposit Added", description: `FD for ${familyMember} in ${bankName} ${deposit ? 'updated' : 'created'}.` });
        clearForm();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline text-base">{deposit ? 'Edit' : 'Add'} Fixed Deposit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Date</Label>
                            <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-white" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="familyMember">Family Member</Label>
                            <Select onValueChange={setFamilyMember} value={familyMember}>
                                <SelectTrigger className="text-white w-full"><SelectValue placeholder="Select Member" /></SelectTrigger>
                                <SelectContent>
                                    {familyMembers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Select onValueChange={setBankName} value={bankName}>
                                <SelectTrigger className="text-white w-full"><SelectValue placeholder="Select Bank" /></SelectTrigger>
                                <SelectContent>
                                    {banks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="interestRate">Interest Rate (%)</Label>
                            <Input id="interestRate" type="number" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="e.g. 7.5" className="text-white no-spinner placeholder:text-white" />
                        </div>
                        <div className="space-y-2">
                             <Label>Period</Label>
                             <div className="flex items-center gap-2">
                                <div className="flex-1 grid grid-cols-3 gap-2">
                                    <div className="space-y-2 w-full">
                                        <Label htmlFor="years" className="text-xs text-muted-foreground">Years</Label>
                                        <Input id="years" type="number" value={years} onChange={(e) => setYears(e.target.value)} placeholder="Year" className="text-white no-spinner w-full" />
                                    </div>
                                    <div className="space-y-2 w-full">
                                        <Label htmlFor="months" className="text-xs text-muted-foreground">Months</Label>
                                        <Input id="months" type="number" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="Month" className="text-white no-spinner w-full" />
                                    </div>
                                    <div className="space-y-2 w-full">
                                        <Label htmlFor="days" className="text-xs text-muted-foreground">Days</Label>
                                        <Input id="days" type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="Day" className="text-white no-spinner w-full" />
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-[1fr] gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="principal">Principal Amount ($)</Label>
                            <Input id="principal" type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="e.g. 50000" className="text-white no-spinner placeholder:text-white" />
                        </div>
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>{deposit ? 'Save Changes' : 'Add Deposit'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const RetirementPlanItem = ({ title, description, children, icon }: { title: string, description: string, children: React.ReactNode, icon: React.ReactNode }) => (
    <div className="p-4 border rounded-lg bg-secondary/50">
        <div className="flex items-center gap-2 mb-3">
            {icon}
            <div className='flex items-baseline gap-2'>
                <h4 className="font-semibold text-sm leading-none">{title}</h4>
                <p className="text-xs text-muted-foreground leading-none">{description}</p>
            </div>
        </div>
        <div className="space-y-2 text-sm">
           {children}
        </div>
    </div>
);



const RetirementPlansCard = ({ deposits, userId }: { deposits: FixedDeposit[], userId: string }) => {
    
    const { state: ppf, updateState: setPpf } = useRetirementPlanState(userId, 'ppf', defaultPpf);
    const { state: nps, updateState: setNps } = useRetirementPlanState(userId, 'nps', defaultNps);
    const { state: mf, updateState: setMf } = useRetirementPlanState(userId, 'mf', defaultMf);
    const { state: govBond, updateState: setGovBond } = useRetirementPlanState(userId, 'govBond', defaultGovBond);

    const handleFieldChange = React.useCallback((planUpdater: Function, key: string) => (field: string, value: any) => {
        planUpdater((prevState: any) => {
            let newState = { ...prevState, [field]: value };

            if (key === 'govBond') {
                const principal = parseFloat(field === 'currentValue' ? value : newState.currentValue || 0);
                const rate = parseFloat(field === 'currentRate' ? value : newState.currentRate || 0) / 100;
                const periodInMonths = parseFloat(field === 'period' ? value : newState.period || 0);

                if (!isNaN(principal) && !isNaN(rate) && !isNaN(periodInMonths) && principal > 0 && rate > 0 && periodInMonths > 0) {
                    const timeInYears = periodInMonths / 12;
                    const maturityAmount = principal * (1 + rate * timeInYears);
                    newState.maturityAmount = maturityAmount.toFixed(0);
                } else {
                    newState.maturityAmount = '0';
                }
                
                const sDate = new Date(field === 'date' ? value : newState.date);
                if (isValid(sDate) && periodInMonths > 0) {
                    const mDate = add(sDate, { months: periodInMonths });
                    newState.maturityDate = format(mDate, 'yyyy-MM-dd');
                } else {
                    newState.maturityDate = '';
                }
            }
            return newState;
        });
    }, []);
    
    const govBondDaysToMaturity = React.useMemo(() => {
        if (govBond.maturityDate && isValid(new Date(govBond.maturityDate))) {
            const days = differenceInDays(new Date(govBond.maturityDate), new Date());
            return days > 0 ? days : 0;
        }
        return null;
    }, [govBond.maturityDate]);
    
    const govBondAsFD = React.useMemo((): Omit<FixedDeposit, 'id'> | null => {
        if (!govBond.maturityDate || !govBond.currentValue || !govBond.date) return null;
        return {
            bankName: "Government Bond",
            familyMember: "Self",
            principal: parseFloat(govBond.currentValue),
            startDate: govBond.date,
            period: { years: 0, months: parseFloat(govBond.period) || 0, days: 0 },
            maturityDate: govBond.maturityDate,
            numberOfDays: differenceInDays(new Date(govBond.maturityDate), new Date(govBond.date)),
            interestRate: parseFloat(govBond.currentRate),
            interestAmount: parseFloat(govBond.maturityAmount) - parseFloat(govBond.currentValue),
            maturityAmount: parseFloat(govBond.maturityAmount),
            daysToMaturity: govBondDaysToMaturity ?? 0
        }
    }, [govBond, govBondDaysToMaturity]);


    const { totalPrincipal, totalMaturity, averageRate } = React.useMemo(() => {
        if (!deposits || deposits.length === 0) {
            return { totalPrincipal: 0, totalMaturity: 0, averageRate: 0 };
        }

        const totalPrincipal = deposits.reduce((sum, d) => sum + d.principal, 0);
        const totalMaturity = deposits.reduce((sum, d) => sum + d.maturityAmount, 0);
        const weightedInterestRateSum = deposits.reduce((sum, d) => sum + d.principal * d.interestRate, 0);
        const averageRate = totalPrincipal > 0 ? weightedInterestRateSum / totalPrincipal : 0;

        return { totalPrincipal, totalMaturity, averageRate };
    }, [deposits]);

    const otherInvestmentsTotal = React.useMemo(() => {
        const ppfValue = parseFloat(ppf.currentValue) || 0;
        const npsValue = parseFloat(nps.currentValue) || 0;
        const mfValue = parseFloat(mf.currentValue) || 0;
        const bondValue = parseFloat(govBond.currentValue) || 0;
        return ppfValue + npsValue + mfValue + bondValue;
    }, [ppf.currentValue, nps.currentValue, mf.currentValue, govBond.currentValue]);
    
    const grandTotal = totalPrincipal + otherInvestmentsTotal;

    const EditableField = ({ label, value, onChange, type = 'text', readOnly = false, className, style, maxLength }: { label: string, value: string, onChange: (value: string) => void, type?: string, readOnly?: boolean, className?: string, style?: React.CSSProperties, maxLength?: number }) => (
        <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">{label}</span>
            <Input 
                className={cn("h-8 text-sm bg-background border-input focus-visible:ring-1 focus-visible:ring-ring", readOnly ? "text-muted-foreground" : "text-white", type === 'number' && "no-spinner", className)}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                type={type}
                readOnly={readOnly}
                style={style}
                maxLength={maxLength}
            />
        </div>
    );

    const DataField = ({ label, value }: { label: string, value: string | React.ReactNode }) => (
         <div className="flex justify-between items-center p-2 border rounded-md">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span className="font-mono font-medium text-xs">{value}</span>
        </div>
    );
    
    const PortfolioTotalRow = ({ label, value }: { label: string, value: number }) => (
        <div className="flex justify-between items-center py-2 px-3 border rounded-md bg-secondary/50">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono font-medium">$ {formatCurrency(value, false)}</span>
        </div>
    );

    return (
        <Card className="shadow-md">
            <CardHeader>
                <div className="flex items-baseline gap-2">
                    <CardTitle className="font-headline text-base">Your Retirement Plans</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2 mb-3">
                             <Banknote />
                             <div className="flex items-baseline gap-2">
                                <h4 className="font-semibold text-sm leading-none">Portfolio Total</h4>
                                <p className="text-xs text-muted-foreground leading-none">Combined value of your other investments</p>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <PortfolioTotalRow label="Fixed Deposits" value={totalPrincipal} />
                            <PortfolioTotalRow label="Public Provident Fund (PPF)" value={parseFloat(ppf.currentValue) || 0} />
                            <PortfolioTotalRow label="National Pension System (NPS)" value={parseFloat(nps.currentValue) || 0} />
                            <PortfolioTotalRow label="Mutual Fund SIP" value={parseFloat(mf.currentValue) || 0} />
                            <PortfolioTotalRow label="Government Bond" value={parseFloat(govBond.currentValue) || 0} />
                            <Separator className="my-2 bg-border"/>
                            <div className="flex justify-between items-center text-base pt-1 px-3">
                                <span className="font-bold">Grand Total</span>
                                <span className="font-bold font-mono">$ {formatCurrency(grandTotal, false)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <RetirementPlanItem 
                            title="Fixed Deposits"
                            description="Safe investment with guaranteed returns"
                            icon={<Landmark />}
                        >
                            <DataField label="Total FDs" value={`${deposits.length} FDs`} />
                            <DataField label="Current Value" value={`$ ${formatCurrency(totalPrincipal, false)}`} />
                            <DataField label="Average Rate" value={`${averageRate.toFixed(2)}%`} />
                            <DataField label="Maturity Value" value={`$ ${formatCurrency(totalMaturity, false)}`} />
                        </RetirementPlanItem>
                        
                        <div className="flex justify-end gap-4 py-2">
                           
                        </div>

                        <RetirementPlanItem 
                            title="Public Provident Fund (PPF)"
                            description="Long-term savings scheme with guaranteed returns"
                            icon={<Building />}
                        >
                           <EditableField label="Account Number" value={ppf.accountNumber} onChange={(v) => handleFieldChange(setPpf, 'ppf')('accountNumber', v)} type="text" maxLength={30} />
                           <EditableField label="Current Value" value={ppf.currentValue} onChange={(v) => handleFieldChange(setPpf, 'ppf')('currentValue', v)} type="number" className="no-spinner" />
                           <EditableField label="Annual Contribution" value={ppf.annualContribution} onChange={(v) => handleFieldChange(setPpf, 'ppf')('annualContribution', v)} type="number" className="no-spinner" />
                           <EditableField label="Current Rate" value={ppf.currentRate} onChange={(v) => handleFieldChange(setPpf, 'ppf')('currentRate', v)} type="number" className="no-spinner" />
                        </RetirementPlanItem>
                        <RetirementPlanItem 
                            title="National Pension System (NPS)"
                            description="Government-backed pension scheme with tax benefits"
                            icon={<Building />}
                        >
                           <EditableField label="Account Number" value={nps.accountNumber} onChange={(v) => handleFieldChange(setNps, 'nps')('accountNumber', v)} type="text" maxLength={30} />
                           <EditableField label="Current Value" value={nps.currentValue} onChange={(v) => handleFieldChange(setNps, 'nps')('currentValue', v)} type="number" className="no-spinner" />
                           <EditableField label="Monthly Contribution" value={nps.monthlyContribution} onChange={(v) => handleFieldChange(setNps, 'nps')('monthlyContribution', v)} type="number" className="no-spinner" />
                           <EditableField label="Expected Return" value={nps.expectedReturn} onChange={(v) => handleFieldChange(setNps, 'nps')('expectedReturn', v)} type="number" className="no-spinner" />
                        </RetirementPlanItem>
                        <RetirementPlanItem 
                            title="Mutual Fund SIP"
                            description="Systematic Investment Plan for equity growth"
                            icon={<TrendingUp />}
                        >
                           <EditableField label="Folio Number" value={mf.folioNumber} onChange={(v) => handleFieldChange(setMf, 'mf')('folioNumber', v)} type="text" maxLength={30} />
                           <EditableField label="Current Value" value={mf.currentValue} onChange={(v) => handleFieldChange(setMf, 'mf')('currentValue', v)} type="number" className="no-spinner" />
                           <EditableField label="Monthly SIP" value={mf.monthlySip} onChange={(v) => handleFieldChange(setMf, 'mf')('monthlySip', v)} type="number" className="no-spinner" />
                           <EditableField label="CAGR (3Y)" value={mf.cagr} onChange={(v) => handleFieldChange(setMf, 'mf')('cagr', v)} type="number" className="no-spinner" />
                        </RetirementPlanItem>
                         <RetirementPlanItem 
                            title="Government Bond"
                            description="Secure investment with fixed income"
                            icon={<Landmark />}
                        >
                             <div className="grid grid-cols-2 gap-4">
                                <EditableField label="Account Number" value={govBond.accountNumber} onChange={(v) => handleFieldChange(setGovBond, 'govBond')('accountNumber', v)} type="text" maxLength={30} />
                                <EditableField label="Date" value={govBond.date} onChange={(v) => handleFieldChange(setGovBond, 'govBond')('date', v)} type="text" className="text-white" placeholder="YYYY-MM-DD" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                               <EditableField label="Current Value" value={govBond.currentValue} onChange={(v) => handleFieldChange(setGovBond, 'govBond')('currentValue', v)} type="number" className="no-spinner" />
                               <EditableField label="Current Rate" value={govBond.currentRate} onChange={(v) => handleFieldChange(setGovBond, 'govBond')('currentRate', v)} type="number" className="no-spinner" />
                               <EditableField label="Period - Months" value={govBond.period} onChange={(v) => handleFieldChange(setGovBond, 'govBond')('period', v)} type="number" className="no-spinner" />
                           </div>
                           <div className="grid grid-cols-[1fr_auto_1fr_1fr] gap-2 items-end">
                                <EditableField label="Maturity Date" value={govBond.maturityDate} onChange={(v) => {}} readOnly type="text" style={{backgroundColor: 'rgb(82, 60, 92)', color: 'white'}} />
                                {govBondAsFD && (
                                    <SetAlertsDialog deposit={govBondAsFD}>
                                        <Button variant="outline" size="icon" className="h-8 w-8 mb-1"><BellPlus size={14} className="text-white" /></Button>
                                    </SetAlertsDialog>
                                )}
                                <EditableField label="Days to Maturity" value={govBondDaysToMaturity !== null ? govBondDaysToMaturity.toString() : ''} onChange={() => {}} readOnly style={{ color: 'white' }} />
                                <EditableField label="Maturity Amount" value={govBond.maturityAmount} onChange={(v) => {}} readOnly type="number" className="no-spinner" style={{ color: 'white' }} />
                           </div>
                        </RetirementPlanItem>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const CalculatorInputRow = ({ label, placeholder, value, onChange }: { label: string, placeholder: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <Input 
            type="number" 
            className="w-32 h-8 text-white no-spinner"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
    </div>
);

const ResultRow = ({ label, value, isCurrency = true, isNegative = false }: { label: string, value: string | number, isCurrency?: boolean, isNegative?: boolean}) => (
    <div className="flex items-center justify-between py-2 border-b">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-bold", isNegative && "text-red-500")}>
            {isCurrency ? `$ ${Number(value).toLocaleString('en-US', {maximumFractionDigits: 0})}` : value}
        </p>
    </div>
);

const RetirementCalculatorCard = () => {
    const { toast } = useToast();
    const [inputs, setInputs] = React.useState({
        currentAge: "30",
        retirementAge: "60",
        currentSavings: "500000",
        monthlyContribution: "15000",
        monthlyExpense: "50000",
        expectedReturn: "10",
        inflationRate: "6",
    });
    
    const [results, setResults] = React.useState<{
        yearsToRetirement: number;
        requiredCorpus: number;
        projectedCorpus: number;
        monthlyIncome: number;
        totalContributions: number;
        totalInterest: number;
        shortfall: number;
    } | null>(null);

    const handleInputChange = (field: keyof typeof inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputs(prev => ({ ...prev, [field]: e.target.value }));
    };
    
    const calculateRetirement = () => {
        const { currentAge, retirementAge, currentSavings, monthlyContribution, monthlyExpense, expectedReturn, inflationRate } = inputs;
        const numCurrentAge = parseInt(currentAge);
        const numRetirementAge = parseInt(retirementAge);
        const numCurrentSavings = parseFloat(currentSavings);
        const numMonthlyContribution = parseFloat(monthlyContribution);
        const numMonthlyExpense = parseFloat(monthlyExpense);
        const numExpectedReturn = parseFloat(expectedReturn) / 100;
        const numInflationRate = parseFloat(inflationRate) / 100;
        
        if ([numCurrentAge, numRetirementAge, numCurrentSavings, numMonthlyContribution, numMonthlyExpense, numExpectedReturn, numInflationRate].some(isNaN)) {
            toast({ title: 'Invalid Input', description: 'Please ensure all fields are filled with valid numbers.', variant: 'destructive' });
            return;
        }

        const yearsToRetirement = numRetirementAge - numCurrentAge;
        if (yearsToRetirement <= 0) {
             toast({ title: 'Invalid Age', description: 'Retirement age must be greater than current age.', variant: 'destructive' });
            return;
        }
        
        // 1. Calculate future value of current monthly expenses at retirement
        const futureMonthlyExpense = numMonthlyExpense * Math.pow(1 + numInflationRate, yearsToRetirement);

        // 2. Calculate required corpus using a 4% withdrawal rate rule (a common heuristic)
        const requiredCorpus = futureMonthlyExpense * 12 * 25;
        
        // 3. Calculate projected corpus based on current savings and future contributions
        const monthsToRetirement = yearsToRetirement * 12;
        const monthlyReturn = numExpectedReturn / 12;
        const fvCurrentSavings = numCurrentSavings * Math.pow(1 + monthlyReturn, monthsToRetirement);
        const fvMonthlyContributions = numMonthlyContribution * ((Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn);
        const projectedCorpus = fvCurrentSavings + fvMonthlyContributions;

        // 4. Calculate other metrics
        const shortfall = requiredCorpus - projectedCorpus;
        const monthlyIncome = (projectedCorpus / 25) / 12; // Based on 4% rule
        const totalContributions = numCurrentSavings + (numMonthlyContribution * monthsToRetirement);
        const totalInterest = projectedCorpus - totalContributions;
        
        setResults({
            yearsToRetirement,
            requiredCorpus,
            projectedCorpus,
            monthlyIncome,
            totalContributions,
            totalInterest,
            shortfall,
        });
    };
    
    const getRecommendation = () => {
        if (!results || results.shortfall <= 0) {
            return (
                 <p className="text-xs text-green-500 p-3 bg-secondary/50 rounded-md">
                    Congratulations! You are on track to meet your retirement goals. Keep up the disciplined investing.
                </p>
            );
        }

        const additionalMonthlyContribution = (results.shortfall * (results.projectedCorpus / results.totalContributions)) / (12 * results.yearsToRetirement) / 10;
        
        return (
             <p className="text-xs text-muted-foreground p-3 bg-secondary/50 rounded-md">
                Based on your current plan, you may face a shortfall of <strong className="text-red-500">${results.shortfall.toLocaleString('en-US', {maximumFractionDigits: 0})}</strong>. 
                Consider increasing your monthly contribution by approximately <strong className="text-white">${additionalMonthlyContribution.toLocaleString('en-US', {maximumFractionDigits: 0})}</strong> or exploring higher return investment options.
            </p>
        );
    }


    return (
        <Card className="shadow-md">
            <CardHeader>
                <div className="flex items-baseline gap-2">
                    <CardTitle className="font-headline text-base flex items-center gap-2"><Calculator />Retirement Calculator</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {/* Input Parameters */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-center text-sm">Input Parameters</h4>
                        <div className="space-y-2 p-4 border rounded-lg">
                           <CalculatorInputRow label="Current Age" placeholder="e.g. 30" value={inputs.currentAge} onChange={handleInputChange('currentAge')} />
                           <CalculatorInputRow label="Retirement Age" placeholder="e.g. 60" value={inputs.retirementAge} onChange={handleInputChange('retirementAge')} />
                           <CalculatorInputRow label="Current Savings ($)" placeholder="e.g. 500000" value={inputs.currentSavings} onChange={handleInputChange('currentSavings')} />
                           <CalculatorInputRow label="Monthly Contribution ($)" placeholder="e.g. 15000" value={inputs.monthlyContribution} onChange={handleInputChange('monthlyContribution')} />
                           <CalculatorInputRow label="Monthly Current Expense ($)" placeholder="e.g. 50000" value={inputs.monthlyExpense} onChange={handleInputChange('monthlyExpense')} />
                           <CalculatorInputRow label="Expected Return (%)" placeholder="e.g. 10" value={inputs.expectedReturn} onChange={handleInputChange('expectedReturn')} />
                           <CalculatorInputRow label="Inflation Rate (%)" placeholder="e.g. 6" value={inputs.inflationRate} onChange={handleInputChange('inflationRate')} />
                        </div>
                        <Button className="w-full" onClick={calculateRetirement}>Calculate</Button>
                    </div>

                    {/* Calculation Results */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-center text-sm">Calculation Results</h4>
                        <div className="p-4 border rounded-lg space-y-2">
                            <h5 className="font-medium text-sm">Retirement Projections</h5>
                            {results ? (
                                <>
                                    <ResultRow label="Years to Retirement" value={`${results.yearsToRetirement} years`} isCurrency={false} />
                                    <ResultRow label="Required Corpus" value={results.requiredCorpus} />
                                    <ResultRow label="Projected Corpus" value={results.projectedCorpus} />
                                    <ResultRow label="Projected Monthly Income" value={results.monthlyIncome} />
                                    <ResultRow label="Total Contributions" value={results.totalContributions} />
                                    <ResultRow label="Total Interest Earned" value={results.totalInterest} />
                                    <ResultRow label="Shortfall/Surplus" value={-results.shortfall} isNegative={results.shortfall > 0} />

                                    <div className="pt-4">
                                        <h5 className="font-medium text-sm mb-2">Recommendations</h5>
                                        {getRecommendation()}
                                    </div>
                                </>
                            ) : (
                               <div className="text-center text-muted-foreground py-10 text-sm">
                                    Enter your details and click "Calculate" to see your projections.
                               </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


export function DepositsDashboard({ userId }: { userId: string }) {
    const [deposits, setDeposits] = React.useState<FixedDeposit[]>([]);
    const [familyMembers, setFamilyMembers] = React.useState<string[]>(defaultFamilyMembers);
    const [banks, setBanks] = React.useState<string[]>(defaultBanks);
    const { toast } = useToast();
    
    const calculateDaysToMaturity = React.useCallback((startDateStr: string, period: { years: number; months: number; days: number; }): number => {
        if (!startDateStr || !period) return 0;
        const sDate = new Date(startDateStr);
        if (!isValid(sDate)) return 0;
        const mDate = add(sDate, period);
        const daysToMaturity = differenceInDays(mDate, new Date());
        return daysToMaturity > 0 ? daysToMaturity : 0;
    }, []);

    React.useEffect(() => {
        if (!userId) return;
        try {
            const savedDeposits = localStorage.getItem(`fixedDeposits_${userId}`);
            if (savedDeposits) {
                const parsedDeposits: FixedDeposit[] = JSON.parse(savedDeposits);
                const updatedDeposits = parsedDeposits.map((d: FixedDeposit) => ({
                    ...d,
                    startDate: format(new Date(d.startDate), 'yyyy-MM-dd'),
                    maturityDate: format(new Date(d.maturityDate), 'yyyy-MM-dd'),
                    daysToMaturity: calculateDaysToMaturity(d.startDate, d.period),
                }));
                setDeposits(updatedDeposits);
            } else {
                setDeposits([]);
            }
            
            const savedFamilyMembers = localStorage.getItem(`familyMembers_${userId}`);
            if (savedFamilyMembers) {
                setFamilyMembers(JSON.parse(savedFamilyMembers));
            } else {
                setFamilyMembers(defaultFamilyMembers);
            }
            
            const savedBanks = localStorage.getItem(`banks_${userId}`);
            if (savedBanks) {
                setBanks(JSON.parse(savedBanks));
            } else {
                setBanks(defaultBanks);
            }

        } catch (e) {
            console.error("Failed to load data from localStorage", e);
            setDeposits([]);
            setFamilyMembers(defaultFamilyMembers);
            setBanks(defaultBanks);
        }
    }, [userId, calculateDaysToMaturity]);

    const saveDeposits = React.useCallback((newDeposits: FixedDeposit[]) => {
        if (!userId) return;
        try {
            const updatedDeposits = newDeposits.map(d => ({
                ...d,
                daysToMaturity: calculateDaysToMaturity(d.startDate, d.period),
            }));
            localStorage.setItem(`fixedDeposits_${userId}`, JSON.stringify(updatedDeposits));
            setDeposits(updatedDeposits);
        } catch (e) {
            console.error("Failed to save deposits", e);
            toast({ title: "Error", description: "Could not save deposits.", variant: "destructive" });
        }
    }, [userId, toast, calculateDaysToMaturity]);

    const handleSetFamilyMembers = React.useCallback((members: string[]) => {
        if (!userId) return;
        try {
            localStorage.setItem(`familyMembers_${userId}`, JSON.stringify(members));
            setFamilyMembers(members);
        } catch (e) {
            console.error("Failed to save family members", e);
            toast({ title: "Error", description: "Could not save family members.", variant: "destructive" });
        }
    }, [userId, toast]);

    const handleSetBanks = React.useCallback((newBanks: string[]) => {
        if (!userId) return;
        try {
            localStorage.setItem(`banks_${userId}`, JSON.stringify(newBanks));
            setBanks(newBanks);
        } catch (e) {
            console.error("Failed to save banks", e);
            toast({ title: "Error", description: "Could not save banks.", variant: "destructive" });
        }
    }, [userId, toast]);

    const handleAddOrEditDeposit = React.useCallback((depositData: Omit<FixedDeposit, 'id'>, id?: string) => {
        if (id) { // Editing existing deposit
            saveDeposits(deposits.map(d => d.id === id ? { ...depositData, id } : d).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
        } else { // Adding new deposit
            const depositWithId = { ...depositData, id: Date.now().toString() };
            saveDeposits([...deposits, depositWithId].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
        }
    }, [deposits, saveDeposits]);
    
    const handleWithdrawDeposit = React.useCallback((id: string) => {
        const newDeposits = deposits.map(d => d.id === id ? { ...d, daysToMaturity: 0, interestAmount: d.maturityAmount - d.principal } : d);
        saveDeposits(newDeposits);
        toast({ title: "Deposit Withdrawn", description: "FD marked as withdrawn/matured." });
    }, [deposits, saveDeposits, toast]);

    const handleDeleteDeposit = React.useCallback((id: string) => {
        const newDeposits = deposits.filter(d => d.id !== id);
        saveDeposits(newDeposits);
        toast({ title: "Deposit Deleted" });
    }, [deposits, saveDeposits, toast]);

    const groupedDeposits = React.useMemo(() => {
        return deposits.reduce((acc, deposit) => {
            const member = deposit.familyMember;
            if (!acc[member]) {
                acc[member] = [];
            }
            acc[member].push(deposit);
            return acc;
        }, {} as { [key: string]: FixedDeposit[] });
    }, [deposits]);

    const handleExport = () => {
        const headers = ["Start Date", "Family Member", "Bank", "Amount", "Period (Y)", "Period (M)", "Period (D)", "Maturity Date", "No. of Days", "Interest Rate %", "Interest Amount", "Maturity Amount", "Days to Maturity"];
        const csvRows = [headers.join(',')];

        Object.entries(groupedDeposits).forEach(([familyMember, memberDeposits]) => {
            memberDeposits.forEach(d => {
                csvRows.push([
                    d.startDate,
                    `"${d.familyMember}"`,
                    `"${d.bankName}"`,
                    d.principal,
                    d.period.years,
                    d.period.months,
                    d.period.days,
                    d.maturityDate,
                    d.numberOfDays,
                    d.interestRate,
                    d.interestAmount.toFixed(2),
                    d.maturityAmount.toFixed(2),
                    d.daysToMaturity
                ].join(','));
            });

            // Subtotal for the family member
            const subtotalPrincipal = memberDeposits.reduce((sum, d) => sum + d.principal, 0);
            const subtotalInterest = memberDeposits.reduce((sum, d) => sum + d.interestAmount, 0);
            const subtotalMaturity = memberDeposits.reduce((sum, d) => sum + d.maturityAmount, 0);
            csvRows.push([
                '', '',`"Total for ${familyMember}"`,
                subtotalPrincipal.toFixed(2),
                '', '', '', '', '', '',
                subtotalInterest.toFixed(2),
                subtotalMaturity.toFixed(2),
                ''
            ].join(','));

            // Blank row
            csvRows.push('');
        });

        // Grand Total
        const totalPrincipal = deposits.reduce((sum, d) => sum + d.principal, 0);
        const totalInterest = deposits.reduce((sum, d) => sum + d.interestAmount, 0);
        const totalMaturity = deposits.reduce((sum, d) => sum + d.maturityAmount, 0);
        csvRows.push([
            '', '',`"Grand Total"`,
            totalPrincipal.toFixed(2),
            '', '', '', '', '', '',
            totalInterest.toFixed(2),
            totalMaturity.toFixed(2),
            ''
        ].join(','));

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "fixed-deposits.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "Export Complete", description: "Your fixed deposit data has been downloaded." });
        }
    };

    const totalPrincipal = deposits.reduce((sum, d) => sum + d.principal, 0);
    const totalInterest = deposits.reduce((sum, d) => sum + d.interestAmount, 0);
    const totalMaturity = deposits.reduce((sum, d) => sum + d.maturityAmount, 0);

    return (
        <div className="space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                            <CardTitle className="font-headline text-base">Fixed Deposit Portfolio</CardTitle>
                            <CardDescription className="text-xs">A summary of your fixed and recurring deposits.</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            <AddEditDepositDialog onSave={handleAddOrEditDeposit} familyMembers={familyMembers} banks={banks}>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white"><PlusCircle className="mr-2 h-4 w-4" /> Add Deposit</Button>
                            </AddEditDepositDialog>
                            <Button onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" /> Export Data
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table className="border-collapse w-full">
                            <TableHeader>
                                <TableRow>
                                    <BorderedHead rowSpan={2} className="w-14">Start Date</BorderedHead>
                                    <BorderedHead rowSpan={2} className="w-16">Family Member</BorderedHead>
                                    <BorderedHead rowSpan={2} className="w-14">Bank</BorderedHead>
                                    <BorderedHead rowSpan={2} className="w-10">Amount</BorderedHead>
                                    <BorderedHead colSpan={3}>------ Period ------</BorderedHead>
                                    <BorderedHead rowSpan={2} className="w-16">Maturity Date</BorderedHead>
                                    <BorderedHead rowSpan={2} className="w-16">Days to Maturity</BorderedHead>
                                    <BorderedHead rowSpan={2} className="w-24">Actions</BorderedHead>
                                </TableRow>
                                <TableRow>
                                    <BorderedHead className="w-12">Y</BorderedHead>
                                    <BorderedHead className="w-12">M</BorderedHead>
                                    <BorderedHead className="w-12">D</BorderedHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(groupedDeposits).map(([familyMember, memberDeposits]) => {
                                    const subtotalPrincipal = memberDeposits.reduce((sum, d) => sum + d.principal, 0);
                                    const subtotalInterest = memberDeposits.reduce((sum, d) => sum + d.interestAmount, 0);
                                    const subtotalMaturity = memberDeposits.reduce((sum, d) => sum + d.maturityAmount, 0);

                                    return (
                                        <React.Fragment key={familyMember}>
                                            {memberDeposits.map((deposit) => (
                                                <React.Fragment key={deposit.id}>
                                                    <TableRow>
                                                        <BorderedCell rowSpan={2} className="align-top">{deposit.startDate}</BorderedCell>
                                                        <BorderedCell rowSpan={2} className="text-left align-top">{deposit.familyMember}</BorderedCell>
                                                        <BorderedCell rowSpan={2} className="text-left align-top">{deposit.bankName}</BorderedCell>
                                                        <BorderedCell rowSpan={2} className="text-right font-mono align-top">$ {formatCurrency(deposit.principal, false)}</BorderedCell>
                                                        <BorderedCell className="text-center">{deposit.period.years}</BorderedCell>
                                                        <BorderedCell className="text-center">{deposit.period.months}</BorderedCell>
                                                        <BorderedCell className="text-center">{deposit.period.days}</BorderedCell>
                                                        <BorderedCell rowSpan={2} className="align-top">{deposit.maturityDate}</BorderedCell>
                                                        <BorderedCell rowSpan={2} className="text-center align-top">
                                                            {deposit.daysToMaturity <= 0 ? (
                                                                <span className="text-xs font-semibold text-destructive">FD Matured</span>
                                                            ) : (
                                                                deposit.daysToMaturity
                                                            )}
                                                        </BorderedCell>
                                                         <BorderedCell rowSpan={2} className="align-top">
                                                             <div className="flex justify-center items-center gap-0.5">
                                                                 <AddEditDepositDialog onSave={handleAddOrEditDeposit} familyMembers={familyMembers} banks={banks} deposit={deposit}>
                                                                     <Button variant="ghost" size="icon" className="h-5 w-5">
                                                                         <Edit size={10} />
                                                                     </Button>
                                                                 </AddEditDepositDialog>
                                                                  <SetAlertsDialog deposit={deposit}>
                                                                      <Button variant="ghost" size="icon" className="h-5 w-5">
                                                                          <BellPlus size={10} />
                                                                      </Button>
                                                                  </SetAlertsDialog>
                                                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-amber-600" title="Withdraw Deposit" onClick={() => handleWithdrawDeposit(deposit.id)}>
                                                                      <span className="text-[10px] font-bold">W</span>
                                                                  </Button>
                                                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDeleteDeposit(deposit.id)}>
                                                                     <Trash2 size={10} />
                                                                 </Button>
                                                             </div>
                                                         </BorderedCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <BorderedCell className="text-center text-muted-foreground text-xs" colSpan={3}>No. of Days: {deposit.numberOfDays} | Rate: {deposit.interestRate.toFixed(2)}% | Interest: $ {formatCurrency(deposit.interestAmount)} | Maturity: $ {formatCurrency(deposit.maturityAmount)}</BorderedCell>
                                                    </TableRow>
                                                </React.Fragment>
                                            ))}
                                            <TableRow>
                                                <BorderedCell colSpan={3} className="text-right font-bold bg-muted/50">Total for {familyMember}</BorderedCell>
                                                <BorderedCell className="text-right font-mono font-bold bg-muted/50">$ {formatCurrency(subtotalPrincipal, false)}</BorderedCell>
                                                <BorderedCell colSpan={3} className="bg-muted/50" />
                                                <BorderedCell className="text-right font-mono font-bold bg-muted/50 text-xs">Int: $ {formatCurrency(subtotalInterest)}</BorderedCell>
                                                <BorderedCell className="text-right font-mono font-bold bg-muted/50 text-xs">Mat: $ {formatCurrency(subtotalMaturity)}</BorderedCell>
                                                <BorderedCell className="bg-muted/50" />
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                            <TableFooter className="font-bold bg-muted">
                               <TableRow>
                                    <BorderedCell colSpan={3} className="text-right">Grand Total</BorderedCell>
                                    <BorderedCell className="text-right font-mono">$ {formatCurrency(totalPrincipal, false)}</BorderedCell>
                                    <BorderedCell colSpan={3}></BorderedCell>
                                    <BorderedCell className="text-right font-mono text-xs">Int: $ {formatCurrency(totalInterest)}</BorderedCell>
                                    <BorderedCell className="text-right font-mono text-xs">Mat: $ {formatCurrency(totalMaturity)}</BorderedCell>
                                    <BorderedCell></BorderedCell>
                               </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            <RetirementPlansCard deposits={deposits} userId={userId} />
            <RetirementCalculatorCard />
        </div>
    );
}

    

    

    
