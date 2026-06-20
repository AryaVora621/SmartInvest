

'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wand2, PlusCircle, Bot, Loader2 } from "lucide-react";
import type { Stock } from '@/types';
import { getStockAnalysis } from '@/actions/stock-actions';

const initialPrompts = [
    { name: 'Long-Term Investment', content: 'Analyze for long-term investment (5+ years). Focus on fundamentals, moat, and management quality.' },
    { name: 'Swing Trading Opportunity', content: 'Analyze for a swing trade (1-3 months). Focus on technical indicators, recent news, and short-term catalysts.' }
];

const initialLlms: { name: string }[] = [];

export function AnalysisCard({ stock, userId }: { stock: Stock, userId: string }) {
    const [prompts, setPrompts] = useState<{name: string, content: string}[]>([]);
    const [llms, setLlms] = useState<{name: string, apiKey?: string}[]>([]);

    const [selectedPrompt, setSelectedPrompt] = useState<string>('');
    const [selectedLlm, setSelectedLlm] = useState<string>('');

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{ recommendation: string; reasoning: string } | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        if (!userId) return;
        try {
            const savedPrompts = localStorage.getItem(`customPrompts_${userId}`);
            const parsedPrompts = savedPrompts ? JSON.parse(savedPrompts) : initialPrompts;
            setPrompts(parsedPrompts);
            if (parsedPrompts.length > 0) setSelectedPrompt(parsedPrompts[0].content);

            const savedLlms = localStorage.getItem(`customLlms_${userId}`);
            const parsedLlms = savedLlms ? JSON.parse(savedLlms) : initialLlms;
            setLlms(parsedLlms);
            if (parsedLlms.length > 0) setSelectedLlm(parsedLlms[0].name);
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
            setPrompts(initialPrompts);
            setLlms(initialLlms);
        }
    }, [userId]);

    const handleSetPrompts = useCallback((newPrompts: {name: string, content: string}[]) => {
        if (!userId) return;
        setPrompts(newPrompts);
        try {
            localStorage.setItem(`customPrompts_${userId}`, JSON.stringify(newPrompts));
        } catch (error) {
            console.error("Failed to save prompts", error);
        }
    }, [userId]);
    
    const handleSetLlms = useCallback((newLlms: {name: string, apiKey?: string}[]) => {
        if (!userId) return;
        setLlms(newLlms);
        try {
            localStorage.setItem(`customLlms_${userId}`, JSON.stringify(newLlms));
        } catch (error) {
            console.error("Failed to save LLMs", error);
        }
    }, [userId]);

    const handleAnalyzeClick = async () => {
        if (!selectedLlm || !selectedPrompt || !stock) {
            toast({ title: "Error", description: "Please select both a prompt and an LLM before analyzing.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);
        const result = await getStockAnalysis(stock, selectedPrompt, selectedLlm);
        setIsLoading(false);
        if (result.success && result.analysis) {
            setAnalysisResult(result.analysis);
            toast({ title: "Analysis Complete", description: `AI analysis for ${stock.name} is ready.` });
        } else {
            toast({ title: "Analysis Failed", description: result.error, variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-baseline gap-2">
                    <CardTitle className="flex items-center gap-2 font-headline text-base">
                        <Wand2 className="text-primary" />
                        AI-Powered Analysis
                    </CardTitle>
                    <CardDescription className="text-xs">Analyze {stock.name} using custom prompts and AI models.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                             <Label>Select Prompt</Label>
                            <Select onValueChange={setSelectedPrompt} value={selectedPrompt}>
                                <SelectTrigger className="text-white"><SelectValue placeholder="Select a prompt" /></SelectTrigger>
                                <SelectContent>
                                    {prompts.map(p => <SelectItem key={p.name} value={p.content}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <AddPromptDialog onAddPrompt={handleSetPrompts} currentPrompts={prompts} />
                    </div>
                    <div className="flex gap-4 items-end">
                         <div className="flex-1 space-y-2">
                            <Label>Select LLM</Label>
                            <Select onValueChange={setSelectedLlm} value={selectedLlm}>
                                <SelectTrigger className="text-white"><SelectValue placeholder="Select an LLM" /></SelectTrigger>
                                <SelectContent>
                                    {llms.map(l => <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <AddLlmDialog onAddLlm={handleSetLlms} currentLlms={llms} />
                    </div>
                    <Button onClick={handleAnalyzeClick} disabled={isLoading || !selectedPrompt || !selectedLlm} className="w-full">
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2" />}
                        Analyze Stock
                    </Button>
                </div>

                
                {isLoading && (
                    <div className="mt-4 text-center text-muted-foreground text-sm">
                        <Loader2 className="animate-spin inline-block mb-2" />
                        <p>AI is analyzing... Please wait.</p>
                    </div>
                )}

                {analysisResult && (
                    <div className="mt-6 space-y-4 animate-in fade-in duration-500">
                        <h4 className="font-bold text-sm">Analysis Result</h4>
                        <Card className="bg-secondary/50">
                            <CardHeader>
                                <CardTitle className="text-xs">Recommendation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="font-semibold text-primary text-sm">{analysisResult.recommendation}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card">
                            <CardHeader>
                                <CardTitle className="text-xs">Deep Dive Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs leading-relaxed whitespace-pre-wrap font-mono">
                                    {analysisResult.reasoning}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

            </CardContent>
        </Card>
    );
}


function AddPromptDialog({ onAddPrompt, currentPrompts }: { onAddPrompt: (prompts: {name: string, content: string}[]) => void, currentPrompts: {name: string, content: string}[] }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const { toast } = useToast();

    const handleSave = () => {
        if (!name || !content) {
            toast({ title: "Error", description: "Please provide a name and content for the prompt.", variant: "destructive" });
            return;
        }
        onAddPrompt([...currentPrompts, { name, content }]);
        toast({ title: "Success", description: "New prompt added." });
        setName('');
        setContent('');
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon"><PlusCircle size={16} className="text-white" /></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle className="text-base">Add New Prompt</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <Input placeholder="Prompt Name (e.g., Value Investing Check)" value={name} onChange={e => setName(e.target.value)} />
                    <Textarea placeholder="Prompt content..." rows={8} value={content} onChange={e => setContent(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Prompt</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddLlmDialog({ onAddLlm, currentLlms }: { onAddLlm: (llms: {name: string, apiKey?: string}[]) => void, currentLlms: {name: string, apiKey?: string}[] }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const { toast } = useToast();

    const handleSave = () => {
        if (!name) {
            toast({ title: "Error", description: "Please provide a name for the LLM.", variant: "destructive" });
            return;
        }
        onAddLlm([...currentLlms, { name, apiKey }]);
        toast({ title: "Success", description: `LLM '${name}' added.` });
        setName('');
        setApiKey('');
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon"><PlusCircle size={16} className="text-white" /></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle className="text-base">Add New LLM</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <Input placeholder="LLM Name (e.g., Llama 3)" value={name} onChange={e => setName(e.target.value)} />
                    <Input placeholder="API Key (optional)" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save LLM</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
