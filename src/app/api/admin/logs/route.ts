import { NextRequest } from 'next/server';
import { listLogs } from '@/lib/mongo';
import { driverListLogs } from '@/lib/atlas-driver';

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
  const provider = (process.env.LOG_PROVIDER || 'none').toLowerCase();
  let logs: any[] = [];
  if (provider === 'atlas-driver') logs = await driverListLogs(Math.min(Math.max(limit, 1), 200));
  else logs = await listLogs(Math.min(Math.max(limit, 1), 200));
  return new Response(JSON.stringify({ logs }), { headers: { 'content-type': 'application/json' } });
}
