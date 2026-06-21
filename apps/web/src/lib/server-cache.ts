// Tiny in-memory TTL cache for server-side data fetches (Yahoo fundamentals, quotes).
// yahoo-finance2 calls don't go through Next's fetch cache, so without this every render
// re-hits Yahoo. The Map lives at module scope, so it persists across requests within a
// server process — good enough for short-lived market data; it resets on redeploy.

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now) return hit.value;

  const value = await fn();
  // Don't cache empty/failed results (null) — let the next call retry.
  if (value !== null && value !== undefined) {
    store.set(key, { value, expires: now + ttlMs });
  }
  return value;
}

export function cacheClear(): void {
  store.clear();
}
