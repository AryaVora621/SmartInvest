# Indian Stock Research App — App Ready

## Overview
Multi-tab Indian stock research and portfolio management app built with Next.js 16. All data stored in localStorage per user ID. No backend database required.

## Tech Stack
- **Framework:** Next.js 16.2.9 (Turbopack)
- **Language:** TypeScript
- **UI:** shadcn/ui (React)
- **Styling:** Tailwind CSS
- **Live Prices:** Yahoo Finance API (via proxy routes)
- **Company Data:** Screener.in scraping (Consolidated)
- **NSE Bulk/Block Deals:** NSE India JSON API (via server proxy `/api/nse-bulk-deals`)
- **Email:** Nodemailer + Gmail SMTP (via `/api/send-email`)
- **Stock Symbols:** BSE (`.BO` suffix), NSE (`.NS` suffix)

## Features

### 1. Research Tab
- **World Market Overview:** Live 9 indices/commodities (BSE, NASDAQ, FTSE, Nikkei, Shanghai, Nifty, NYSE, Crude Oil, Gold) + USD/INR from Yahoo Finance via `/api/yahoo-quote` proxy. Refreshes every 60s. BSE/NIFTY show ₹, others show $.
- **Screener:** Predefined screening criteria with results filtering. Hide/show toggle (icon button, collapses entire card body).
- **Stock Finder:** Local stock list with screener-based filtering. Toggle between AI/Local mode (AI shows "not available").
- **Company Data:** Quarterly Results, P&L, Balance Sheet, Cash Flows, Ratios, Shareholding Pattern from Screener.in (Consolidated only). Peer Comparison limited to 9 companies. All tables display newest-to-oldest (left-to-right).
  - **Sales & Net Profit rows:** Latest 3 values highlighted green (increasing) or red (decreasing) compared to prior period.
  - **Cash Flows — 5 metrics:** Latest value green (positive) or red (negative) — Cash from Operating Activity, Investing Activity, Financing Activity, Net Cash Flow, Free Cash Flow.
  - **Cash Flows — CFO/OP row:** Latest column green background (>80%) or red background (≤80%).
  - "Data loaded for X" toast only shown on explicit Fetch click, not on tab open.
- **Stock Analysis:** Data-driven deep-dive — computes price snapshot, valuation, momentum, risk assessment, and scored investment recommendation (short-term hold, swing trade, avoid). No LLM/AI.
- **Technical Analysis:** TradingView advanced chart widget with range selector buttons (1D, 5D, 1M, 3M, 6M, 1Y, 3Y, 5Y).
- **Watchlist:** Smart watchlist with context-menu add and alerts.
- **Financial Calculators:** SIP, Lumpsum, SWP, EMI calculators.

### 2. Portfolio Tab
- **My Holdings:** Stocks with quantity > 0. Columns: Stock, Symbol, Quantity, Price, Invested Value, Current Price (live via `/api/yahoo-price`), Current Value, P&L, % Change, Actions. Refresh Live Prices button.
- **Trade History:** All buy/sell transactions. Columns: Stock, Symbol, Date, Transaction, Qty, Price, Amount, Ind. PE, P/E, Inv.%, Target, Actions (Edit/Delete). CSV export.
- **Add Buy / Add Sell:** Dialog with fields for Stock, Symbol, Quantity, Price, Date, Ind. PE, P/E, Invested %, Target.
- **Portfolio Summary:** Mail icon (green when configured) opens EmailSettingsDialog for SMTP config. Investable amount, realized P&L, available balance, Send Alerts Now / Reset Alerts buttons, alert debug section.
- **Alerts:** Alert system with email delivery. Checks every 10s via localStorage polling. Time-based triggering with configurable period (default 60s). "Send Alerts Now" sends all unsent alerts immediately. "Reset Alerts" clears sent state.
- **Portfolio News Feed:** Yahoo Finance news for owned + watchlist stocks (Indian stocks only, relevance-filtered).
- **Trades & Deals:** 
  - Yahoo Finance insider trades for Indian holdings.
  - **High Value Investor tracking:** "Add Investor" button (blue), dialog to add investor/fund names. Investor names persist permanently in localStorage.
  - **NSE Bulk/Block Deals:** Auto-fetched daily after 00:10 AM via `/api/nse-bulk-deals`. Matched deals against tracked investors displayed in table.
  - **Find Stock button** (blue, before Add Investor): Opens dialog with period toggle (1 Day / 1 Week). Fetches NSE bulk deals, filters by tracked investors, shows per-investor-per-stock breakdown: Investor, Symbol, Security, Buy/Sell/Net Qty, Net Value (₹ Cr), Action (INCREASED green / DECREASED red).

