'use client';
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2 } from "lucide-react";

type View = {
  apiBaseUrl: string; apiModel: string;
  configured: { api: boolean; fmp: boolean };
  providers: { id: string; label: string; available: boolean; webCapable: boolean }[];
};

export function AiProvidersCard() {
  const [view, setView] = useState<View | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiModel, setApiModel] = useState('');
  const [fmpKey, setFmpKey] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => fetch('/api/settings').then(r => r.json()).then((d: View) => {
    setView(d); setApiBaseUrl(d.apiBaseUrl || ''); setApiModel(d.apiModel || '');
  }).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const patch: any = { apiBaseUrl, apiModel };
    if (apiKey) patch.apiKey = apiKey;   // only send a key when non-empty (blank ≠ wipe)
    if (fmpKey) patch.fmpKey = fmpKey;
    const r = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    setSaving(false);
    if (r.ok) {
      setApiKey(''); setFmpKey(''); await load();
      toast({ title: 'Saved', description: 'Provider settings updated.' });
    } else {
      toast({ title: 'Save failed', description: (await r.json()).error, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-base"><KeyRound className="text-primary" size={18} /> AI Providers</CardTitle>
        <CardDescription className="text-xs">Keys are stored on the server and never returned to the browser. Local CLIs (claude/codex/agy) work only when self-hosted.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {view?.providers.map(p => (
            <Badge key={p.id} variant={p.available ? 'default' : 'secondary'}>
              {p.label}: {p.available ? 'available' : 'unavailable'}{p.webCapable ? '' : ' (no web)'}
            </Badge>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">API key {view?.configured.api ? '✓ configured' : ''}</Label>
            <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={view?.configured.api ? '•••• (leave blank to keep)' : 'sk-… / pplx-…'} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">API base URL</Label>
            <Input value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)} placeholder="https://openrouter.ai/api/v1" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">API model (use a web mode: :online / sonar)</Label>
            <Input value={apiModel} onChange={e => setApiModel(e.target.value)} placeholder="openai/gpt-4o:online" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">FMP key {view?.configured.fmp ? '✓ configured' : ''}</Label>
            <Input type="password" value={fmpKey} onChange={e => setFmpKey(e.target.value)} placeholder={view?.configured.fmp ? '•••• (leave blank to keep)' : 'FMP data key'} />
          </div>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin mr-2" /> : null} Save providers</Button>
      </CardContent>
    </Card>
  );
}
