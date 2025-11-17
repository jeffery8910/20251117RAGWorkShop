import { NextRequest } from 'next/server';
import * as qdr from '@/lib/qdrant';
import { deleteAllDocs, atlasConfigured } from '@/lib/mongo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get('authorization') || '';
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return new Response('unauthorized', { status: 401 });
  const backend = (process.env.VECTOR_BACKEND || 'qdrant').toLowerCase();
  const hasQdrant = Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);
  if (backend === 'qdrant' && hasQdrant) {
    await qdr.clearCollection();
  } else if (atlasConfigured()) {
    await deleteAllDocs();
  } else {
    return new Response('Vector store not configured (set QDRANT_URL/API_KEY or Atlas envs)', { status: 500 });
  }
  return new Response(JSON.stringify({ cleared: true }), { headers: { 'content-type': 'application/json' } });
}
