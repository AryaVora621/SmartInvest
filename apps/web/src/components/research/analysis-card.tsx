'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wand2, PlusCircle, Bot, Loader2, Sparkles } from "lucide-react";
import type { Stock } from '@/types';
import { getStockAnalysis } from '@/actions/stock-actions';
import { renderAiMarkdown } from '@/lib/ai-markdown';

const initialPrompts = [
  { name: 'Long-Term Investment', content: 'Analyze for long-term investment (5+ years). Focus on fundamentals, moat, and management quality.' },
  { name: 'Swing Trading Opportunity', content: 'Analyze for a swing trade (1-3 months). Focus on technical indicators, recent news, and short-term catalysts.' },
];

type ProviderInfo = { id: string; label: string; available: boolean; webCapable: boolean };

export function AnalysisCard({ stock, userId }: { stock: Stock, userId: string }) {
  const [prompts, setPrompts] = useState<{ name: string, content: string }[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState<string>('auto'); // 'auto' = engine cascade

  const [streaming, setStreaming] = useState(false);
  const [report, setReport] = useState<string>('');
  const [meta, setMeta] = useState<string>('');
  const [snapLoading, setSnapLoading] = useState(false);
  const [snap, setSnap] = useState<{ recommendation: string; reasoning: string } | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      try {
        const saved = localStorage.getItem(`customPrompts_${userId}`);
        const parsed = saved ? JSON.parse(saved) : initialPrompts;
        setPrompts(parsed);
        if (parsed.length > 0) setSelectedPrompt(parsed[0].content);
      } catch {
        setPrompts(initialPrompts);
        if (initialPrompts.length > 0) setSelectedPrompt(initialPrompts[0].content);
      }
    }
    fetch('/api/settings').then(r => r.json()).then(d => setProviders(d.providers || [])).catch(() => {});
    return () => { esRef.current?.close(); };
  }, [userId]);

  const handleSetPrompts = useCallback((newPrompts: { name: string, content: string }[]) => {
    if (!userId) return;
    setPrompts(newPrompts);
    try { localStorage.setItem(`customPrompts_${userId}`, JSON.stringify(newPrompts)); } catch {}
  }, [userId]);

  const startResearch = (fresh = false) => {
    if (!stock?.symbol) return;
    esRef.current?.close();
    setStreaming(true); setReport(''); setMeta('Researching…');
    const t0 = Date.now();
    let raw = '';
    const p = new URLSearchParams({ symbol: stock.symbol });
    if (provider && provider !== 'auto') p.set('provider', provider);
    if (fresh) p.set('fresh', '1');
    if (selectedPrompt) p.set('instruction', selectedPrompt);
    if (stock.name) p.set('name', stock.name);
    if (stock.sector) p.set('sector', stock.sector);
    const es = new EventSource(`/api/ai-research?${p.toString()}`);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.cached) setMeta('Cached');
        if (typeof m.delta === 'string') { raw += m.delta; setReport(raw); }
      } catch {}
    };
    es.addEventListener('done', (e: MessageEvent) => {
      es.close(); esRef.current = null; setStreaming(false);
      let info: any = {};
      try { info = JSON.parse(e.data); } catch {}
      setMeta(info.cached ? 'Cached' : `Done in ${Math.round((Date.now() - t0) / 1000)}s${info.provider ? ` · ${info.provider}` : ''}`);
    });
    es.addEventListener('error', (e: MessageEvent) => {
      es.close(); esRef.current = null; setStreaming(false);
      let info: any = {};
      try { info = JSON.parse((e as any).data); } catch {}
      setMeta('Error');
      setReport(`<p class="text-destructive">⚠️ ${info.message || 'AI research failed.'}</p>`);
    });
  };

  const handleQuickSnapshot = async () => {
    if (!stock) return;
    setSnapLoading(true); setSnap(null);
    const result = await getStockAnalysis(stock, selectedPrompt, 'heuristic');
    setSnapLoading(false);
    if (result.success && result.analysis) setSnap(result.analysis);
    else toast({ title: "Snapshot failed", description: result.error, variant: 'destructive' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline gap-2">
          <CardTitle className="flex items-center gap-2 font-headline text-base">
            <Wand2 className="text-primary" /> AI Research
          </CardTitle>
          <CardDescription className="text-xs">Live, web-searched, cited research for {stock.name}.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Focus</Label>
              <Select onValueChange={setSelectedPrompt} value={selectedPrompt}>
                <SelectTrigger><SelectValue placeholder="Select a focus" /></SelectTrigger>
                <SelectContent>
                  {prompts.map(p => <SelectItem key={p.name} value={p.content}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <AddPromptDialog onAddPrompt={handleSetPrompts} currentPrompts={prompts} />
          </div>
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select onValueChange={setProvider} value={provider}>
              <SelectTrigger><SelectValue placeholder="Auto (cascade)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (cascade)</SelectItem>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.id} disabled={!p.available}>
                    {p.label}{!p.available ? ' — unavailable here' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => startResearch(false)} disabled={streaming} className="flex-1">
              {streaming ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2" />} AI Research
            </Button>
            <Button variant="outline" onClick={handleQuickSnapshot} disabled={snapLoading}>
              {snapLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" size={16} />} Quick snapshot
            </Button>
          </div>
        </div>

        {(streaming || report) && (
          <div className="mt-6 space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm">Report</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{meta}</span>
                {!streaming && report && <Button size="sm" variant="ghost" onClick={() => startResearch(true)}>Re-run</Button>}
              </div>
            </div>
            <Card className="bg-card">
              <CardContent className="pt-4">
                <div className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: renderAiMarkdown(report) }} />
              </CardContent>
            </Card>
          </div>
        )}

        {snap && (
          <div className="mt-6 space-y-2">
            <h4 className="font-bold text-sm">Quick snapshot</h4>
            <Card className="bg-secondary/50">
              <CardContent className="pt-4">
                <p className="font-semibold text-primary text-sm">{snap.recommendation}</p>
                <div className="text-xs leading-relaxed whitespace-pre-wrap font-mono mt-2">{snap.reasoning}</div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddPromptDialog({ onAddPrompt, currentPrompts }: { onAddPrompt: (prompts: { name: string, content: string }[]) => void, currentPrompts: { name: string, content: string }[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const { toast } = useToast();

  const handleSave = () => {
    if (!name || !content) { toast({ title: "Error", description: "Provide a name and content.", variant: "destructive" }); return; }
    onAddPrompt([...currentPrompts, { name, content }]);
    toast({ title: "Success", description: "New focus added." });
    setName(''); setContent(''); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="icon"><PlusCircle size={16} /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="text-base">Add focus</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <Input placeholder="Name (e.g., Value Investing Check)" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Focus instruction…" rows={6} value={content} onChange={e => setContent(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
