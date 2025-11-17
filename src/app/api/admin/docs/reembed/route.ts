import { NextRequest } from 'next/server';
import { embedText } from '@/lib/gemini';
import * as qdr from '@/lib/qdrant';
import { findDocsBySource, updateEmbeddingById, atlasConfigured } from '@/lib/mongo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get('authorization') || '';
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return new Response('unauthorized', { status: 401 });
  const { source } = await req.json();
  if (!source) return new Response('source required', { status: 400 });

  const backend = (process.env.VECTOR_BACKEND || 'qdrant').toLowerCase();
  const hasQdrant = Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);
  let count = 0;

  if (backend === 'qdrant' && hasQdrant) {
    const points = await qdr.scrollBySource(source, 200);
    if (!points.length) return new Response(JSON.stringify({ reembedded: 0 }), { headers: { 'content-type': 'application/json' } });
    const vectors: number[][] = [];
    for (const p of points) {
      const text = p?.payload?.text || p?.payload?.content || '';
      if (!text) continue;
      const v = await embedText(text, 'RETRIEVAL_DOCUMENT');
      vectors.push(v);
    }
    try { await qdr.ensureCollection(vectors[0].length); } catch {}
    await qdr.upsertPoints(points.map((p: any, i: number) => ({ id: p.id, vector: vectors[i], payload: p.payload })));
    count = vectors.length;
  } else if (atlasConfigured()) {
    const r: any = await findDocsBySource(source);
    const docs = r?.documents || [];
    for (const d of docs) {
      const text = d.content || d.text || '';
      if (!text) continue;
      const v = await embedText(text, 'RETRIEVAL_DOCUMENT');
      await updateEmbeddingById(d._id, v);
      count++;
    }
  } else {
    return new Response('Vector store not configured (set QDRANT_URL/API_KEY or Atlas envs)', { status: 500 });
  }

  return new Response(JSON.stringify({ reembedded: count }), { headers: { 'content-type': 'application/json' } });
}
