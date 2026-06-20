import { NextResponse } from 'next/server';
import { readSettings, writeSettings, publicView } from '@smartinvest/ai-engine/settings';
import { listProviders } from '@smartinvest/ai-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KNOWN = ['claude', 'codex', 'agy', 'api'];

// Attach live provider availability to the secret-free public view.
async function viewWithProviders(s: any) {
  const view: any = publicView(s);
  view.providers = await listProviders(s);
  return view;
}

export async function GET() {
  return NextResponse.json(await viewWithProviders(readSettings()));
}

export async function POST(req: Request) {
  let patch: any;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (patch.apiBaseUrl && !/^https?:\/\//.test(String(patch.apiBaseUrl))) {
    return NextResponse.json({ error: 'apiBaseUrl must be http(s)' }, { status: 400 });
  }
  if (
    patch.cascadeOrder &&
    (!Array.isArray(patch.cascadeOrder) || patch.cascadeOrder.some((id: string) => !KNOWN.includes(id)))
  ) {
    return NextResponse.json({ error: 'cascadeOrder has unknown provider ids' }, { status: 400 });
  }
  const next = writeSettings(patch);
  return NextResponse.json(await viewWithProviders(next));
}
