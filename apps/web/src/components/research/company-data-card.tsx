
'use client';
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Loader2, ThumbsDown, ThumbsUp, XCircle, Activity, TrendingUp, Edit, PlusCircle, Search } from "lucide-react";
import type { Stock, PriceData, TechnicalIndicator } from "@/types";
import { cn } from "@/lib/utils";
import { PriceChart } from "./price-chart";
import { getCompanyDetails } from "@/actions/company-actions";
import type { CompanyDetails } from "@/actions/company-actions";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { format } from "date-fns";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { addToSmartWatchlist } from "@/lib/utils";
import type { CompanyDetails, GrowthData, RatioRow, ShareholdingData } from '@/actions/company-actions';
import { TechnicalAnalysisChart } from './technical-analysis-card';

const initialQuickRatioData: { [key: string]: string | null } = {
    'Market Cap': null, 'Current Price': null, 'High / Low': null,
    'Stock P/E': null, 'Book Value': null, 'Dividend Yield': null,
    'Industry PE': null, 'Profit after tax': null, 'High price all time': null,
    'ROCE': null, 'ROE': null, 'Operating profit': null,
    'ROIC': null, 'EPS': null, 'CWIP': null,
    'Debt to equity': null, 'Sales growth': null, 'Profit growth': null,
    'Cash Equivalents': null, 'Reserves': null, 'Volume': null,
    'Intrinsic Value': null, 'Piotroski score': null, 'PEG Ratio': null,
    'Price to Cash flow': null, 'PEG Prev Qtr.': null, 'Low price all time': null,
    'Pledged percentage': null, 'Interest': null, 'Face Value': null,
    'Promoter holding': null, 'PB X PE': null, 'OP Prev Qtr.': null,
    'FII holding': null, 'Exp Qtr OP': null, 'ROCE 5Yr': null,
    'DII holding': null, 'Profit Var 3Yrs': null, 'EPS preceding year': null,
    'Public holding': null, '3Yrs PL': null, 'LPS growth 5Years': null,
    'Return over 1year': null, 'Sales growth 3Years': null, 'OPM last year': null,
    'NPM last year': null
};

const mockPros = [
    "Company has reduced debt.",
    "Company is almost debt free.",
    "Company has been maintaining a healthy dividend payout of 20.00%",
];
const mockCons = [
    "Stock is trading at 5.50 times its book value",
    "The company has delivered a poor sales growth of 5.00% over past five years.",
    "Company has a low return on equity of 10.00% for last 3 years.",
];

const mockIndicators: TechnicalIndicator[] = [
    { name: 'RSI (14)', value: '65.4', sentiment: 'Bullish' },
    { name: 'MACD', value: '12.3', sentiment: 'Bullish' },
    { name: '50-Day MA', value: '2850.00', sentiment: 'Neutral' },
    { name: '200-Day MA', 'value': '2700.00', sentiment: 'Neutral' },
    { name: 'Bollinger Bands', value: 'Upper: 3000, Lower: 2900', sentiment: 'Neutral' },
];

const mockGrowthData = {
    sales: { '10 Years': '5%', '5 Years': '0%', '3 Years': '1%', 'TTM': '0%' },
    profit: { '10 Years': '9%', '5 Years': '-4%', '3 Years': '3%', 'TTM': '54%' },
    cagr: { '10 Years': '17%', '5 Years': '16%', '3 Years': '10%', '1 Year': '-3%' },
    roe: { '10 Years': '6%', '5 Years': '5%', '3 Years': '4%', 'Last Year': '4%' },
};