### 3. Broker's A/C (Ledger) Tab
- **BROCKERS FUND MOVEMENTS:** Combined view of personal entries (bank-to-broker, broker-to-bank, dividend) + stock trades. Columns: Date, Transaction (colored badges), CREDIT (IN), DEBIT (OUT), BALANCE. Running balance. "STOCK SOLD" badge has light green background.
- **Brocker's A/C:** Summary per stock (grouped by `stockName`, case-insensitive): Buy Qty/Amount, Sell Qty/Amount, Balance Qty/Amount.
- **Detailed Stock Ledger:** Filter by stock and financial year. CSV export.

### 4. Personal A/C (Cashbook) Tab
- Fund movement entries: Sent to Broker, Received from Broker, Dividend Received.
- CREDIT (IN) / DEBIT (OUT) columns with running balance.
- SEE ALL / HIDE toggle (last 3 entries, newest first).
- Summary cards: Total Received, Total Sent, Balance, Total Entries, Dividends.

### 5. Deposits Tab
- **Fixed Deposit Portfolio:** Compact table layout (p-0.5, narrow columns). Columns: Start Date, Family Member, Bank, Amount, Period (Y/M/D), Maturity Date, Days to Maturity, Actions (4 small buttons: Edit/Alerts/Withdraw/Delete).
- Add Deposit (blue button), Withdraw (amber "W" button).
- Subtotals per family member and Grand Total. Int/Mat under Maturity Date / Days to Maturity columns.
- **Retirement Plans Card** followed by **Retirement Calculator Card** at bottom.

## Key Configuration

### Users
- Stored in `localStorage['users']` as array of `{ id, name, email, mobile, investableAmount }`.
- Login via user selection dialog. Admin delete requires password `1234`.
- Default user: bj1960@gmail.com (used for email alerts).

### localStorage Keys
| Key | Format | Used By |
|-----|--------|---------|
| `users` | `UserProfile[]` | page.tsx |
| `transactions_{userId}` | `Transaction[]` | Portfolio, Ledger |
| `personalAcEntries` | `Entry[]` | Cashbook, Ledger |
| `brokerTrades` | `TradeEntry[]` | Ledger |
| `smartWatchlist_{userId}` | `WatchlistStock[]` | Research, Watchlist |
| `stockAlerts_{userId}` | `AlertConfig[]` | Portfolio |
| `sentAlerts_{userId}` | `SentAlert[]` | Portfolio |
| `high_value_investors` | `HighValueInvestor[]` | Trades & Deals |
| `nse_bulk_deals` | `BulkDeal[]` | Trades & Deals |
| `nse_bulk_deals_last_fetch` | `string` (YYYY-MM-DD) | Trades & Deals |
| `email_smtp_config` | `{ email, appPassword }` | Portfolio (Email Settings) |

### API Routes
- **`/api/company-details`** (POST) — Scrapes Screener.in for consolidated company financial data. URL: `/company/{symbol}/consolidated/`.
- **`/api/yahoo-price`** (GET) — Proxies Yahoo Finance chart API. Converts `.BSE` → `.BO`, `.NSE` → `.NS`.
- **`/api/yahoo-quote`** (GET) — Generic Yahoo Finance chart API proxy for any symbol (indices, commodities, forex).
- **`/api/nse-bulk-deals`** (GET) — Proxies NSE India bulk/block deals JSON API. Accepts `?date=YYYY-MM-DD`.
- **`/api/send-email`** (POST) — Sends email via Gmail SMTP using nodemailer. Body: `{ to, subject, text, smtpUser, smtpPass }`.

