// Engine-package tests: disk cache + claude parser/runResearch back-compat + buildPrompt.
// (Extracted from opcodestockapp tests/unit.test.js — minus the yahoo-auth/fundamentals-fallback
// data-layer tests, which are not part of this package.)
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const cache = require('../cache');

test('cache: write then read returns data and freshness', () => {
  const key = 'unittest-' + process.pid;
  cache.write(key, { a: 1 });
  const hit = cache.read(key, 60000);
  assert.ok(hit, 'expected a cache hit');
  assert.deepStrictEqual(hit.data, { a: 1 });
  assert.strictEqual(hit.fresh, true);
  fs.unlinkSync(cache.fileFor(key));
});

test('cache: entries older than ttl are not fresh but still return data', () => {
  const key = 'unittest-stale-' + process.pid;
  fs.writeFileSync(cache.fileFor(key), JSON.stringify({ ts: Date.now() - 10000, data: { b: 2 } }));
  const stale = cache.read(key, 5000);
  assert.ok(stale);
  assert.strictEqual(stale.fresh, false);
  assert.deepStrictEqual(stale.data, { b: 2 });
  const fresh = cache.read(key, 60000);
  assert.strictEqual(fresh.fresh, true);
  fs.unlinkSync(cache.fileFor(key));
});

test('cache: missing key returns null', () => {
  assert.strictEqual(cache.read('definitely-not-a-key-' + Date.now(), 1000), null);
});

const { parseStreamJsonLine } = require('../ai-research');

test('parseStreamJsonLine: extracts text deltas, final result, ignores noise', () => {
  const lines = fs.readFileSync(path.join(__dirname, 'fixtures/claude-stream.jsonl'), 'utf8')
    .split('\n').filter(Boolean);
  const parsed = lines.map(parseStreamJsonLine);
  const deltas = parsed.filter(p => p && p.kind === 'delta').map(p => p.text);
  assert.deepStrictEqual(deltas, ['Hello', ' world']);
  const final = parsed.find(p => p && p.kind === 'final');
  assert.strictEqual(final.text, 'Hello world.');
  assert.strictEqual(parsed[0], null);
});

test('parseStreamJsonLine: flags rate limit and errors', () => {
  assert.strictEqual(
    parseStreamJsonLine('{"type":"rate_limit_event","rate_limit_info":{"status":"rejected","overageDisabledReason":"out_of_credits","resetsAt":1781934600}}').kind,
    'rate_limited');
  assert.strictEqual(
    parseStreamJsonLine('{"type":"result","is_error":true,"subtype":"error_max_turns"}').kind,
    'error');
  assert.strictEqual(parseStreamJsonLine('not json'), null);
});

const { buildPrompt } = require('../ai-research');

test('buildPrompt: includes symbol, US framing, and all 7 sections', () => {
  const p = buildPrompt('NVDA', { currentPrice: 170.2, sector: 'Technology' });
  assert.match(p, /NVDA/);
  assert.match(p, /US|United States/i);
  for (const s of ['News', 'Earnings', 'Analyst', 'Bull', 'Bear', 'Risk', 'Verdict']) {
    assert.match(p, new RegExp(s, 'i'));
  }
  assert.match(p, /170\.2/);
});

test('buildPrompt: omits context line cleanly when none given', () => {
  const p = buildPrompt('AAPL');
  assert.match(p, /AAPL/);
  assert.doesNotMatch(p, /undefined|null|NaN/);
});

const { runResearch } = require('../ai-research');
const { EventEmitter } = require('events');
const { Readable } = require('stream');

function fakeSpawnFromFixture() {
  const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/claude-stream.jsonl'), 'utf8');
  return () => {
    const proc = new EventEmitter();
    proc.stdout = Readable.from([fixture]);
    proc.stderr = Readable.from([]);
    proc.kill = () => {};
    setImmediate(() => proc.emit('close', 0));
    return proc;
  };
}

test('runResearch: streams deltas and resolves with final text', async () => {
  const got = [];
  const res = await runResearch('NVDA', {}, d => got.push(d), { _spawn: fakeSpawnFromFixture() });
  assert.deepStrictEqual(got, ['Hello', ' world']);
  assert.strictEqual(res.text, 'Hello world.');
});

test('runResearch: maps spawn ENOENT to cli_missing', async () => {
  const fake = () => { const p = new EventEmitter(); p.stdout = Readable.from([]); p.stderr = Readable.from([]); p.kill = () => {};
    setImmediate(() => p.emit('error', Object.assign(new Error('nope'), { code: 'ENOENT' }))); return p; };
  await assert.rejects(runResearch('NVDA', {}, () => {}, { _spawn: fake }),
    err => err.code === 'cli_missing');
});

test('runResearch: blocks skill/agent/workflow hijack and enables only web tools', async () => {
  let capturedArgs = null;
  const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/claude-stream.jsonl'), 'utf8');
  const fake = (_cmd, args) => {
    capturedArgs = args;
    const p = new EventEmitter();
    p.stdout = Readable.from([fixture]); p.stderr = Readable.from([]); p.kill = () => {};
    setImmediate(() => p.emit('close', 0));
    return p;
  };
  await runResearch('NVDA', {}, () => {}, { _spawn: fake });
  assert.ok(capturedArgs.indexOf('--disallowedTools') >= 0, 'must pass --disallowedTools');
  for (const t of ['Skill', 'Task', 'Workflow']) assert.ok(capturedArgs.includes(t), `must disallow ${t}`);
  assert.ok(capturedArgs.indexOf('--allowedTools') >= 0 && capturedArgs.includes('WebSearch'), 'must allow WebSearch');
  assert.ok(capturedArgs.includes('--append-system-prompt'), 'must steer inline answering');
});
