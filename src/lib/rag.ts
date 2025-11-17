import { embedText, generateWithContext } from './gemini';
import { getRuntimeConfig } from './config';
import * as qdr from './qdrant';
import { aggregate } from './mongo';

export async function ragAnswer(question: string, opts?: { filter?: any; topK?: number; scoreThreshold?: number; numCandidates?: number }) {
  const cfg = await getRuntimeConfig();
  const external = process.env.ANSWER_WEBHOOK_URL;
  const extToken = process.env.ANSWER_WEBHOOK_TOKEN || process.env.BACKEND_API_KEY;
  const extTimeout = Number(process.env.ANSWER_WEBHOOK_TIMEOUT_MS || 15000);

  // If external answer provider is configured, delegate first
  if (external) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(()=> ctrl.abort(), extTimeout);
      const res = await fetch(external, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(extToken ? { 'authorization': `Bearer ${extToken}` } : {})
        },
        body: JSON.stringify({
          question,
          topK: cfg.TOPK,
          scoreThreshold: cfg.SCORE_THRESHOLD,
          numCandidates: cfg.NUM_CANDIDATES
        }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (res.ok) {
        const j: any = await res.json();
        return { answer: j.answer || '', hits: j.hits || [] };
      }
      // Fall through to local pipeline if backend errors
    } catch { /* ignore and fallback */ }
  }
  const queryVector = await embedText(question, 'RETRIEVAL_QUERY');

  const backend = (process.env.VECTOR_BACKEND || 'qdrant').toLowerCase();
  const hasQdrant = Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);
  let hits: any[] = [];

  if (backend === 'qdrant' && hasQdrant) {
    const limit = Number(opts?.topK ?? cfg.TOPK ?? 6);
    const scoreTh = Number.isFinite(opts?.scoreThreshold ?? cfg.SCORE_THRESHOLD) ? (opts?.scoreThreshold ?? cfg.SCORE_THRESHOLD) : undefined;
    const res = await qdr.search(queryVector, limit, scoreTh, opts?.filter);
    hits = res.map((r: any) => ({
      content: r?.payload?.text || r?.payload?.content || '',
      source: r?.payload?.source || '-',
      page: r?.payload?.page ?? '-',
      section: r?.payload?.section || '',
      chunk_id: r?.payload?.chunk_id,
      score: r?.score,
    }));
  } else if (process.env.ATLAS_DATA_API_BASE || process.env.ATLAS_DATA_API_URL) {
    // Fallback: Atlas Vector Search via Data API
    const pipe = [
      { $vectorSearch: {
          index: process.env.ATLAS_SEARCH_INDEX,
          path: 'embedding',
          queryVector,
          numCandidates: Number(opts?.numCandidates ?? cfg.NUM_CANDIDATES ?? 400),
          limit: Number(opts?.topK ?? cfg.TOPK ?? 6)
        }
      },
      { $project: { content: 1, source: 1, page: 1, section: 1, chunk_id: 1, score: { $meta: 'vectorSearchScore' } } }
    ];
    const r: any = await aggregate(pipe);
    hits = r?.documents || [];
  } else {
    hits = [];
  }

  const maxChars = 2000; let used = 0; const ctxParts: string[] = [];
  for (const h of hits) {
    const t = h.content || '';
    if (!t) continue;
    if (used + t.length > maxChars) break;
    used += t.length;
    const section = h.section ? `・${h.section}` : '';
    ctxParts.push(`- ${t}\n(來源:${h.source} p.${h.page ?? '-'} ${section})`);
  }
  const prompt = `${cfg.prompt}\n\n已檢索到的教材片段：\n${ctxParts.join('\n')}\n\n使用者問題：${question}`;
  const answer = await generateWithContext(prompt);
  return { answer, hits };
}
