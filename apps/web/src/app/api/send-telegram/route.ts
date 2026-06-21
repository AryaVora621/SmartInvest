import { NextRequest, NextResponse } from 'next/server';

// Mirrors /api/send-email: the caller supplies its own bot token + chat id (stored
// client-side, the user's own bot). We never persist them server-side.
export async function POST(request: NextRequest) {
  try {
    const { botToken, chatId, text } = await request.json();
    if (!botToken || !chatId || !text) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json({ success: false, error: data.description || 'Telegram API error' }, { status: 502 });
    }
    return NextResponse.json({ success: true, messageId: data.result?.message_id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send telegram message';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
