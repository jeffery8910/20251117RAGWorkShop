// Simplified Mongo helpers: do NOT use Atlas Data API in this project.
// This file now only provides env-based runtime config and no-op stubs
// for old Data API helpers, so that other modules可以安全引用但不會觸發 Data API。

export function atlasConfigured(): boolean {
  // Atlas Data API support 已移除，統一改用 Qdrant 向量庫 ＋（選用）atlas-driver。
  // 保留這個函式只是避免舊程式碼出錯。
  return false;
}

export async function insertMany(_documents: any[], _collection?: string) {
  throw new Error("Atlas Data API has been removed from this project.");
}

export async function insertOne(_document: any, _collection?: string) {
  throw new Error("Atlas Data API has been removed from this project.");
}

export async function aggregate(_pipeline: any[]) {
  return { documents: [] } as any;
}

export async function aggregateOn(_collection: string, _pipeline: any[]) {
  return { documents: [] } as any;
}

export async function updateConfig(_doc: any) {
  return { acknowledged: false } as any;
}

export async function getConfig(): Promise<any> {
  return {
    _id: "default",
    prompt:
      process.env.DEFAULT_PROMPT ||
      "你是一位助教。請根據知識庫內容回答問題，並在必要時附上來源頁碼／段落。",
    keywords: (process.env.DEFAULT_KEYWORDS || "help,課程,報名")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    TOPK: Number(process.env.TOPK || 6),
    SCORE_THRESHOLD: Number(process.env.SCORE_THRESHOLD || 0.1),
    NUM_CANDIDATES: Number(process.env.NUM_CANDIDATES || 400),
    forwardToN8nUrl: process.env.FORWARD_TO_N8N_URL || "",
    forwardRule: process.env.FORWARD_RULE || "",
  };
}

export async function logEvent(_entry: any) {
  return { acknowledged: false } as any;
}

export async function listLogs(_limit = 50) {
  return [];
}

export async function findDocsBySource(_source: string) {
  return { documents: [] } as any;
}

export async function deleteDocsBySource(_source: string) {
  return { deletedCount: 0 } as any;
}

export async function deleteAllDocs() {
  return { deletedCount: 0 } as any;
}

export async function updateEmbeddingById(_id: string, _embedding: number[]) {
  return { acknowledged: false } as any;
}

export async function listDistinctSources(_limit = 1000): Promise<string[]> {
  return [];
}

