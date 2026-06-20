import { NextRequest, NextResponse } from 'next/server';
import { getCompanyDetails } from '@/actions/company-actions';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { stockName } = body;
        if (!stockName) {
            return NextResponse.json({ success: false, error: 'stockName is required' }, { status: 400 });
        }
        const result = await getCompanyDetails(stockName);
        return NextResponse.json(result);
    } catch (error) {
        console.error('API route error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
