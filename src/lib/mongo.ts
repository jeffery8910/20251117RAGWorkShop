export type DataAPIAction = 'aggregate'|'insertOne'|'insertMany'|'updateOne'|'find'|'findOne';

function isPlaceholder(v?: string): boolean {
  if (!v) return true;
  const s = String(v).toLowerCase();
  return s.includes('app_id') || s.includes('your') || s.includes('<') || s.includes('>') || s.includes('changeme') || s.includes('example');
}

export function atlasConfigured(): boolean {
  const base = process.env.ATLAS_DATA_API_BASE || process.env.ATLAS_DATA_API_URL;
  if (!base || isPlaceholder(base)) return false;
  if (isPlaceholder(process.env.ATLAS_DATA_API_KEY)) return false;
  if (isPlaceholder(process.env.ATLAS_DATA_SOURCE)) return false;
  if (isPlaceholder(process.env.ATLAS_DATABASE)) return false;
  // collection/index �i����\��өw�A�����j��A���Y��F�e��r�]�������]�w
  if (isPlaceholder(process.env.ATLAS_COLLECTION)) return false;
  return true;
}

function getActionUrl(action: DataAPIAction) {
  const base = process.env.ATLAS_DATA_API_BASE;
  if (base) return `${base}/${action}`;
  const url = process.env.ATLAS_DATA_API_URL; // backward compat (may point to aggregate)
  if (url) return url.replace(/\/aggregate$/, `/${action}`);
  throw new Error('ATLAS_DATA_API_BASE or ATLAS_DATA_API_URL env required');
}

