# Checkpoint — 2026-06-21 — ALL PHASES COMPLETE

Monorepo: `apps/web` (Next.js app) + `apps/bot` (Telegram bot) + `packages/ai-engine`.
All pushed to `github.com/AryaVora621/SmartInvest` `main`.

## Phases shipped
1. **De-Indianization** (`b667691`) — US markets throughout, every BSE/NSE artifact removed.
2. **US fundamentals** (`2190b95`) — `src/lib/fundamentals.ts`: Yahoo (keyless) + Alpha Vantage.
3. **Peers + ratios** (`52e8fb0`) — real same-sector peers + key-ratios; no mock numbers left.
4. **Alerts — Slice 2** (`b6781a9`) — `evaluateAlerts()` + `/api/send-telegram` + "Check Now".
5. **Dark mode — Slice 4** (`fd7fe81`) — dependency-free toggle (defaults to light).
6. **Alert delivery settings** (`a947a0e`) — email + Telegram config UI with test buttons.
7. **Slice 3** (`ee63f8f`) — server-side cache (1330ms→0ms) + FMP fundamentals fallback.
8. **Slice 5 — Telegram bot** (`a9f4d07`) — `apps/bot`, zero-dep, long-poll; on-demand
   (/research /watchlist /alerts /add /remove) + hourly movers + daily AI digest.

## Verified
- `npm run build -w web` green after every change.
- Fundamentals/peers/alerts/cache exercised live via temp routes.
- Bot: Yahoo quotes/indices/movers/alerts/store/format/.env-loader/no-token guard verified.

## Not verified live in-session (need real keys / CLI / human eyes)
- Web UI pixel render (env browser is read-tier; no Playwright) — please click through.
- Dark-mode visual polish (header text hardcoded white).
- FMP fundamentals (no `FMP_API_KEY`), Telegram I/O + `/research` (no token + `claude` CLI on a host).
- Balance-sheet/cash-flow tables stay empty without an Alpha Vantage *or* FMP key.

## To run the bot
`cp apps/bot/.env.example apps/bot/.env` → set `TELEGRAM_BOT_TOKEN` → `npm start -w @smartinvest/bot`
(needs the `claude` CLI on the host for `/research` + the daily digest). See `apps/bot/README.md`.
