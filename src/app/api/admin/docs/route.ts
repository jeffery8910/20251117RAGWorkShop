import { NextRequest } from 'next/server';
import { chunkText } from '@/lib/chunker';
import { embedText } from '@/lib/gemini';
import { insertMany, deleteDocsBySource, atlasConfigured } from '@/lib/mongo';
import * as qdr from '@/lib/qdrant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get('authorization') || '';
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return new Response('unauthorized', { status: 401 });
  const { content, source, page = 0, section = '' } = await req.json();
  if (!content || !source) return new Response('content & source required', { status: 400 });

  const chunks = chunkText(content);
  const docs: any[] = [];
  for (const c of chunks) {
    const v = await embedText(c.text, 'RETRIEVAL_DOCUMENT');
    docs.push({ _id: `${source}-${c.chunk_id}`, content: c.text, embedding: v, source, page, section, chunk_id: c.chunk_id });
  }
  const backend = (process.env.VECTOR_BACKEND || 'qdrant').toLowerCase();
  const hasQdrant = Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);
  if (backend === 'qdrant' && hasQdrant) {
    await qdr.ensureCollection(docs[0].embedding.length);
    const { randomUUID } = await import('crypto');
    const points = docs.map(d => ({
      id: randomUUID(),
      vector: d.embedding,
      payload: { text: d.content, source: d.source, page: d.page, section: d.section, chunk_id: d.chunk_id, doc_id: d._id }
    }));
    await qdr.upsertPoints(points);
  } else if (atlasConfigured()) {
    await insertMany(docs);
  } else {
    return new Response('Vector store not configured (set QDRANT_URL/API_KEY or Atlas envs)', { status: 500 });
  }
  return new Response(JSON.stringify({ inserted: docs.length }), { headers: { 'content-type': 'application/json' } });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const source = url.searchParams.get('source') || '';
  const tokenOk = (req.headers.get('authorization') || '') === `Bearer ${process.env.ADMIN_TOKEN}`;
  if (!tokenOk) return new Response('unauthorized', { status: 401 });
  if (!source) return new Response('source required', { status: 400 });
  const backend = (process.env.VECTOR_BACKEND || 'qdrant').toLowerCase();
  const hasQdrant = Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);
  if (backend === 'qdrant' && hasQdrant) {
    await qdr.deleteBySource(source);
  } else if (atlasConfigured()) {
    await deleteDocsBySource(source);
  } else {
    return new Response('Vector store not configured (set QDRANT_URL/API_KEY or Atlas envs)', { status: 500 });
  }
  return new Response(JSON.stringify({ deleted: true }), { headers: { 'content-type': 'application/json' } });
}
