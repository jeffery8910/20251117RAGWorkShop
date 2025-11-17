import { limitedJsonPost } from './ratelimit';

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

async function postJson(url: string, body: any) {
  const res = await limitedJsonPost('gemini', url, { 'x-goog-api-key': String(getGeminiKey()) }, body);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${t}`);
  }
  return res.json();
}

export async function embedText(text: string, taskType: 'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'='RETRIEVAL_DOCUMENT') {
  const configured = process.env.EMBED_MODEL || 'gemini-embedding-001';
  const alt = /^text-embedding-/.test(configured) ? 'gemini-embedding-001' : 'text-embedding-004';
  const dim = Number(process.env.EMBED_DIM || process.env.EMBEDDING_DIMENSIONS || '');

  async function embedOnce(model: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`;
    const body: any = { model: `models/${model}`, content: { parts: [{ text }] }, taskType };
    if (Number.isFinite(dim) && /^text-embedding-/.test(String(model))) {
      body.outputDimensionality = dim;
    }
    const channel = /^text-embedding-/.test(model) ? 'gemini_embed_te' : 'gemini_embed_ge';
    const res = await limitedJsonPost(channel as any, url, { 'x-goog-api-key': String(getGeminiKey()) }, body);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gemini embed failed (${model}): ${res.status} ${t}`);
    }
    const data = await res.json();
    const values = data?.embedding?.values;
    if (!values) throw new Error('No embedding values');
    return values as number[];
  }

  try {
    return await embedOnce(configured);
  } catch (e) {
    // Fallback to the alternate model
    try { return await embedOnce(alt); }
    catch { throw e; }
  }
}

export async function generateWithContext(prompt: string) {
  const model = process.env.GEN_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  // use dedicated limiter channel for generation
  const res = await limitedJsonPost('gemini_gen' as any, url, { 'x-goog-api-key': String(getGeminiKey()) }, { contents: [{ role: 'user', parts: [{ text: prompt }] }] });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini generate failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text as string;
}
