import { QdrantClient } from '@qdrant/js-client-rest';

export type QdrantPoint = {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
};

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required for Qdrant`);
  return v;
}

export function getQdrantClient() {
  const url = requiredEnv('QDRANT_URL');
  const apiKey = requiredEnv('QDRANT_API_KEY');
  return new QdrantClient({ url, apiKey });
}

export function getCollectionName() {
  return process.env.QDRANT_COLLECTION || 'workshop_rag_docs';
}

export async function ensureCollection(dim: number) {
  const client = getQdrantClient();
  const name = getCollectionName();
  try {
    const info: any = await client.getCollection(name);
    const actual = info?.result?.config?.params?.vectors?.size ?? info?.result?.vectors?.size;
    // Auto-reset collection on dimension mismatch if enabled (QDRANT_RESET_ON_DIM_MISMATCH=true)
    if (typeof actual === 'number' && actual !== dim) {
      const reset = String(process.env.QDRANT_RESET_ON_DIM_MISMATCH || '').toLowerCase() === 'true';
      if (reset) {
        try { await client.deleteCollection(name as any); } catch {}
        await client.createCollection(name, { vectors: { size: dim, distance: 'Cosine' } });
        return;
      }
    }
    if (typeof actual === 'number' && actual !== dim) {
      throw new Error(`Qdrant collection \"${name}\" 維度不相容：現有=${actual}，新資料=${dim}。請到 /admin 清空集合或將 EMBED_DIM 設為 ${actual} 後再上傳。`);
    }
    return; // 已存在且維度相容
  } catch {}
  await client.createCollection(name, {
    vectors: { size: dim, distance: 'Cosine' },
  });
}

export async function upsertPoints(points: QdrantPoint[]) {
  const client = getQdrantClient();
  const name = getCollectionName();
  if (!points.length) return;
  await client.upsert(name, { points });
}

export async function search(vector: number[], limit: number, scoreThreshold?: number, filter?: any) {
  const client = getQdrantClient();
  const name = getCollectionName();
  const r = await client.search(name, {
    vector,
    limit,
    with_payload: true,
    score_threshold: typeof scoreThreshold === 'number' ? scoreThreshold : undefined,
    ...(filter ? { filter } : {} as any),
  });
  return r as Array<{ id: string | number; score: number; payload?: any; }>
}

export async function ping(): Promise<boolean> {
  try {
    const client = getQdrantClient();
    await client.getCollections();
    return true;
  } catch { return false; }
}

export async function deleteBySource(source: string) {
  const client = getQdrantClient();
  const name = getCollectionName();
  await client.delete(name, {
    filter: { must: [ { key: 'source', match: { value: source } } ] }
  } as any);
}

export async function clearCollection() {
  const client = getQdrantClient();
  const name = getCollectionName();
  try { await client.deleteCollection(name); } catch {}
}

export async function scrollBySource(source: string, limit = 100) {
  const client = getQdrantClient();
  const name = getCollectionName();
  const all: any[] = [];
  let offset: any = undefined;
  // Iterate with pagination
  // Qdrant REST: scroll returns { points, next_page_offset }
  for (let i=0; i<1000; i++) {
    const r: any = await client.scroll(name, {
      filter: { must: [ { key: 'source', match: { value: source } } ] },
      with_payload: true,
      with_vectors: false,
      limit,
      offset
    } as any);
    const pts = (r as any)?.points || [];
    all.push(...pts);
    offset = (r as any)?.next_page_offset;
    if (!offset || pts.length === 0) break;
  }
  return all;
}

export async function listSources(limit = 1000) {
  const client = getQdrantClient();
  const name = getCollectionName();
  const set = new Set<string>();
  let offset: any = undefined;
  for (let i=0; i<1000; i++) {
    const r: any = await client.scroll(name, {
      with_payload: true,
      with_vectors: false,
      limit: 200,
      offset
    } as any);
    const pts = (r as any)?.points || [];
    for (const p of pts) {
      const s = p?.payload?.source;
      if (typeof s === 'string' && s.length) set.add(s);
      if (set.size >= limit) break;
    }
    offset = (r as any)?.next_page_offset;
    if (!offset || pts.length === 0 || set.size >= limit) break;
  }
  return Array.from(set).sort();
}
