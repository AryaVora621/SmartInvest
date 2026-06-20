import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { to, subject, text, smtpUser, smtpPass } = body;

        if (!to || !subject || !text || !smtpUser || !smtpPass) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user: smtpUser, pass: smtpPass },
        });

        const info = await transporter.sendMail({
            from: `"Stock Alert" <${smtpUser}>`,
            to,
            subject,
            text,
        });

        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to send email';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
