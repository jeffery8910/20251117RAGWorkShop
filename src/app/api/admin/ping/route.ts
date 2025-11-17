import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get('authorization') || '';
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return new Response('unauthorized', { status: 401 });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
}

