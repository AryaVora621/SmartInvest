// Integration tests for the AI routes. Boots `next dev` once with the fake engine seam and an
// isolated secret store, then exercises /api/settings and /api/ai-research.
// Slow (boots Next). Run explicitly: `node --test apps/web/tests/routes.test.mjs` from repo root.
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const PORT = 9400 + (process.pid % 80);
const BASE = `http://localhost:${PORT}`;
const SECRETS = path.join(os.tmpdir(), `si-routes-secrets-${process.pid}.json`);
let srv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  srv = spawn('npm', ['run', 'dev', '-w', 'web', '--', '-p', String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, SECRETS_PATH: SECRETS, AI_RESEARCH_FAKE: '1' },
    stdio: 'ignore',
    detached: true, // own process group so we can kill the whole tree (npm -> next -> next-server)
  });
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${BASE}/api/settings`)).ok) return; } catch {}
    await sleep(500);
  }
  throw new Error('web dev server did not start');
});

after(() => { if (srv?.pid) { try { process.kill(-srv.pid, 'SIGKILL'); } catch {} } });

test('GET /api/settings returns booleans + providers and never a key', async () => {
  const r = await fetch(`${BASE}/api/settings`);
  const body = await r.text();
  assert.strictEqual(r.status, 200);
  const j = JSON.parse(body);
  assert.ok(Array.isArray(j.providers));
  assert.strictEqual(typeof j.configured.api, 'boolean');
  assert.ok(!body.includes('sk-'), 'must not echo any key');
});

test('POST /api/settings stores a key without leaking it', async () => {
  const r = await fetch(`${BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: 'sk-TEST-123', apiBaseUrl: 'https://openrouter.ai/api/v1', apiModel: 'openai/gpt-4o:online' }),
  });
  const body = await r.text();
  assert.strictEqual(r.status, 200);
  assert.ok(!body.includes('sk-TEST-123'), 'POST response must not echo the key');
  assert.strictEqual(JSON.parse(body).configured.api, true);
});

test('POST /api/settings rejects a bad base URL', async () => {
  const r = await fetch(`${BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiBaseUrl: 'ftp://nope' }),
  });
  assert.strictEqual(r.status, 400);
});

test('GET /api/ai-research rejects an invalid symbol', async () => {
  assert.strictEqual((await fetch(`${BASE}/api/ai-research?symbol=@@`)).status, 400);
});

test('GET /api/ai-research rejects an unknown provider', async () => {
  assert.strictEqual((await fetch(`${BASE}/api/ai-research?symbol=NVDA&provider=ghost`)).status, 400);
});

test('GET /api/ai-research streams SSE ending in done (fake engine)', async () => {
  const res = await fetch(`${BASE}/api/ai-research?symbol=NVDA`);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/event-stream/);
  const body = await res.text();
  assert.match(body, /data: /);
  assert.match(body, /event: done/);
});