async function dataApi<T=any>(action: DataAPIAction, payload: any): Promise<T> {
  const res = await fetch(getActionUrl(action), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'api-key': process.env.ATLAS_DATA_API_KEY as string
    },
    body: JSON.stringify({
      dataSource: process.env.ATLAS_DATA_SOURCE,
      database: process.env.ATLAS_DATABASE,
      ...payload
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Data API ${action} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function insertMany(documents: any[], collection?: string) {
  return dataApi('insertMany', { collection: collection || process.env.ATLAS_COLLECTION, documents });
}

export async function insertOne(document: any, collection?: string) {
  return dataApi('insertOne', { collection: collection || process.env.ATLAS_COLLECTION, document });
}

export async function aggregate(pipeline: any[]) {
  if (!atlasConfigured()) return { documents: [] } as any;
  return dataApi('aggregate', { collection: process.env.ATLAS_COLLECTION, pipeline });
}

export async function aggregateOn(collection: string, pipeline: any[]) {
  if (!atlasConfigured()) return { documents: [] } as any;
  return dataApi('aggregate', { collection, pipeline });
}

export async function updateConfig(doc: any) {
  if (!atlasConfigured()) return { acknowledged: false } as any;
  return dataApi('updateOne', {
    collection: 'config',
    filter: { _id: 'default' },
    update: { $set: doc },
    upsert: true
  });
}

export async function getConfig(): Promise<any> {
  if (!atlasConfigured()) {
    return {
      _id: 'default',
      prompt: process.env.DEFAULT_PROMPT || '�A�O�@��U�СC�Юھڴ��Ѫ��Ч����e�^�����D�A�M���ޥΨӷ��]�ɦW�P���X/�q���^�C',
      keywords: (process.env.DEFAULT_KEYWORDS || 'help,�ҵ{,�Ч�').split(',').map(s=>s.trim()).filter(Boolean),
      TOPK: Number(process.env.TOPK || 6),
      SCORE_THRESHOLD: Number(process.env.SCORE_THRESHOLD || 0.1),
      NUM_CANDIDATES: Number(process.env.NUM_CANDIDATES || 400),
      forwardToN8nUrl: process.env.FORWARD_TO_N8N_URL || '',
      forwardRule: process.env.FORWARD_RULE || ''
    };
  }
  try {
    const r = await dataApi('findOne', { collection: 'config', filter: { _id: 'default' } });
    const doc = (r as any)?.document || {};
    return {
      _id: 'default',
      prompt: doc.prompt ?? '�A�O�@��U�СC�Юھڴ��Ѫ��Ч����e�^�����D�A�M���ޥΨӷ��]�ɦW�P���X/�q���^�C',
      keywords: doc.keywords ?? ['help','�ҵ{','�Ч�'],
      TOPK: Number(doc.TOPK ?? process.env.TOPK ?? 6),
      SCORE_THRESHOLD: Number(doc.SCORE_THRESHOLD ?? process.env.SCORE_THRESHOLD ?? 0.1),
      NUM_CANDIDATES: Number(doc.NUM_CANDIDATES ?? process.env.NUM_CANDIDATES ?? 400),
      forwardToN8nUrl: doc.forwardToN8nUrl ?? process.env.FORWARD_TO_N8N_URL ?? '',
      forwardRule: doc.forwardRule ?? process.env.FORWARD_RULE ?? ''
    };
  } catch {
    return {
      _id: 'default',
      prompt: process.env.DEFAULT_PROMPT || '�A�O�@��U�СC�Юھڴ��Ѫ��Ч����e�^�����D�A�M���ޥΨӷ��]�ɦW�P���X/�q���^�C',
      keywords: (process.env.DEFAULT_KEYWORDS || 'help,�ҵ{,�Ч�').split(',').map(s=>s.trim()).filter(Boolean),
      TOPK: Number(process.env.TOPK || 6),
      SCORE_THRESHOLD: Number(process.env.SCORE_THRESHOLD || 0.1),
      NUM_CANDIDATES: Number(process.env.NUM_CANDIDATES || 400),
      forwardToN8nUrl: process.env.FORWARD_TO_N8N_URL || '',
      forwardRule: process.env.FORWARD_RULE || ''
    };
  }
}

export async function logEvent(entry: any) {
  if (!atlasConfigured()) return { acknowledged: false } as any;
  return dataApi('insertOne', { collection: 'logs', document: { ...entry, ts: new Date().toISOString() } });
}

export async function listLogs(limit=50) {
  if (!atlasConfigured()) return [];
  try {
    const pipe = [ { $sort: { ts: -1 } }, { $limit: limit } ];
    const r = await aggregateOn('logs', pipe);
    return (r as any)?.documents ?? [];
  } catch {
    return [];
  }
}

export async function findDocsBySource(source: string) {
  if (!atlasConfigured()) return { documents: [] } as any;
  return dataApi('find', { collection: process.env.ATLAS_COLLECTION, filter: { source } });
}

export async function deleteDocsBySource(source: string) {
  if (!atlasConfigured()) return { deletedCount: 0 } as any;
  return dataApi('deleteMany' as any, { collection: process.env.ATLAS_COLLECTION, filter: { source } });
}

export async function deleteAllDocs() {
  if (!atlasConfigured()) return { deletedCount: 0 } as any;
  return dataApi('deleteMany' as any, { collection: process.env.ATLAS_COLLECTION, filter: {} });
}

export async function updateEmbeddingById(id: string, embedding: number[]) {
  if (!atlasConfigured()) return { acknowledged: false } as any;
  return dataApi('updateOne', { collection: process.env.ATLAS_COLLECTION, filter: { _id: id }, update: { $set: { embedding } } });
}

export async function listDistinctSources(limit=1000): Promise<string[]> {
  if (!atlasConfigured()) return [];
  try {
    const r: any = await dataApi('aggregate', {
      collection: process.env.ATLAS_COLLECTION,
      pipeline: [ { $group: { _id: '$source' } }, { $limit: limit } ]
    });
    const arr = (r?.documents || []).map((d:any)=> d?._id).filter((s:string)=> typeof s === 'string');
    return arr;
  } catch { return []; }
}
