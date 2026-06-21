export function getNextAlphaVantageKey(): string | null {
    const singleKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (singleKey && singleKey.trim() && singleKey !== 'YOUR_ALPHA_VANTAGE_API_KEY') {
        return singleKey.trim();
    }
    return null;
}

// Financial Modeling Prep — fundamentals fallback when Alpha Vantage isn't configured.
export function getNextFmpKey(): string | null {
    const key = process.env.FMP_API_KEY;
    if (key && key.trim() && key !== 'YOUR_FMP_API_KEY') {
        return key.trim();
    }
    return null;
}
