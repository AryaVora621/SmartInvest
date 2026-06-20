# SmartInvest AI — Indian Stock Research App

AI-powered investment analysis platform for Indian stocks, built with Next.js 15, Genkit (Gemini), and data sourced from screener.in.

---

## Features

- **Company Deep-Dive** — 12 data sections per stock: Quick Ratio, Pros & Cons, Peer Comparison (same-industry peers), Quarterly Results, Profit & Loss, Growth Table, Balance Sheet, Cash Flows, Ratios, Shareholding Pattern, SWOT Analysis, Technical Analysis
- **Data Source** — All company financials scraped from [screener.in](https://www.screener.in) using Cheerio (no Yahoo Finance / Alpha Vantage dependency for Indian stocks)
- **Peer Comparison** — Auto-detects the stock's industry from screener.in and lists direct business competitors with CMP, P/E, Market Cap, Div Yield, Net Profit, Sales, ROCE
- **Screener** — Predefined screeners (Growth, Value, Dividend, etc.) to filter stocks from a local list
- **Stock Finder** — AI-powered stock screening using Gemini (growth >50% filter)
- **SWOT Analysis** — Gemini-generated or fallback data for strengths, weaknesses, opportunities, threats
- **World Market Overview** — Real-time market indices with collapsible header
- **Watchlist** — Smart watchlist with add/remove functionality
- **Financial Calculators** — Price projections and valuation tools
- **Live Price & Charts** — Historical price chart with technical indicators

---

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Environment variables — create .env.local:
GOOGLE_GENAI_API_KEY=your_gemini_api_key

# 3. Start dev server (port 9002)
npm run dev
```

Open **http://localhost:9002**

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev --turbopack -p 9002` | Start dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint |
| `typecheck` | `tsc --noEmit` | TypeScript type checking |
| `genkit:dev` | `genkit start -- tsx src/ai/dev.ts` | Start Genkit AI dev server |
| `genkit:watch` | `genkit start -- tsx --watch src/ai/dev.ts` | Genkit with file watching |

---

## Tech Stack

| Technology | Version |
|------------|---------|
| Next.js | 15.3.3 |
| React | 18.3.1 |
| TypeScript | ^5 |
| Tailwind CSS | ^3.4.1 |
| shadcn/ui | 36 components |
| Genkit | ^1.14.1 |
| Gemini 2.0 Flash | AI model |
| Cheerio | ^1.2.0 |
| Recharts | ^2.15.1 |
| date-fns | ^3.6.0 |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/screener-scraper.ts` | Cheerio-based scraper for screener.in company data |
| `src/actions/company-actions.ts` | Server logic: company details, mapping, SWOT prompt |
| `src/components/research/company-data-card.tsx` | Main data display with all 12 sections |
| `src/app/api/company-details/route.ts` | API route wrapping company details |
| `src/ai/flows/` | Genkit AI flows (analysis, screening, peer comparison) |

---

## Notes

- Indian stocks only (BSE/NS suffix)
- Data sourced exclusively from screener.in for financials
- Yahoo Finance chart v8 API still used for price history
- Gemini API key required for AI features (SWOT, screening, analysis)
- Gemini free tier is rate-limited (429 errors when quota exceeded)
