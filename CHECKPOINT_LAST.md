# Checkpoint — 2026-06-21

## Completed this session (all pushed to AryaVora621/SmartInvest `main`)

1. **De-Indianization** (`b667691`) — removed every BSE/NSE artifact; US markets throughout.
2. **US fundamentals** (`2190b95`) — `src/lib/fundamentals.ts` `getUsFundamentals()`:
   Yahoo (keyless) fills the 32-field stats grid + growth + P&L + pros/cons/SWOT + ownership;
   Alpha Vantage (if `ALPHA_VANTAGE_API_KEY` set) adds full income/balance/cash-flow statements.
3. **Peers + ratios** (`52e8fb0`) — real same-sector peers (from US_STOCKS) + a live key-ratios
   column. No card shows fabricated numbers now.
4. **Alerts — Slice 2** (`b6781a9`) — `src/actions/alert-actions.ts` `evaluateAlerts()` fires
   price-action/52-week rules off one batched Yahoo quote; `/api/send-telegram` mirrors
   `/api/send-email`; watchlist "Check Now" button evaluates + dispatches + records real triggers.
5. **Theme — Slice 4 (partial)** (`fd7fe81`) — dependency-free dark-mode toggle (defaults to
   light, no-flash) + header wordmark normalized.

## Verified
- `npm run build -w web` green after every change.
- Fundamentals/peers/alerts exercised live via temporary routes (AAPL, JPM, 12-name sweep).
- Evaluator fix: `quote()`'s `validateResult` must be the 3rd arg, not the 2nd.

## Known gaps / needs human
- **Live UI render not visually verified** — this environment's browser tier is read-only and
  no Playwright MCP is connected; checks were code-trace + SSR-curl. Open the app and click
  through the research + portfolio tabs + the dark-mode toggle to confirm visuals.
- **Dark mode** palette is real but header text is hardcoded white; needs a visual polish pass.
- **Balance sheet / cash flow** tables are empty without an Alpha Vantage key (Yahoo can't supply).
- **Peer breadth** is bounded by the 12-name US_STOCKS universe (2-3 per sector).

## Next candidates
- Slice 3: Yahoo proxy/cache + FMP fundamentals fallback.
- Telegram config UI (currently `telegram_config` must be set in localStorage by hand).
- Slice 5: Telegram bot as `apps/bot`.
