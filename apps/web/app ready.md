# Indian Stock Research App — App Ready

## Overview
Multi-tab Indian stock research and portfolio management app built with Next.js 16. All data stored in localStorage per user ID. No backend database required.

## Tech Stack
- **Framework:** Next.js 16.2.9 (Turbopack)
- **Language:** TypeScript
- **UI:** shadcn/ui (React)
- **Styling:** Tailwind CSS
- **Live Prices:** Yahoo Finance API (via proxy route `/api/yahoo-price`)
- **Company Data:** Screener.in scraping
- **Stock Symbols:** BSE (`.BO` suffix), NSE (`.NS` suffix), US stocks (direct symbols)

## Features

### 1. Research Tab
- **Stock Finder:** Local stock list with screener-based filtering. AI mode shows "not available" (Gemini removed). Toggle between AI/Local mode.
- **Company Data:** Quarterly results, P&L, Balance Sheet, Cash Flows, Ratios from Screener.in (Consolidated figures).
- **Stock Analysis:** Shows "not available" — Gemini AI removed.
- **Screener:** Predefined screening criteria with results filtering.
- **Watchlist:** Smart watchlist with context-menu add, drag-reorder, and alerts.
- **World Market Overview:** Live indices (BSE, NASDAQ, FTSE, Nikkei, Shanghai, Nifty, NYSE) and commodities (Crude Oil, Gold) + USD/INR rate from Yahoo Finance. Refreshes every 60s.
- **Technical Analysis:** RSI, MACD, SMA indicators.
- **Financial Calculators:** SIP, Lumpsum, SWP, EMI calculators.

### 2. Portfolio Tab
- **My Holdings:** Stocks with quantity > 0. Columns: Stock, Symbol, Quantity, Price, Invested Value, Current Price (live), Current Value, P&L, % Change, Actions. Refresh Live Prices button fetches via Yahoo Finance API proxy.
- **Trade History:** All buy/sell transactions. Columns: Stock, Symbol, Date, Transaction, Qty, Price, Amount, Ind. PE, P/E, Inv.%, Target, Actions (Edit/Delete). CSV export.
- **Add Buy / Add Sell:** Dialog with fields for Stock, Symbol/Ticker, Quantity, Price, Date, Ind. PE, P/E, Invested %, Target.
- **Alerts:** Period + threshold selection with email/telegram checkboxes. Add custom thresholds. Max 5 alerts per stock.
- **Portfolio News Feed:** News articles for owned stocks.
- **Portfolio Summary:** Investable amount, realized P&L, available balance.

### 3. Broker's A/C (Ledger) Tab
- **BROCKERS FUND MOVEMENTS:** Combined view of personal entries (bank-to-broker, broker-to-bank, dividend) + stock trades. Columns: Date, Transaction (with colored badges), CREDIT (IN), DEBIT (OUT), BALANCE. Running balance per row. "STOCK SOLD" badge has light green background.
- **Brocker's A/C:** Summary per stock: Buy Qty/Amount, Sell Qty/Amount, Balance Qty/Amount.
- **Detailed Stock Ledger:** Filter by stock and financial year. Individual transaction view. CSV export.

### 4. Personal A/C (Cashbook) Tab
- Fund movement entries: Sent to Broker's A/C, Received from Broker's A/C, Dividend Received.
- CREDIT (IN) / DEBIT (OUT) columns with running balance.
- SEE ALL / HIDE toggle (shows last 3 entries, sorted newest first).
- Summary cards: Total Received, Total Sent, Balance, Total Entries, Dividends.

### 5. Deposits Tab
- Fixed deposit management: Bank, family member, principal, tenure, interest rate, maturity tracking.
- Fields: Bank Name, Family Member, Principal, Start Date, Period (Years/Months/Days), Interest Rate.

## Key Configuration

### Users
- Stored in `localStorage['users']` as array of `{ id, name, email, mobile, investableAmount }`.
- Login via user selection dialog. Admin delete requires password `1234`.

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

## API Routes
- **`/api/company-details`** (POST) — Scrapes Screener.in for company financial data.
- **`/api/yahoo-price`** (GET) — Proxies Yahoo Finance chart API. Converts `.BSE` → `.BO`, `.NSE` → `.NS`.

## Key Design Decisions
1. All table text is `text-black` for visibility.
2. Stock P/E > Industry P/E renders in red, otherwise black.
3. No mock data — features gracefully degrade when API/data unavailable.
4. Toast notifications auto-dismiss after 3 seconds (`duration: 3000` in `use-toast.ts`).
5. Gemini/genkit AI permanently removed — no more 429 quota errors.
6. Consolidated financial figures used (not standalone).
7. Stock grouping in Broker's A/C uses `stockName` (case-insensitive) not `stockSymbol`.

## Bug Fixes Applied (Batch)
1. **Runtime crash:** Added missing `useUptrendFinder`/`setUseUptrendFinder` state in StockFinderCard.
2. **Alert form ignored:** Wired Period/Threshold Select and Email/Telegram Checkbox state to `handleSave` in SetAlertsDialog.
3. **Hardcoded date:** Cashbook default date now uses `new Date().toISOString().split('T')[0]`.
4. **Dead code:** Removed `FUND_MOVEMENTS_KEY` constant and associated unreachable code in ledger.
5. **Unused props:** Removed unused `transactions` and `investableAmount` props from CashbookDashboard.
6. **Unused imports:** Removed unused `Loader2` import from WorldMarketOverview.
7. **Dead UI:** Removed always-empty `TradesAndDeals` component.
8. **React key:** Fixed `ledger.stockSymbol` key fallback when symbol is empty.

## Known Limitations
- Screener.in scraping may break if HTML structure changes.
- Yahoo Finance API may rate-limit; proxy route mitigates CORS issues.
- Stock list in `allStocks` is hardcoded — limited to ~15 stocks.
- `.BSE`/`.BO` symbol conversion assumes BSE exchange; NSE (`.NS`) stocks not in list.
- `formatCurrencyNoDecimal` is a `const` used before its definition line (safe at runtime due to closure).
