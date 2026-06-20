import { runResearch } from '@smartinvest/ai-engine';
import cache from '@smartinvest/ai-engine/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KNOWN = ['claude', 'codex', 'agy', 'api'];

// Map a typed engine error to a short, user-facing line.
function friendlyError(err: any): string {
  switch (err?.code) {
    case 'cli_missing':
      return 'That AI CLI is not installed on this host.';
    case 'not_authenticated':
      return 'AI provider not logged in / API key invalid.';
    case 'timeout':
      return 'Research timed out. Try again or narrow the request.';
    case 'rate_limited':
    case 'all_providers_exhausted':
      return err.message;
    case 'busy':
      return 'Another research run is in progress. Try again shortly.';
    default:
      return 'AI research failed. See server log for details.';
  }
}

const num = (v: string | null) => {
  const n = parseFloat(v ?? '');
  return Number.isFinite(n) ? n : undefined;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
  if (!/^[A-Z.]{1,16}$/.test(symbol)) {
    return Response.json({ error: 'invalid symbol' }, { status: 400 });
  }
  const provider = url.searchParams.get('provider') || undefined;
  if (provider && !KNOWN.includes(provider)) {
    return Response.json({ error: 'unknown provider' }, { status: 400 });
  }

  const fresh = url.searchParams.get('fresh') === '1';
  const model = url.searchParams.get('model') || undefined;
  const instruction = url.searchParams.get('instruction') || undefined;
  const cacheKey = `airesearch-v2-${provider || 'auto'}-${symbol}`;
  const context: any = {
    name: url.searchParams.get('name') || undefined,
    currentPrice: num(url.searchParams.get('price')),
    pe: num(url.searchParams.get('pe')),
    sector: url.searchParams.get('sector') || undefined,
    marketCap: num(url.searchParams.get('mcap')),
    instruction,
  };

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: any, event?: string) => {
        if (event) controller.enqueue(enc.encode(`event: ${event}\n`));
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      if (process.env.AI_RESEARCH_FAKE === '1') {
        send({ delta: 'Fake research for ' + symbol });
        send({ cached: false, durationMs: 1, provider: 'fake' }, 'done');
        controller.close();
        return;
      }

      if (!fresh) {
        const hit = cache.read(cacheKey, 60 * 60 * 1000);
        if (hit && hit.fresh && hit.data) {
          send({ cached: true });
          send({ delta: hit.data });
          send({ cached: true, durationMs: 0 }, 'done');
          controller.close();
          return;
        }
      }

      runResearch(symbol, context, (delta: string) => send({ delta }), { model, provider })
        .then(({ text, durationMs, provider: used }: any) => {
          cache.write(cacheKey, text);
          send({ cached: false, durationMs, provider: used }, 'done');
          controller.close();
        })
        .catch((err: any) => {
          console.error('ai-research error:', err.code, err.message);
          send({ code: err.code || 'error', message: friendlyError(err) }, 'error');
          controller.close();
        });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