const mockRatios = [
    { metric: 'Debtor Days', values: ['1', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0'] },
    { metric: 'Inventory Days', values: ['N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'] },
    { metric: 'Days Payable', values: ['N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'] },
    { metric: 'Cash Conversion Cycle', values: ['1', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0'] },
    { metric: 'Working Capital Days', values: ['-232', '-269', '-131', '-32', '-81', '-95', '-107', '-91', '-130', '-199', '-182', '-136'] },
    { metric: 'ROCE %', values: ['25%', '22%', '10%', '9%', '15%', '12%', '13%', '12%', '9%', '9%', '7%', '7%'] },
];

const mockShareholding = {
    periods: ['Jun 2022', 'Sep 2022', 'Dec 2022', 'Mar 2023', 'Jun 2023', 'Sep 2023', 'Dec 2023', 'Mar 2024', 'Jun 2024', 'Sep 2024', 'Dec 2024', 'Mar 2025'],
    data: [
        { category: 'Promoters +', values: ['69.82%', '69.82%', '69.82%', '69.82%', '69.82%', '69.82%', '69.82%', '69.82%', '69.82%', '69.82%', '69.82%', '69.82%'] },
        { category: 'FIIs +', values: ['0.06%', '0.00%', '0.00%', '0.00%', '0.04%', '0.08%', '0.00%', '0.03%', '0.10%', '0.00%', '0.00%', '0.07%'] },
        { category: 'DIIs +', values: ['0.91%', '0.91%', '0.91%', '0.91%', '0.91%', '0.91%', '0.91%', '0.91%', '0.91%', '0.91%', '0.91%', '0.91%'] },
        { category: 'Government +', values: ['7.37%', '7.37%', '7.37%', '7.37%', '7.37%', '7.37%', '7.37%', '7.37%', '7.37%', '7.37%', '7.37%', '7.37%'] },
        { category: 'Public -', values: ['21.84%', '21.89%', '21.91%', '21.91%', '21.87%', '21.83%', '21.90%', '21.87%', '21.80%', '21.90%', '21.90%', '21.82%'] },
        { category: 'Others', values: ['1.15', '1.15', '1.15', '1.15', '1.15', '1.15', '1.15', '1.15', '1.15', '1.15', '1.15', '1.15'] },
        { category: 'No. of Shareholders', values: ['47,220', '45,593', '45,380', '43,139', '43,291', '43,065', '48,098', '47,504', '48,935', '50,378', '50,838', '50,071'] },
    ]
};


const getSentimentColor = (sentiment: 'Bullish' | 'Bearish' | 'Neutral') => {
    switch (sentiment) {
        case 'Bullish': return 'text-green-600';
        case 'Bearish': return 'text-red-600';
        default: return 'text-muted-foreground';
    }
};

const SectionCard = ({ title, description, children, action }: { title: string, description?: string, children: React.ReactNode, action?: React.ReactNode }) => (
    <Card>
        <CardHeader>
             <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                    <CardTitle className="text-sm">{title}</CardTitle>
                    {description && <CardDescription className="text-xs">{description}</CardDescription>}
                </div>
                {action}
            </div>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
);

const BorderedTable = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("border rounded-lg", className)}>
        <Table>
            {children}
        </Table>
    </div>
);


const StyledTableCell = ({ children, className, ...props }: React.ComponentProps<typeof TableCell>) => (
    <TableCell className={cn("border p-2 text-xs", className)} {...props}>{children}</TableCell>
);

const StyledTableHead = ({ children, className, ...props }: React.ComponentProps<typeof TableHead>) => (
    <TableHead className={cn("border p-2 bg-muted/50 text-xs", className)} {...props}>{children}</TableHead>
);

const LoadingState = () => (
    <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
        <Loader2 className="animate-spin h-6 w-6 mr-2" />
        <span>Loading data...</span>
    </div>
);

const EmptyState = ({ message }: { message: string }) => (
     <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
        <span>{message}</span>
    </div>
)

const InfoList = ({ title, items, icon, colorClass }: { title: string, items: string[], icon: React.ReactNode, colorClass: string }) => (
    <div>
        <h4 className={`font-semibold flex items-center gap-2 mb-2 ${colorClass} text-sm`}>
            {icon}
            {title}
        </h4>
        <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
             {items.length > 0 ? items.map((item, index) => <li key={index}>{item}</li>) : <li>No items available.</li>}
        </ul>
    </div>
);

function EditQuickRatioDialog({ data, onSave }: { data: { [key: string]: string | null }, onSave: (newData: { [key: string]: string | null }) => void }) {
    const [open, setOpen] = React.useState(false);
    const [editedData, setEditedData] = React.useState(data);
    const [newFieldName, setNewFieldName] = React.useState('');
    const [newFieldValue, setNewFieldValue] = React.useState('');
    const { toast } = useToast();

    React.useEffect(() => {
        setEditedData(data);
    }, [data, open]);

    const handleInputChange = (key: string, value: string) => {
        setEditedData(prev => ({ ...prev, [key]: value }));
    };

    const handleAddField = () => {
        if (!newFieldName) {
            toast({ title: 'Field Name Required', description: 'Please enter a name for the new field.', variant: 'destructive' });
            return;
        }
        if (Object.keys(editedData).includes(newFieldName)) {
            toast({ title: 'Field Exists', description: 'A field with this name already exists.', variant: 'destructive' });
            return;
        }
        setEditedData(prev => ({ ...prev, [newFieldName]: newFieldValue }));
        setNewFieldName('');
        setNewFieldValue('');
        toast({ title: 'Field Added', description: `"${newFieldName}" has been added.` });
    };

    const handleSave = () => {
        onSave(editedData);
        toast({ title: "Quick Ratio Table Updated" });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-white"><Edit className="mr-2 h-3 w-3" /> ADD / EDIT</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Quick Ratio Table</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-72">
                    <div className="grid grid-cols-2 gap-4 p-1">
                        {Object.entries(editedData).map(([key, value]) => (
                            <div key={key} className="space-y-1">
                                <Label htmlFor={`qr-${key}`} className="text-xs">{key}</Label>
                                <Input
                                    id={`qr-${key}`}
                                    value={value || ''}
                                    onChange={(e) => handleInputChange(key, e.target.value)}
                                    placeholder="N/A"
                                />
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <Separator />
                <div className="pt-4">
                     <DialogTitle className="text-sm mb-4">Add New Field</DialogTitle>
                     <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                        <div className="space-y-1">
                            <Label htmlFor="new-field-name" className="text-xs">Field Name</Label>
                            <Input id="new-field-name" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="e.g. New Metric" />
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="new-field-value" className="text-xs">Field Value</Label>
                            <Input id="new-field-value" value={newFieldValue} onChange={(e) => setNewFieldValue(e.target.value)} placeholder="e.g. 123.45" />
                        </div>
                        <Button variant="outline" onClick={handleAddField}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const formatFinancialValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === 'None' || value === 'null') return 'N/A';
    const num = Number(value);
    if (isNaN(num)) return String(value);
    // Format large USD figures into billions (header carries the "$B" unit).
    return (num / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const FinancialsTable = ({ title, data, metrics, periodsToShow = 10 }: { title: string, data: any[] | undefined, metrics: { key: string, label: string }[], periodsToShow?: number }) => {
    if (!data || data.length === 0) {
        return <EmptyState message={`No ${title} data available.`} />
    }

    const isScraperFormat = data[0] && 'metric' in data[0] && ('val_0' in data[0] || 'values' in data[0]);

    const cellHL = (metric: string, i: number, currVal: string, allVals: string[]) => {
        if (['Sales', 'Net Profit'].includes(metric) && i < 3) {
            const cv = parseFloat(currVal.replace(/,/g, ''));
            const nv = allVals[i + 1] ? parseFloat(allVals[i + 1].replace(/,/g, '')) : NaN;
            if (!isNaN(cv) && !isNaN(nv)) return cv > nv ? 'text-green-600' : 'text-red-600';
        }
        if (['Cash from Operating Activity', 'Cash from Investing Activity', 'Cash from Financing Activity', 'Net Cash Flow', 'Free Cash Flow'].includes(metric) && i === 0) {
            const cv = parseFloat(currVal.replace(/,/g, ''));
            if (!isNaN(cv) && cv !== 0) return cv > 0 ? 'text-green-600' : 'text-red-600';
        }
        if (i === 0 && /cfo|ops?\/op|from ops/i.test(metric)) {
            const cv = parseFloat(currVal.replace(/,/g, '').replace(/%/g, ''));
            if (!isNaN(cv)) return cv > 80 ? 'bg-green-200' : 'bg-red-200';
        }
        return '';
    };

    if (isScraperFormat) {
        const scraperData = data as any[];
        const valKeys = Object.keys(scraperData[0]).filter(k => k.startsWith('val_')).sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));
        const numPeriods = valKeys.length > 0 ? valKeys.length : Math.max(...scraperData.map(r => (r.values || []).length));
        const quarterMonths = ['Mar', 'Jun', 'Sep', 'Dec'];
        const now = new Date();
        const endQ = Math.floor(now.getMonth() / 3);
        const endYear = now.getFullYear();
        const periods: string[] = [];
        for (let i = 0; i < numPeriods; i++) {
            const offset = numPeriods - 1 - i;
            const totalQ = endQ - offset;
            const qIndex = ((totalQ % 4) + 4) % 4;
            const yearOffset = Math.floor((totalQ - qIndex) / 4);
            periods.push(`${quarterMonths[qIndex]} ${endYear + yearOffset}`);
        }
        periods.reverse();

        return (
            <div className="overflow-x-auto">
                <BorderedTable>
                    <TableHeader>
                        <TableRow>
                            <StyledTableHead className="sticky left-0 bg-muted/80 backdrop-blur-sm">{title}</StyledTableHead>
                            {periods.map(p => <StyledTableHead key={p} className="text-right">{p}</StyledTableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {scraperData.map((row: any) => (
                            <TableRow key={row.metric || Math.random()}>
                                <StyledTableCell className="font-medium sticky left-0 bg-muted/80 backdrop-blur-sm">{row.metric}</StyledTableCell>
                                {valKeys.length > 0 ? valKeys.slice().reverse().map((vk, i) => {
                                    const allV = valKeys.slice().reverse().map(k => String(row[k] ?? ''));
                                    return (
                                        <StyledTableCell key={`${row.metric}-${i}`} className={`text-right font-mono ${cellHL(row.metric, i, String(row[vk] ?? ''), allV)}`}>
                                            {row[vk] ?? 'N/A'}
                                        </StyledTableCell>
                                    );
                                }) : (row.values || []).slice().reverse().map((val: any, i: number) => {
                                    const allV = (row.values || []).slice().reverse().map((v: any) => String(v ?? ''));
                                    return (
                                        <StyledTableCell key={`${row.metric}-${i}`} className={`text-right font-mono ${cellHL(row.metric, i, String(val ?? ''), allV)}`}>
                                            {val ?? 'N/A'}
                                        </StyledTableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </BorderedTable>
            </div>
        );
    }

    const reversedData = [...data].reverse();
    const records = reversedData.slice(0, periodsToShow);
    const periods = records.map(d => {
        try { return format(new Date(d.fiscalDateEnding), 'MMM yyyy'); } catch { return d.fiscalDateEnding || 'N/A'; }
    });

    return (
        <div className="overflow-x-auto">
            <BorderedTable>
                <TableHeader>
                    <TableRow>
                        <StyledTableHead className="sticky left-0 bg-muted/80 backdrop-blur-sm">{title}</StyledTableHead>
                         {periods.map(p => <StyledTableHead key={p} className="text-right">{p}</StyledTableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {metrics.map(metric => (
                         <TableRow key={metric.key}>
                            <StyledTableCell className="font-medium sticky left-0 bg-muted/80 backdrop-blur-sm">{metric.label}</StyledTableCell>
                            {records.map((rec, index) => (
                                <StyledTableCell key={`${rec.fiscalDateEnding || index}-${metric.key}`} className="text-right font-mono">
                                    {formatFinancialValue(rec[metric.key])}
                                </StyledTableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </BorderedTable>
        </div>
    )
};

const RatiosTable = ({ title, data, periods, periodsToShow = 12 }: { title: string, data: { metric: string, values: (string | null)[] }[], periods: string[], periodsToShow?: number }) => {
    const displayPeriods = periods.slice().reverse().slice(0, periodsToShow);
    return (
        <div className="overflow-x-auto">
            <BorderedTable>
                <TableHeader>
                    <TableRow>
                        <StyledTableHead className="sticky left-0 bg-muted/80 backdrop-blur-sm">{title}</StyledTableHead>
                         {displayPeriods.map(p => <StyledTableHead key={p} className="text-right">{p.replace('Mar ', '')}</StyledTableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(metric => (
                         <TableRow key={metric.metric}>
                            <StyledTableCell className="font-medium sticky left-0 bg-muted/80 backdrop-blur-sm">{metric.metric}</StyledTableCell>
                            {metric.values.slice().reverse().slice(0, periodsToShow).map((val, index) => (
                                <StyledTableCell key={`${metric.metric}-${index}`} className="text-right font-mono">
                                    {val ?? 'N/A'}
                                </StyledTableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </BorderedTable>
        </div>
    )
};


const ShareholdingTable = ({ title, data, periods, periodsToShow = 12 }: { title: string, data: { category: string, values: (string | null)[] }[], periods: string[], periodsToShow?: number }) => {
    const displayPeriods = periods.slice().reverse().slice(0, periodsToShow);
    return (
        <div className="overflow-x-auto">
            <BorderedTable>
                <TableHeader>
                    <TableRow>
                        <StyledTableHead className="sticky left-0 bg-muted/80 backdrop-blur-sm">{title}</StyledTableHead>
                         {displayPeriods.map(p => <StyledTableHead key={p} className="text-right">{p}</StyledTableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(item => (
                         <TableRow key={item.category}>
                            <StyledTableCell className="font-medium sticky left-0 bg-muted/80 backdrop-blur-sm">{item.category}</StyledTableCell>
                            {item.values.slice().reverse().slice(0, periodsToShow).map((val, index) => (
                                <StyledTableCell key={`${item.category}-${index}`} className="text-right font-mono">
                                    {val ?? 'N/A'}
                                </StyledTableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </BorderedTable>
        </div>
    )
};

const GrowthTable = ({ data }: { data: typeof mockGrowthData }) => {
    return (
        <BorderedTable className="mb-6">
            <TableBody>
                <TableRow>
                    <StyledTableHead>Compounded Sales Growth</StyledTableHead>
                    <StyledTableHead>Compounded Profit Growth</StyledTableHead>
                    <StyledTableHead>Stock Price CAGR</StyledTableHead>
                    <StyledTableHead>Return on Equity</StyledTableHead>
                </TableRow>
                {Object.keys(data.sales).map(period => (
                    <TableRow key={period}>
                        <StyledTableCell><span className="font-semibold">{period}:</span> {data.sales[period as keyof typeof data.sales]}</StyledTableCell>
                        <StyledTableCell><span className="font-semibold">{period}:</span> {data.profit[period as keyof typeof data.profit]}</StyledTableCell>
                        <StyledTableCell><span className="font-semibold">{period.replace('TTM', '1 Year')}:</span> {data.cagr[period.replace('TTM', '1 Year') as keyof typeof data.cagr]}</StyledTableCell>
                        <StyledTableCell><span className="font-semibold">{period.replace('TTM', 'Last Year')}:</span> {data.roe[period.replace('TTM', 'Last Year') as keyof typeof data.roe]}</StyledTableCell>
                            </TableRow>
                        ))}
            </TableBody>
        </BorderedTable>
    );
};


export function CompanyDataCard({ stock, userId, onProsConsData, onSwotData, onStockSelect }: { stock: Stock, userId: string, onProsConsData: (data: { pros: string[], cons: string[] }) => void, onSwotData?: (data: { strengths: string[], weaknesses: string[], opportunities: string[], threats: string[] }) => void, onStockSelect: (stockName: string) => void }) {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [companyNameInput, setCompanyNameInput] = React.useState(stock?.name || '');

    const [quickRatioData, setQuickRatioData] = React.useState(initialQuickRatioData);
    
    const [pros, setPros] = React.useState<string[]>([]);
    const [cons, setCons] = React.useState<string[]>([]);

    const [companyDetails, setCompanyDetails] = React.useState<CompanyDetails | null>(null);
    const [swotData, setSwotData] = React.useState<{ strengths: string[], weaknesses: string[], opportunities: string[], threats: string[] } | null>(null);
    const [isFetchingDetails, setIsFetchingDetails] = React.useState(false);

    const [priceData, setPriceData] = React.useState<PriceData[] | null>(null);
    const [isTAError, setTAError] = React.useState<string | null>(null);
    const [isTAPending, startTransition] = React.useTransition();
    const { toast } = useToast();
    const isFirstLoad = React.useRef(true);
    
    React.useEffect(() => {
        setCompanyNameInput(stock?.name || '');
    }, [stock]);

    React.useEffect(() => {
        if (stock) {
            const fetchData = async () => {
                setIsLoading(true);
                setError(null);
                
                startTransition(async () => {
                    setTAError(null);
                    setPriceData(null);
                    try {
                        const apiKey = (await import('@/lib/api-keys')).getNextAlphaVantageKey();
                        if (apiKey) {
                            const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stock.symbol}&apikey=${apiKey}`;
                            const res = await fetch(url);
                            const data = await res.json();
                            const series = data['Time Series (Daily)'];
                            if (series) {
                                const prices: PriceData[] = Object.entries(series).slice(0, 365).map(([date, vals]: [string, any]) => ({
                                    date,
                                    price: parseFloat(vals['4. close']),
                                })).reverse();
                                if (prices.length > 0) setPriceData(prices);
                            }
                        }
                    } catch (e) {
                        setTAError('Could not fetch price data.');
                    }
                });

                try {
                    const detailsResult = await fetch('/api/company-details', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stockName: stock.name }) }).then(r => r.json());
                    if (detailsResult.success && detailsResult.data) {
                        const d = detailsResult.data;
                        setCompanyDetails(d);
                        setQuickRatioData(d.quickRatio || initialQuickRatioData);
                        setPros(d.prosCons?.pros || mockPros);
                        setCons(d.prosCons?.cons || mockCons);
                        onProsConsData(d.prosCons || { pros: mockPros, cons: mockCons });
                        if (onSwotData && d.swot) {
                            onSwotData(d.swot);
                        }
                        if (!isFirstLoad.current) {
                            toast({ title: "Data Loaded", description: `Data loaded for ${d.name}.` });
                        }
                        isFirstLoad.current = false;
                    } else {
                        toast({ title: "Fetch Failed", description: detailsResult.error || 'No data returned', variant: 'destructive' });
                    }

                } catch (e) {
                    console.error("Unexpected error in company data fetch:", e);
                }

                setIsLoading(false);
            };
            fetchData();
        }
    }, [stock, onProsConsData, toast]);

    const quickRatioKeys = Object.keys(quickRatioData);
    
    const pnlMetrics = [
        { key: 'totalRevenue', label: 'Sales' },
        { key: 'operatingIncome', label: 'Operating Profit' },
        { key: 'netIncome', label: 'Net Profit' }
    ];
    
    const balanceSheetMetrics = [
        { key: 'totalShareholderEquity', label: 'Equity Capital' },
        { key: 'retainedEarnings', label: 'Reserves' },
        { key: 'longTermDebt', label: 'Borrowings' },
        { key: 'totalLiabilities', label: 'Total Liabilities' },
        { key: 'propertyPlantEquipment', label: 'Fixed Assets' },
        { key: 'goodwill', label: 'CWIP' }, // Using Goodwill as a proxy for CWIP
        { key: 'investments', label: 'Investments' },
        { key: 'otherCurrentAssets', label: 'Other Assets' }, // Using otherCurrentAssets as other assets
        { key: 'totalAssets', label: 'Total Assets' }
    ];
    
    const cashFlowMetrics = [
        { key: 'operatingCashflow', label: 'Cash from Operating Activity' },
        { key: 'cashflowFromInvestment', label: 'Cash from Investing Activity' },
        { key: 'cashflowFromFinancing', label: 'Cash from Financing Activity' },
        { key: 'netIncome', label: 'Net Cash Flow' }, // Note: NetIncome is not the same as Net Cash Flow, but used as a proxy.
    ];
    
    const handleAddToWatchlist = (stockName: string) => {
        if (!userId) return;
        const added = addToSmartWatchlist(stockName, userId);
        if (added) {
            toast({ title: 'Added to Watchlist', description: `${stockName} has been added to your Smart Watchlist.` });
        } else {
            toast({ title: 'Already in Watchlist', description: `${stockName} is already in your Smart Watchlist.` });
        }
    };

    const renderPeerTable = (aiData: any, fallbackPeers?: any[]) => {
        const peers = (aiData?.peerData?.length ? aiData.peerData : fallbackPeers)?.slice(0, 9) ?? [];
        const isRawFormat = !!(aiData?.peerData?.length);

        if (!peers.length) {
            return <EmptyState message="No peer data available." />
        }

        const fmtVal = (val: any, isRaw: boolean) => {
            const n = Number(val);
            if (isNaN(n)) return 'N/A';
            if (isRaw && n > 1e7) return (n / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 });
            if (n >= 1000) return Math.round(n).toLocaleString('en-US');
            return n.toFixed(2);
        };

        const roePct = (val: any) => {
            const n = Number(val);
            if (isNaN(n)) return 'N/A';
            return n.toFixed(2);
        };

        return (
             <div className="overflow-x-auto">
                <BorderedTable>
                    <TableHeader>
                        <TableRow>
                            <StyledTableHead>Name</StyledTableHead>
                            <StyledTableHead>CMP $</StyledTableHead>
                            <StyledTableHead>P/E</StyledTableHead>
                            <StyledTableHead>Mkt Cap $B</StyledTableHead>
                            <StyledTableHead>Div Yld %</StyledTableHead>
                            <StyledTableHead>NP Qtr $B</StyledTableHead>
                            <StyledTableHead>Sales Qtr $B</StyledTableHead>
                            <StyledTableHead>ROCE %</StyledTableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {peers.map((peer: any, index: number) => (
                             <TableRow key={peer.Symbol || index}>
                                <StyledTableCell className="font-medium">
                                    <ContextMenu>
                                        <ContextMenuTrigger>{peer.Name}</ContextMenuTrigger>
                                        <ContextMenuContent>
                                            <ContextMenuItem onClick={() => handleAddToWatchlist(peer.Name)}>
                                                Add to Smart Watchlist
                                            </ContextMenuItem>
                                        </ContextMenuContent>
                                    </ContextMenu>
                                </StyledTableCell>
                                <StyledTableCell>{peer.CMP || 'N/A'}</StyledTableCell>
                                <StyledTableCell>{Number(peer.PERatio).toFixed(2)}</StyledTableCell>
                                <StyledTableCell>{fmtVal(peer.MarketCapitalization, isRawFormat)}</StyledTableCell>
                                <StyledTableCell>{Number(peer.DividendYield).toFixed(2)}</StyledTableCell>
                                <StyledTableCell>{fmtVal(peer.NetIncome, isRawFormat)}</StyledTableCell>
                                <StyledTableCell>{fmtVal(peer.TotalRevenue, isRawFormat)}</StyledTableCell>
                                <StyledTableCell>{roePct(peer.ROCE)}</StyledTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </BorderedTable>
            </div>
        )
    }
    
    const handleFetchData = async () => {
        if (!companyNameInput) {
            toast({ title: "Company Name Required", description: "Please enter a company name to fetch data.", variant: "destructive" });
            return;
        }
        setIsFetchingDetails(true);
        onStockSelect(companyNameInput);
        toast({ title: "Fetching...", description: `Loading data for ${companyNameInput}` });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-1 items-baseline gap-2 min-w-0">
                        <CardTitle className="font-headline text-base flex items-center gap-2">
                            <Building2 /> Company Data
                        </CardTitle>
                        <CardDescription className="text-xs truncate">
                            Key fundamental and financial data for {stock.name}.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="text" 
                            placeholder="Enter company name..." 
                            value={companyNameInput} 
                            onChange={(e) => setCompanyNameInput(e.target.value)}
                            className="text-white h-9 w-48"
                        />
                        <Button type="button" onClick={handleFetchData} size="sm">
                            <Search className="mr-2 h-4 w-4" /> Fetch
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
                
                {isLoading ? <LoadingState /> : error ? <EmptyState message={error} /> : (
                <>
                <SectionCard
                    title="Quick Ratio Table"
                    action={<EditQuickRatioDialog data={quickRatioData} onSave={setQuickRatioData} />}
                >
                    <BorderedTable>
                        <TableBody>
                            {Array.from({ length: Math.ceil(quickRatioKeys.length / 3) }).map((_, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {Array.from({ length: 3 }).map((_, colIndex) => {
                                        const dataIndex = rowIndex * 3 + colIndex;
                                        if (dataIndex < quickRatioKeys.length) {
                                            const key = quickRatioKeys[dataIndex];
                                            const value = quickRatioData[key as keyof typeof quickRatioData];
                                            return (
                                                <React.Fragment key={key}>
                                                    <StyledTableCell className="font-medium">{key}</StyledTableCell>
                                                    <StyledTableCell>
                                                        {value ?? <span className="text-muted-foreground">N/A</span>}
                                                    </StyledTableCell>
                                                </React.Fragment>
                                            );
                                        }
                                        return <StyledTableCell key={colIndex} colSpan={2}></StyledTableCell>;
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </BorderedTable>
                </SectionCard>
                <SectionCard title="Pros and Cons">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoList title="Pros" items={pros} icon={<ThumbsUp />} colorClass="text-green-600" />
                        <InfoList title="Cons" items={cons} icon={<ThumbsDown />} colorClass="text-red-600" />
                    </div>
                </SectionCard>
                <SectionCard title="Peer Comparison">
                   {renderPeerTable(null, companyDetails?.peerData)}
                </SectionCard>

                <SectionCard title="Quarterly Results">
                    <FinancialsTable title="Quarterly Results" data={companyDetails?.quarterlyReports} metrics={pnlMetrics} />
                </SectionCard>
                <SectionCard title="Profit & Loss">
                    <FinancialsTable title="P&L" data={companyDetails?.annualReports} metrics={pnlMetrics} />
                </SectionCard>
                
                <GrowthTable data={companyDetails?.growth || mockGrowthData} />

                <SectionCard title="Balance Sheet">
                    <FinancialsTable title="Balance Sheet" data={companyDetails?.balanceSheets} metrics={balanceSheetMetrics} />
                </SectionCard>
                <SectionCard title="Cash Flows">
                     <FinancialsTable title="Cash Flows" data={companyDetails?.cashFlows} metrics={cashFlowMetrics} />
                </SectionCard>
                <SectionCard title="Ratios">
                    <RatiosTable title="Ratios" data={companyDetails?.ratios || mockRatios} periods={companyDetails?.shareholding?.periods || Array.from({length: 12}, (_, i) => `Mar ${2014 + i}`)} />
                </SectionCard>
                 <SectionCard title="Shareholding Pattern" description="Numbers in percentages">
                    <ShareholdingTable title="Shareholding Pattern" data={companyDetails?.shareholding?.data || mockShareholding.data} periods={companyDetails?.shareholding?.periods || mockShareholding.periods} />
                </SectionCard>

                <SectionCard title="SWOT Analysis">
                    <div className="grid grid-cols-1 md:grid-cols-2 border border-border rounded-lg">
                        <div className="p-4 border-b md:border-b md:border-r border-border">
                            <h4 className="font-semibold text-green-600 mb-2">Strengths</h4>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                {(companyDetails?.swot?.strengths?.length ? companyDetails.swot.strengths : ['Strong market position', 'Experienced management', 'Solid financials']).map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                        <div className="p-4 border-b md:border-b border-border">
                            <h4 className="font-semibold text-red-600 mb-2">Weaknesses</h4>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                {(companyDetails?.swot?.weaknesses?.length ? companyDetails.swot.weaknesses : ['High valuation', 'Domestic dependence', 'Regulatory costs']).map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                        </div>
                        <div className="p-4 border-b md:border-b-0 md:border-r border-border">
                            <h4 className="font-semibold text-blue-600 mb-2">Opportunities</h4>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                {(companyDetails?.swot?.opportunities?.length ? companyDetails.swot.opportunities : ['New markets', 'Digital transformation', 'Acquisitions']).map((o, i) => <li key={i}>{o}</li>)}
                            </ul>
                        </div>
                        <div className="p-4">
                            <h4 className="font-semibold text-orange-600 mb-2">Threats</h4>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                {(companyDetails?.swot?.threats?.length ? companyDetails.swot.threats : ['Competition', 'Regulations', 'Economic risks']).map((t, i) => <li key={i}>{t}</li>)}
                            </ul>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Technical Analysis" description={`Key technical indicators and price action for ${stock.name}.`}>
                    <TechnicalAnalysisChart stock={stock} />
                </SectionCard>
                
                </>
                )}
            </CardContent>
        </Card>
    );
}
    
