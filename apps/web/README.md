# SmartInvest AI

**SmartInvest AI** is a powerful, modern, and intuitive investment analysis tool designed to provide users with comprehensive market insights, portfolio management, and AI-powered analytics.

## Tech Stack

This application is built with a modern and robust technology stack:
*   **Frontend:** Next.js, React, TypeScript
*   **Styling:** Tailwind CSS, ShadCN UI
*   **AI/Backend:** Genkit

## Core Features

SmartInvest AI offers a rich set of features to empower investors:

1.  **User Authentication:** Simple and secure profile management. All user data, including portfolios and watchlists, is tied to the logged-in user profile.
2.  **Tab-Based Dashboard:** An intuitive, tabbed interface provides access to all the application's core functionalities.
3.  **Data-Driven Components:** The app fetches and displays real-time and historical financial data in beautifully designed, easy-to-understand cards and tables.
4.  **Interactive Tools:** Users can leverage a suite of tools, including a stock screener, AI-driven analysis, financial calculators, and management modules for their portfolio and fixed deposits.

## Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Alpha Vantage API Key for stock data
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here

# Gemini API Key for AI functionality  
GEMINI_API_KEY=your_gemini_api_key_here

# Indian API Key for BSE/NSE data
INDIAN_API_KEY=your_indian_api_key_here
```

### Getting API Keys:

1. **Alpha Vantage**: Get a free API key from [https://www.alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key)
2. **Gemini**: Get your API key from [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
3. **Indian API**: Get your API key from [https://stock.indianapi.in/](https://stock.indianapi.in/)

---

### The Five Main Tabs

#### 1. Research Tab
The command center for market research and analysis.
-   **World Market Overview:** A real-time ticker showing major world indices, commodities, and currency exchange rates.
-   **Screener & Stock Finder:** Find stocks using predefined or custom screeners and view results categorized by growth potential.
-   **Company Data:** A deep dive into the selected stock’s financials, including key ratios, pros & cons, quarterly results, P&L statements, balance sheets, and cash flow data.
-   **AI-Powered Analysis:** Generate AI-driven recommendations (Buy, Wait, Not Buy) with detailed reasoning for any stock using various language models.
-   **SWOT Analysis:** A classic Strengths, Weaknesses, Opportunities, and Threats analysis for the selected stock.
-   **Financial Calculators:** Project a stock's future price based on various scenarios like uptrends, large orders, or capacity expansion.
-   **Smart Watchlist:** Add stocks and set custom alerts to monitor your investment opportunities.

#### 2. Portfolio Tab
Manage your personal stock portfolio with precision.
-   **Portfolio Summary:** A high-level view of your total investment, invested amount, available balance, and realized profit/loss.
-   **My Holdings:** A detailed table of all your current stock holdings, with live price updates and P&L calculations.
-   **Trade History:** A comprehensive log of all buy and sell transactions, which can be toggled for viewing and updated with new trades.

#### 3. Ledger Tab
A classic accounting-style ledger for all your stock transactions.
-   **Ledger Summary:** A quick summary of total buy, sell, and balance quantities for every stock you've traded.
-   **Detailed Stock Ledger:** A chronological, transaction-by-transaction history for a selected stock, with a running balance.

#### 4. Cashbook Tab (Funds Flow)
Track the flow of cash in and out of your investment account.
-   **Funds Flow Table:** A passbook-style view that records every deposit (initial investment, stock sales) and withdrawal (stock purchases), maintaining a running balance. It is filterable by time and exportable.

#### 5. Deposits Tab
Manage fixed deposits (FDs) and other long-term retirement plans.
-   **Fixed Deposit Portfolio:** A detailed table to track all your FDs, including bank, principal, maturity dates, interest, and maturity amounts.
-   **Retirement Plans:** Track other investments like PPF, NPS, and Mutual Funds.
-   **Retirement Calculator:** A tool to help you calculate the required corpus for your retirement goals.
