import { NextRequest } from 'next/server';
import { getConversationById } from '@/lib/logs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get('authorization') || '';
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  if (!auth(req)) return new Response('unauthorized', { status: 401 });
  const row = await getConversationById(ctx.params.id);
  if (!row) return new Response('not found', { status: 404 });
  return new Response(JSON.stringify(row), { headers: { 'content-type': 'application/json' } });
}
