import { NextRequest } from 'next/server';
import { listConversations } from '@/lib/logs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get('authorization') || '';
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return new Response('unauthorized', { status: 401 });
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') || 50);
  const userId = url.searchParams.get('userId') || undefined;
  const channelId = url.searchParams.get('channelId') || undefined;
  const q = url.searchParams.get('q') || undefined;
  const from = url.searchParams.get('from') || undefined;
  const to = url.searchParams.get('to') || undefined;
  const rows = await listConversations(limit, { userId, channelId, q, from, to });
  return new Response(JSON.stringify({ conversations: rows }), { headers: { 'content-type': 'application/json' } });
}
