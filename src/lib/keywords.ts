import fs from 'fs';
import path from 'path';

export type KeywordRule = {
  match: string | string[];
  reply?: string;      // static reply by bot
  source?: string;     // restrict RAG to this payload.source
  mode?: 'reply'|'rag'|'native'; // native: let LINE OA native keyword reply handle it (bot skips replying)
};

function normalize(s: string) { return String(s || '').trim().toLowerCase(); }

export async function loadKeywordRules(): Promise<KeywordRule[]> {
  // 1) Try config document (if present via Data API/driver)
  try {
    const mod: any = await import('./mongo');
    const cfg = await mod.getConfig();
    const arr = (cfg as any)?.keywordRules;
    if (Array.isArray(arr)) return arr as KeywordRule[];
  } catch {}

  // 2) Try local repo file config/keywords.json
  try {
    const p = path.join(process.cwd(), 'config', 'keywords.json');
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const j = JSON.parse(raw);
      const arr = Array.isArray(j?.keywords) ? j.keywords : [];
      return arr as KeywordRule[];
    }
  } catch {}

  // 3) Fallback empty
  return [];
}

export function findKeywordMatch(rules: KeywordRule[], text: string): KeywordRule | null {
  const t = normalize(text);
  for (const r of rules) {
    const matches = Array.isArray(r.match) ? r.match : [r.match];
    for (const m of matches) {
      const ms = normalize(m);
      if (!ms) continue;
      if (t === ms || t.includes(ms)) return r;
    }
  }
  return null;
}