## Key Design Decisions
1. All table text is `text-black` for visibility.
2. Stock P/E > Industry P/E renders in red, otherwise black.
3. No mock data — features gracefully degrade when API/data unavailable.
4. Toast notifications auto-dismiss after 1.5 seconds (1500ms).
5. Gemini/genkit AI permanently removed — no more 429 quota errors.
6. Consolidated financial figures used (not standalone) — scraper URL uses `/consolidated/`.
7. Stock grouping in Broker's A/C uses `stockName` (case-insensitive).
8. Yahoo Finance primary data source for prices, news, insider trades, financial summary.
9. AI analysis is data-driven (no LLM) — computes scores from real metrics (P/E, ROE, debt, margins, MA crossovers).
10. All financial tables display newest-to-oldest (left-to-right).
11. Email alerts use time-based triggering (default 60s), alert checker polls localStorage every 10s.
12. High Value Investor names persist permanently in localStorage, loaded on Trades & Deals mount.
13. "Data loaded" toast suppressed on initial Research tab open; only fires on explicit Fetch click.
14. Find Stock fetches NSE bulk deals per-investor and shows INCREASED/DECREASED badges per stock.

## Conditional Highlighting (Company Data Tables)
| Table | Rows | Columns | Rule |
|-------|------|---------|------|
| Quarterly Results, P&L | Sales, Net Profit | Latest 3 | Green if value increased vs prior, red if decreased |
| Cash Flows | Cash from Operating/Investing/Financing Activity, Net Cash Flow, Free Cash Flow | Latest 1 | Green if positive, red if negative |
| Cash Flows | CFO/OP (regex: cfo/op, ops/op, from ops) | Latest 1 | Green background if >80%, red background if ≤80% |

## Known Limitations
- Screener.in scraping may break if HTML structure changes.
- Yahoo Finance API may rate-limit; proxy routes mitigate CORS.
- NSE India API blocks automated requests; proxy may fail without proper session headers.
- Stock list in `allStocks` is hardcoded (~10 Indian + 4 US stocks).
- `.BSE`/`.BO` conversion assumes BSE exchange only.
- Yahoo Finance insider transactions may return empty for some stocks.
- News only fetched for first 5 owned stock symbols.
- Gmail SMTP requires App Password (not regular password) — configured via EmailSettingsDialog.

## Relevant Source Files
- `src/app/page.tsx` — Main page, user selection, passes userEmail to PortfolioDashboard
- `src/components/portfolio-dashboard.tsx` — Portfolio (holdings, trades, alerts, news, bulk deals, email settings, Find Stock with per-investor analysis)
- `src/components/research/company-data-card.tsx` — Financial tables with highlighting logic (Sales/Net Profit trend, Cash Flow sign, CFO/OP bg, data-load toast on explicit fetch only)
- `src/components/research/world-market-overview.tsx` — Indices/commodities via /api/yahoo-quote
- `src/components/research/screener-results-card.tsx` — Hide/show toggle
- `src/components/deposits-dashboard.tsx` — Fixed deposits (compact table, narrow cols, small action buttons, Retirement Calculator at bottom)
- `src/lib/screener-scraper.ts` — Screener.in scraper (consolidated URL)
- `src/actions/company-actions.ts` — Maps scraper data to CompanyDetails
- `src/types/index.ts` — TypeScript types (HighValueInvestor, BulkDeal, AlertConfig with createdAt)
- `src/hooks/use-toast.ts` — Toast duration 1500ms
- `src/app/api/yahoo-price/route.ts` — Yahoo Finance chart proxy
- `src/app/api/yahoo-quote/route.ts` — Generic Yahoo Finance quote proxy
- `src/app/api/nse-bulk-deals/route.ts` — NSE bulk/block deals proxy
- `src/app/api/send-email/route.ts` — Nodemailer Gmail SMTP email sender
- `src/app/api/company-details/route.ts` — Screener.in data proxy
