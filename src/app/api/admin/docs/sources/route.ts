import { NextRequest } from 'next/server';
import { atlasConfigured, listDistinctSources } from '@/lib/mongo';
import { listSources } from '@/lib/qdrant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get('authorization') || '';
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return new Response('unauthorized', { status: 401 });
  const backend = (process.env.VECTOR_BACKEND || 'qdrant').toLowerCase();
  const hasQdrant = Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);
  let sources: string[] = [];
  if (backend === 'qdrant' && hasQdrant) {
    sources = await listSources(5000).catch(()=>[]);
  } else if (atlasConfigured()) {
    sources = await listDistinctSources(5000).catch(()=>[]);
  }
  return new Response(JSON.stringify({ sources }), { headers: { 'content-type': 'application/json' } });
}

