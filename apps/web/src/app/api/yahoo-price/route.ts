import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const symbol = request.nextUrl.searchParams.get('symbol');
    if (!symbol) {
        return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        if (!res.ok) {
            return NextResponse.json({ error: 'Yahoo Finance request failed' }, { status: res.status });
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
