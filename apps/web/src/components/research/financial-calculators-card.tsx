
'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Download, ListPlus } from "lucide-react";
import type { Stock, WatchlistStock } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const CalculatorInput = ({ label, value, onChange, placeholder, name }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, name?: string }) => (
    <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <Input type={label === 'Date' ? 'date' : 'text'} name={name} value={value} onChange={onChange} placeholder={placeholder} className="h-8 text-sm text-white placeholder:text-gray-400" />
    </div>
);

const ResultField = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-md">
        <span>{label}</span>
        <span className="font-semibold">{typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : value}</span>
    </div>
);


const UptrendCalculator = ({ stock, userId }: { stock: Stock, userId: string }) => {
    const { toast } = useToast();
    const [inputs, setInputs] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        companyName: '',
        currentMarketCap: '',
        currentSharePrice: '',
        fairPE: '',
        ttmSales: '',
        ttmNetProfit: '',
        lastQuarterProfit: '',
    });
    const [results, setResults] = useState<{ forwardProfit: number | null, forwardMarketCap: number | null, upsidePotential: number | null, expectedPrice: number | null }>({ forwardProfit: null, forwardMarketCap: null, upsidePotential: null, expectedPrice: null });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputs({ ...inputs, [e.target.name]: e.target.value });
    };

    const calculate = () => {
        const lqp = parseFloat(inputs.lastQuarterProfit);
        const pe = parseFloat(inputs.fairPE);
        const cmc = parseFloat(inputs.currentMarketCap);
        const csp = parseFloat(inputs.currentSharePrice);

        if (isNaN(lqp) || isNaN(pe) || isNaN(cmc) || isNaN(csp)) return;

        const forwardProfit = lqp * 4;
        const forwardMarketCap = pe * forwardProfit;
        const upsidePotential = ((forwardMarketCap - cmc) / cmc);
        const expectedPrice = csp * (1 + upsidePotential);

        setResults({ forwardProfit, forwardMarketCap, upsidePotential, expectedPrice });
    };

    const handleAddToWatchlist = () => {
        if (!inputs.companyName) {
            toast({
                title: "Company Name Required",
                description: "Please enter a company name to add it to the watchlist.",
                variant: "destructive",
            });
            return;
        }
        if (!userId) return;

        const newStock: WatchlistStock = {
            id: Date.now().toString(),
            date: inputs.date,
            name: inputs.companyName,
            price: parseFloat(inputs.currentSharePrice) || 0,
            pe: parseFloat(inputs.fairPE) || 0
        };

        try {
            const existingWatchlist = localStorage.getItem(`smartWatchlist_${userId}`);
            const watchlist = existingWatchlist ? JSON.parse(existingWatchlist) : [];
            watchlist.push(newStock);
            localStorage.setItem(`smartWatchlist_${userId}`, JSON.stringify(watchlist));
            
            toast({
                title: "Added to Watchlist",
                description: `${inputs.companyName} has been added to your Smart Watchlist.`,
            });
            // Force a re-render in the watchlist component by dispatching a custom event
            window.dispatchEvent(new Event('storage'));

        } catch (error) {
             toast({
                title: "Error",
                description: "Could not add stock to watchlist.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3 p-4 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                    <CalculatorInput label="Date" name="date" value={inputs.date} onChange={handleInputChange} />
                    <CalculatorInput label="Company Name" name="companyName" value={inputs.companyName} onChange={handleInputChange} placeholder="e.g., Reliance Industries" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CalculatorInput label="Current Market Cap (cr)" name="currentMarketCap" value={inputs.currentMarketCap} onChange={handleInputChange} placeholder="e.g., 5724" />
                    <CalculatorInput label="Current Share Price" name="currentSharePrice" value={inputs.currentSharePrice} onChange={handleInputChange} placeholder="e.g., 752" />
                    <CalculatorInput label="Fair PE" name="fairPE" value={inputs.fairPE} onChange={handleInputChange} placeholder="e.g., 15.9" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <CalculatorInput label="TTM Sales (Cr.)" name="ttmSales" value={inputs.ttmSales} onChange={handleInputChange} placeholder="e.g., 1000" />
                    <CalculatorInput label="TTM Net Profit (Cr.)" name="ttmNetProfit" value={inputs.ttmNetProfit} onChange={handleInputChange} placeholder="e.g., 100" />
                    <CalculatorInput label="Last Quarter Profit (Cr)" name="lastQuarterProfit" value={inputs.lastQuarterProfit} onChange={handleInputChange} placeholder="e.g., 90" />
                    <Button onClick={calculate} className="w-full h-9">Calculate</Button>
                </div>
            </div>
            <div className="space-y-2">
                <ResultField label="Exp. 1Y Forward Net Profit" value={results.forwardProfit !== null ? `${results.forwardProfit.toFixed(2)}cr` : 'N/A'} />
                <ResultField label="Exp. 1Y Forward Market Cap" value={results.forwardMarketCap !== null ? `${results.forwardMarketCap.toFixed(2)}cr` : 'N/A'} />
                <ResultField label="Upside Potential" value={results.upsidePotential !== null ? `${(results.upsidePotential * 100).toFixed(2)}%` : 'N/A'} />
                <ResultField label="Exp. Price After 1 Year" value={results.expectedPrice !== null ? `₹${results.expectedPrice.toFixed(2)}` : 'N/A'} />
                 {results.expectedPrice !== null && (
                    <div className="pt-2">
                        <Button variant="outline" className="w-full text-white" onClick={handleAddToWatchlist}>
                            <ListPlus className="mr-2" /> Add to Smart Watchlist
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

const LargeOrderCalculator = ({ stock, userId }: { stock: Stock, userId: string }) => {
    const { toast } = useToast();
    const [inputs, setInputs] = useState({ date: format(new Date(), 'yyyy-MM-dd'), companyName: '', marketCap: '', sharePrice: '', fairPE: '', currentOrderbook: '', timeline: '', ttmSales: '', ttmNetProfit: '' });
    const [results, setResults] = useState<{ forwardSales: number | null, forwardProfit: number | null, forwardMarketCap: number | null, upsidePotential: number | null, expectedPrice: number | null }>({ forwardSales: null, forwardProfit: null, forwardMarketCap: null, upsidePotential: null, expectedPrice: null });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputs({ ...inputs, [e.target.name]: e.target.value });
    };

    const calculate = () => {
        const orderbook = parseFloat(inputs.currentOrderbook);
        const timeline = parseFloat(inputs.timeline);
        const ttmSales = parseFloat(inputs.ttmSales);
        const ttmNetProfit = parseFloat(inputs.ttmNetProfit);
        const pe = parseFloat(inputs.fairPE);
        const cmc = parseFloat(inputs.marketCap);
        const csp = parseFloat(inputs.sharePrice);

        if (isNaN(orderbook) || isNaN(timeline) || isNaN(ttmSales) || isNaN(ttmNetProfit) || isNaN(pe) || isNaN(cmc) || isNaN(csp) || timeline === 0 || ttmSales === 0) return;

        const margin = ttmNetProfit / ttmSales;
        const forwardSales = (orderbook * 12) / timeline;
        const forwardProfit = forwardSales * margin;
        const forwardMarketCap = pe * forwardProfit;
        const upsidePotential = (forwardMarketCap - cmc) / cmc;
        const expectedPrice = csp * (1 + upsidePotential);

        setResults({ forwardSales, forwardProfit, forwardMarketCap, upsidePotential, expectedPrice });
    };
    
    const handleAddToWatchlist = () => {
        if (!inputs.companyName) {
            toast({
                title: "Company Name Required",
                description: "Please enter a company name to add it to the watchlist.",
                variant: "destructive",
            });
            return;
        }
        if (!userId) return;
        
        const newStock: WatchlistStock = {
            id: Date.now().toString(),
            date: inputs.date,
            name: inputs.companyName,
            price: parseFloat(inputs.sharePrice) || 0,
            pe: parseFloat(inputs.fairPE) || 0
        };

        try {
            const existingWatchlist = localStorage.getItem(`smartWatchlist_${userId}`);
            const watchlist = existingWatchlist ? JSON.parse(existingWatchlist) : [];
            watchlist.push(newStock);
            localStorage.setItem(`smartWatchlist_${userId}`, JSON.stringify(watchlist));
            
            toast({
                title: "Added to Watchlist",
                description: `${inputs.companyName} has been added to your Smart Watchlist.`,
            });
            window.dispatchEvent(new Event('storage'));

        } catch (error) {
             toast({
                title: "Error",
                description: "Could not add stock to watchlist.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3 p-4 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                    <CalculatorInput label="Date" name="date" value={inputs.date} onChange={handleInputChange} />
                    <CalculatorInput label="Company Name" name="companyName" value={inputs.companyName} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <CalculatorInput label="Market Cap (cr)" name="marketCap" value={inputs.marketCap} onChange={handleInputChange} />
                    <CalculatorInput label="Share Price" name="sharePrice" value={inputs.sharePrice} onChange={handleInputChange} />
                    <CalculatorInput label="Fair PE" name="fairPE" value={inputs.fairPE} onChange={handleInputChange} />
                    <CalculatorInput label="TTM Sales (Cr.)" name="ttmSales" value={inputs.ttmSales} onChange={handleInputChange} placeholder="e.g., 1000" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <CalculatorInput label="TTM Net Profit (Cr.)" name="ttmNetProfit" value={inputs.ttmNetProfit} onChange={handleInputChange} placeholder="e.g., 100" />
                    <CalculatorInput label="Current Orderbook (cr)" name="currentOrderbook" value={inputs.currentOrderbook} onChange={handleInputChange} placeholder="e.g., 234" />
                    <CalculatorInput label="Timeline (months)" name="timeline" value={inputs.timeline} onChange={handleInputChange} placeholder="e.g., 10" />
                    <Button onClick={calculate} className="w-full h-9">Calculate</Button>
                </div>
            </div>
            <div className="space-y-2">
                <ResultField label="Exp. 1Y Forward Sales" value={results.forwardSales !== null ? `${results.forwardSales.toFixed(2)}cr` : 'N/A'} />
                <ResultField label="Exp. 1Y Forward Net Profit" value={results.forwardProfit !== null ? `${results.forwardProfit.toFixed(2)}cr` : 'N/A'} />
                <ResultField label="Exp. 1Y Forward Market Cap" value={results.forwardMarketCap !== null ? `${results.forwardMarketCap.toFixed(2)}cr` : 'N/A'} />
                <ResultField label="Upside Potential" value={results.upsidePotential !== null ? `${(results.upsidePotential * 100).toFixed(2)}%` : 'N/A'} />
                <ResultField label="Exp. Price After 1 Year" value={results.expectedPrice !== null ? `₹${results.expectedPrice.toFixed(2)}` : 'N/A'} />
                 {results.expectedPrice !== null && (
                    <div className="pt-2">
                        <Button variant="outline" className="w-full text-white" onClick={handleAddToWatchlist}>
                            <ListPlus className="mr-2" /> Add to Smart Watchlist
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

const CapacityExpansionCalculator = ({ stock, userId }: { stock: Stock, userId: string }) => {
    const { toast } = useToast();
    const [inputs, setInputs] = useState({ date: format(new Date(), 'yyyy-MM-dd'), companyName: '', marketCap: '', sharePrice: '', fairPE: '', ttmSales: '', ttmNetProfit: '', percentIncrease: '' });
    const [results, setResults] = useState<{ forwardSales: number | null, forwardProfit: number | null, forwardMarketCap: number | null, upsidePotential: number | null, expectedPrice: number | null }>({ forwardSales: null, forwardProfit: null, forwardMarketCap: null, upsidePotential: null, expectedPrice: null });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputs({ ...inputs, [e.target.name]: e.target.value });
    };

    const calculate = () => {
        const sales = parseFloat(inputs.ttmSales);
        const netProfit = parseFloat(inputs.ttmNetProfit);
        const increase = parseFloat(inputs.percentIncrease);
        const pe = parseFloat(inputs.fairPE);
        const cmc = parseFloat(inputs.marketCap);
        const csp = parseFloat(inputs.sharePrice);

        if (isNaN(sales) || isNaN(increase) || isNaN(netProfit) || isNaN(pe) || isNaN(cmc) || isNaN(csp) || sales === 0) return;

        const margin = netProfit / sales;
        const forwardSales = sales * (1 + (increase / 100));
        const forwardProfit = forwardSales * margin;
        const forwardMarketCap = pe * forwardProfit;
        const upsidePotential = (forwardMarketCap - cmc) / cmc;
        const expectedPrice = csp * (1 + upsidePotential);

        setResults({ forwardSales, forwardProfit, forwardMarketCap, upsidePotential, expectedPrice });
    };

    const handleAddToWatchlist = () => {
        if (!inputs.companyName) {
            toast({
                title: "Company Name Required",
                description: "Please enter a company name to add it to the watchlist.",
                variant: "destructive",
            });
            return;
        }
        if (!userId) return;
        
        const newStock: WatchlistStock = {
            id: Date.now().toString(),
            date: inputs.date,
            name: inputs.companyName,
            price: parseFloat(inputs.sharePrice) || 0,
            pe: parseFloat(inputs.fairPE) || 0
        };

        try {
            const existingWatchlist = localStorage.getItem(`smartWatchlist_${userId}`);
            const watchlist = existingWatchlist ? JSON.parse(existingWatchlist) : [];
            watchlist.push(newStock);
            localStorage.setItem(`smartWatchlist_${userId}`, JSON.stringify(watchlist));
            
            toast({
                title: "Added to Watchlist",
                description: `${inputs.companyName} has been added to your Smart Watchlist.`,
            });
            window.dispatchEvent(new Event('storage'));

        } catch (error) {
             toast({
                title: "Error",
                description: "Could not add stock to watchlist.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3 p-4 border rounded-lg">
                 <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                    <CalculatorInput label="Date" name="date" value={inputs.date} onChange={handleInputChange} />
                    <CalculatorInput label="Company Name" name="companyName" value={inputs.companyName} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CalculatorInput label="Market Cap (cr)" name="marketCap" value={inputs.marketCap} onChange={handleInputChange} />
                    <CalculatorInput label="Share Price" name="sharePrice" value={inputs.sharePrice} onChange={handleInputChange} />
                    <CalculatorInput label="Fair PE" name="fairPE" value={inputs.fairPE} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <CalculatorInput label="TTM Sales (cr)" name="ttmSales" value={inputs.ttmSales} onChange={handleInputChange} placeholder="e.g., 180.8" />
                     <CalculatorInput label="TTM Net Profit (Cr.)" name="ttmNetProfit" value={inputs.ttmNetProfit} onChange={handleInputChange} placeholder="e.g., 20.3" />
                    <CalculatorInput label="Percent Increase in Capacity (%)" name="percentIncrease" value={inputs.percentIncrease} onChange={handleInputChange} placeholder="e.g., 60.8" />
                    <Button onClick={calculate} className="w-full h-9">Calculate</Button>
                </div>
            </div>
            <div className="space-y-2">
                <ResultField label="Exp. 1Y Forward Sales" value={results.forwardSales !== null ? `${results.forwardSales.toFixed(2)}cr` : 'N/A'} />
                <ResultField label="Exp. 1Y Forward Net Profit" value={results.forwardProfit !== null ? `${results.forwardProfit.toFixed(2)}cr` : 'N/A'} />
                <ResultField label="Exp. 1Y Forward Market Cap" value={results.forwardMarketCap !== null ? `${results.forwardMarketCap.toFixed(2)}cr` : 'N/A'} />
                <ResultField label="Upside Potential" value={results.upsidePotential !== null ? `${(results.upsidePotential * 100).toFixed(2)}%` : 'N/A'} />
                <ResultField label="Exp. Price After 1 Year" value={results.expectedPrice !== null ? `₹${results.expectedPrice.toFixed(2)}` : 'N/A'} />
                 {results.expectedPrice !== null && (
                    <div className="pt-2">
                        <Button variant="outline" className="w-full text-white" onClick={handleAddToWatchlist}>
                            <ListPlus className="mr-2" /> Add to Smart Watchlist
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

const PreferentialCalculator = ({ stock, userId }: { stock: Stock, userId: string }) => {
    const { toast } = useToast();
    const [inputs, setInputs] = useState({ date: format(new Date(), 'yyyy-MM-dd'), companyName: '', marketCap: '', sharePrice: '', fairPE: '', preferentialShares: '', preferentialPrice: '', capitalUtilization: '', assetTurnover: '', ttmSales: '', ttmNetProfit: '' });
    const [results, setResults] = useState<{
        capitalRaised: number | null;
        assetCreationAmount: number | null;
        additionalRevenue: number | null;
        oldRevenue: number | null;
        newRevenue: number | null;
        forwardProfit: number | null;
        forwardMarketCap: number | null;
        visibleMarketCap: number | null;
        hiddenMarketCap: number | null;
        currentMarketCap: number | null;
        upsidePotential: number | null;
        expectedPrice: number | null;
    }>({
        capitalRaised: null,
        assetCreationAmount: null,
        additionalRevenue: null,
        oldRevenue: null,
        newRevenue: null,
        forwardProfit: null,
        forwardMarketCap: null,
        visibleMarketCap: null,
        hiddenMarketCap: null,
        currentMarketCap: null,
        upsidePotential: null,
        expectedPrice: null,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputs({ ...inputs, [e.target.name]: e.target.value });
    };

    const calculate = () => {
        const mc = parseFloat(inputs.marketCap);
        const sp = parseFloat(inputs.sharePrice);
        const ps = parseFloat(inputs.preferentialShares);
        const pp = parseFloat(inputs.preferentialPrice);
        const cu = parseFloat(inputs.capitalUtilization);
        const at = parseFloat(inputs.assetTurnover);
        const fPE = parseFloat(inputs.fairPE);
        const ttmSales = parseFloat(inputs.ttmSales);
        const ttmProfit = parseFloat(inputs.ttmNetProfit);

        if (isNaN(mc) || isNaN(sp) || isNaN(ps) || isNaN(pp) || isNaN(cu) || isNaN(at) || isNaN(fPE) || sp === 0 || isNaN(ttmSales) || isNaN(ttmProfit)) return;
        
        const capitalRaised = (ps * pp) / 10000000; // in Cr
        const assetCreationAmount = capitalRaised * (cu / 100);
        const additionalRevenue = assetCreationAmount * at;
        const oldRevenue = ttmSales;
        const newRevenue = oldRevenue + additionalRevenue;
        
        const margin = ttmSales > 0 ? ttmProfit / ttmSales : 0;
        const forwardProfit = newRevenue * margin;
        const forwardMarketCap = forwardProfit * fPE;
        
        const currentMarketCap = mc;
        const visibleMarketCap = forwardMarketCap;
        const hiddenMarketCap = Math.max(0, forwardMarketCap - currentMarketCap);
        
        const upsidePotential = currentMarketCap > 0 ? (hiddenMarketCap / currentMarketCap) : 0;
        const expectedPrice = sp * (1 + upsidePotential);


        setResults({ 
            capitalRaised,
            assetCreationAmount,
            additionalRevenue,
            oldRevenue,
            newRevenue,
            forwardProfit,
            forwardMarketCap,
            visibleMarketCap,
            hiddenMarketCap,
            currentMarketCap,
            upsidePotential,
            expectedPrice,
        });
    };

    const handleAddToWatchlist = () => {
        if (!inputs.companyName) {
            toast({
                title: "Company Name Required",
                description: "Please enter a company name to add it to the watchlist.",
                variant: "destructive",
            });
            return;
        }
        if (!userId) return;
        
        const newStock: WatchlistStock = {
            id: Date.now().toString(),
            date: inputs.date,
            name: inputs.companyName,
            price: parseFloat(inputs.sharePrice) || 0,
            pe: parseFloat(inputs.fairPE) || 0
        };

        try {
            const existingWatchlist = localStorage.getItem(`smartWatchlist_${userId}`);
            const watchlist = existingWatchlist ? JSON.parse(existingWatchlist) : [];
            watchlist.push(newStock);
            localStorage.setItem(`smartWatchlist_${userId}`, JSON.stringify(watchlist));
            
            toast({
                title: "Added to Watchlist",
                description: `${inputs.companyName} has been added to your Smart Watchlist.`,
            });
            window.dispatchEvent(new Event('storage'));

        } catch (error) {
             toast({
                title: "Error",
                description: "Could not add stock to watchlist.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3 p-4 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                    <CalculatorInput label="Date" name="date" value={inputs.date} onChange={handleInputChange} />
                    <CalculatorInput label="Company Name" name="companyName" value={inputs.companyName} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CalculatorInput label="Market Cap (cr)" name="marketCap" value={inputs.marketCap} onChange={handleInputChange} />
                    <CalculatorInput label="Share Price" name="sharePrice" value={inputs.sharePrice} onChange={handleInputChange} />
                    <CalculatorInput label="Fair PE" name="fairPE" value={inputs.fairPE} onChange={handleInputChange} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CalculatorInput label="TTM Sales (cr)" name="ttmSales" value={inputs.ttmSales} onChange={handleInputChange} />
                    <CalculatorInput label="TTM Net Profit (cr)" name="ttmNetProfit" value={inputs.ttmNetProfit} onChange={handleInputChange} />
                    <CalculatorInput label="Fixed Asset Turnover" name="assetTurnover" value={inputs.assetTurnover} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <CalculatorInput label="Preferential no. of Shares / Warrants" name="preferentialShares" value={inputs.preferentialShares} onChange={handleInputChange} />
                    <CalculatorInput label="Preferential Price" name="preferentialPrice" value={inputs.preferentialPrice} onChange={handleInputChange} />
                    <CalculatorInput label="% Utiliz. of Cap. Creation of Rev. G. Asset" name="capitalUtilization" value={inputs.capitalUtilization} onChange={handleInputChange} />
                    <Button onClick={calculate} className="w-full h-9">Calculate</Button>
                </div>
            </div>
            <div className="space-y-2">
                <ResultField label="Preferential Amount Raised:" value={results.capitalRaised !== null ? `${results.capitalRaised.toFixed(2)}Cr` : '0Cr'} />
                <ResultField label="Part of The Preferential Amount That Will Be Used For Asset Creation:" value={results.assetCreationAmount !== null ? `${results.assetCreationAmount.toFixed(2)}Cr` : '0Cr'} />
                <ResultField label="Revenue That Will Be Generated From Increase In Asset:" value={results.additionalRevenue !== null ? `${results.additionalRevenue.toFixed(2)}Cr` : '0Cr'} />
                <ResultField label="Old Revenue:" value={results.oldRevenue !== null ? `${results.oldRevenue.toFixed(2)}Cr` : '0Cr'} />
                <ResultField label="New Revenue:" value={results.newRevenue !== null ? `${results.newRevenue.toFixed(2)}Cr` : '0Cr'} />
                <ResultField label="Expected 1 Year Forward Net Profit:" value={results.forwardProfit !== null ? `${results.forwardProfit.toFixed(2)}Cr` : '0Cr'} />
                <ResultField label="Expected 1 Year Forward Market Cap:" value={results.forwardMarketCap !== null ? `${results.forwardMarketCap.toFixed(2)}Cr` : '0Cr'} />
                <ResultField label="Visible Market Cap:" value={results.visibleMarketCap !== null ? `${results.visibleMarketCap.toFixed(2)}Cr` : '0Cr'} />
                <ResultField label="Hidden Market Cap:" value={results.hiddenMarketCap !== null ? `${results.hiddenMarketCap.toFixed(2)}Cr` : '0Cr'} />
                <ResultField label="Current Actual Market Cap:" value={results.currentMarketCap !== null ? `${results.currentMarketCap.toFixed(2)}Cr` : '0Cr'} />
                <ResultField label="Upside Potential:" value={results.upsidePotential !== null ? `${(results.upsidePotential * 100).toFixed(2)}%` : '0%'} />
                <ResultField label="Expected Price After 1 Year:" value={results.expectedPrice !== null ? `₹${results.expectedPrice.toFixed(2)}` : '₹0'} />
                 {results.expectedPrice !== null && (
                    <div className="pt-2">
                        <Button variant="outline" className="w-full text-white" onClick={handleAddToWatchlist}>
                            <ListPlus className="mr-2" /> Add to Smart Watchlist
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};


export function FinancialCalculatorsCard({ stock, userId }: { stock: Stock, userId: string }) {
    const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
    
    const handleExport = () => {
        // This is a placeholder. In a real app, you would generate a CSV or similar.
        alert("Export functionality is not implemented yet.");
    }

    return (
        <Card>
            <CardHeader>
                 <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                        <CardTitle className="flex items-center gap-2 font-headline text-base">
                            <Calculator className="text-primary" />
                            Financial Calculators
                        </CardTitle>
                        <CardDescription className="text-xs">Quick tools for fundamental analysis and valuation.</CardDescription>
                    </div>
                     <Button variant="outline" onClick={handleExport} className="text-white">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="uptrend">Uptrend</TabsTrigger>
                        <TabsTrigger value="large_order">Large Order</TabsTrigger>
                        <TabsTrigger value="capacity_expansion">Capacity Expansion</TabsTrigger>
                        <TabsTrigger value="preferential">Preferential</TabsTrigger>
                    </TabsList>
                    {activeTab && (
                        <div className="pt-4 animate-in fade-in-50">
                            <TabsContent value="uptrend" className="mt-0">
                                <UptrendCalculator stock={stock} userId={userId} />
                            </TabsContent>
                            <TabsContent value="large_order" className="mt-0">
                                <LargeOrderCalculator stock={stock} userId={userId} />
                            </TabsContent>
                            <TabsContent value="capacity_expansion" className="mt-0">
                                <CapacityExpansionCalculator stock={stock} userId={userId} />
                            </TabsContent>
                            <TabsContent value="preferential" className="mt-0">
                                <PreferentialCalculator stock={stock} userId={userId} />
                            </TabsContent>
                        </div>
                    )}
                </Tabs>
            </CardContent>
        </Card>
    );
}
