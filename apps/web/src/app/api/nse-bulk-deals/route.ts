import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const dateParam = request.nextUrl.searchParams.get('date') || '';
        const today = dateParam || new Date().toISOString().split('T')[0];
        const parts = today.split('-');
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

        const url = `https://www.nseindia.com/api/reports?type=bulk-deals&date=${formattedDate}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.nseindia.com/report-detail/display-bulk-and-block-deals',
            },
        });

        if (!res.ok) {
            return NextResponse.json({ success: false, error: `NSE API returned ${res.status}`, data: [] });
        }

        const raw = await res.json();
        const deals = Array.isArray(raw) ? raw : (raw?.data || []);

        const mapped = deals.map((d: any) => ({
            date: d?.dealDate || d?.date || today,
            symbol: d?.symbol || '',
            securityName: d?.securityName || d?.security || '',
            clientName: d?.clientName || d?.buyerName || d?.sellerName || '',
            buySell: d?.buySell || d?.transactionType || (d?.buyerName ? 'BUY' : 'SELL'),
            quantityTraded: parseInt(d?.quantityTraded || d?.quantity || 0),
            tradePrice: parseFloat(d?.tradePrice || d?.price || 0),
            quantityTradedPercentage: d?.quantityTradedPercentage || '',
        }));

        return NextResponse.json({ success: true, data: mapped });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch NSE bulk deals', data: [] });
    }
}
