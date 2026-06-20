export function getNextAlphaVantageKey(): string | null {
    const singleKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (singleKey && singleKey.trim() && singleKey !== 'YOUR_ALPHA_VANTAGE_API_KEY') {
        return singleKey.trim();
    }
    return null;
}
