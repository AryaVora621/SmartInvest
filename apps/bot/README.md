# SmartInvest Telegram Bot

A self-hosted US-market Telegram bot: on-demand AI research, hourly market + watchlist
movers, and a daily AI research digest. Zero npm dependencies beyond the shared
`@smartinvest/ai-engine` workspace — it talks to Telegram and Yahoo over `fetch`.

## What it does

**On demand**
- `/add <SYM>` / `/remove <SYM>` — manage this chat's watchlist (persisted to `data/watchlist.json`)
- `/watchlist` — price + day move for every symbol, sorted by move
- `/alerts` — which default rules fire now (near 52-week high, 15% below high, ±5% day move)
- `/research <SYM>` — a web-searched AI report via the engine (`/research AAPL sonnet` for a deeper run)
- `/help` — command list

**Scheduled** (broadcast to every chat with a watchlist)
- **Hourly** — US index snapshot (S&P 500 / Dow / Nasdaq) + watchlist movers (no AI tokens)
- **Daily** — an AI research digest per watchlist stock, at `DAILY_HOUR` local time

## Requirements

- Node 18+ (for global `fetch`).
- The `claude` CLI installed and signed in on the host — `/research` and the daily digest
  run on your Claude **subscription** via the engine's `runResearch`.

## Setup

```bash
# from the monorepo root
npm install                      # links @smartinvest/ai-engine into the bot
cp apps/bot/.env.example apps/bot/.env
# edit apps/bot/.env and set TELEGRAM_BOT_TOKEN (from @BotFather)
```

## Run

```bash
npm start -w @smartinvest/bot
```

The bot reads `apps/bot/.env` automatically (a tiny built-in loader — no `dotenv`
dependency); real environment variables override it. Keep it alive on a VPS/desktop with
`pm2`, `systemd`, `nohup`, or `screen`.

## Configuration

| Env | Default | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | — (required) | Bot token from @BotFather |
| `RESEARCH_MODEL` | `haiku` | Default model for `/research` + daily digest |
| `DAILY_HOUR` | `8` | Local hour (0-23) for the daily digest |
| `BOT_DATA_DIR` | `apps/bot/data` | Where the watchlist JSON is stored |
| `POLL_TIMEOUT` | `30` | Telegram long-poll timeout (seconds) |

## Notes

- The bot uses Telegram **long-polling**, so it needs no public URL or webhook.
- The bot's watchlist and alert rules are independent of the web app (the web app's are
  stored per-user in the browser and aren't reachable server-side).
