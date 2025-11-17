import { NextRequest } from 'next/server';
import { ragAnswer } from '@/lib/rag';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get('authorization') || '';
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return new Response('unauthorized', { status: 401 });
  const { question } = await req.json();
  if (!question) return new Response('question required', { status: 400 });
  const { answer, hits } = await ragAnswer(question);
  return new Response(JSON.stringify({ answer, hits }), { headers: { 'content-type': 'application/json' } });
}
