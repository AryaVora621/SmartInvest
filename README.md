# SmartInvest

Monorepo: a Next.js stock-research app with a shared, multi-provider AI research engine.

```
apps/web              Next.js 16 app (research, portfolio, ledger, cashbook, deposits)
packages/ai-engine    multi-provider AI research engine (claude/codex/agy CLIs + OpenAI-compatible API)
```

The engine is shared: `apps/web` uses it now; a Telegram bot (`apps/bot`) will reuse it later.

## Quickstart

```bash
npm install
npm run dev          # web on http://localhost:9002
npm test             # engine unit tests
```

## AI Research

The Research tab's **AI Research** card streams a live, web-searched, cited report for a stock via
`GET /api/ai-research` (SSE). The **AI Providers** card (server-side keys) configures providers.

### Providers and where they run

The engine tries providers free-local-first and falls back to a paid API key:

| Provider | How it runs | Works when |
| --- | --- | --- |
| `claude` / `codex` / `agy` | local CLI (your subscription) | **self-hosted** only (the CLI must be installed + logged in on the host) |
| `api` | OpenAI-compatible HTTP (OpenRouter / OpenAI / Perplexity) | anywhere, if an API key is set (must use a web-search model, e.g. `:online` or `sonar`) |

- **Self-hosted** (`next start` on your machine / VPS): full free-local-first cascade.
- **Cloud** (Firebase / Vercel): local CLIs are unavailable, so set an `api` key. The AI Providers
  card shows which providers are available on the current host.

## Secrets

Provider API keys are stored **server-side only** in `apps/web/.secrets.json` (gitignored), written
via `POST /api/settings`. They are never returned to the browser (`GET /api/settings` returns
booleans). The store path is `SECRETS_PATH` (set in `apps/web/.env`, defaults to `./.secrets.json`).
`FMP_API_KEY` is still honored from the environment.
