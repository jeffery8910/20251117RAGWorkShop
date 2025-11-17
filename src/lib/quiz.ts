import { embedText, generateWithContext } from './gemini';
import { getRuntimeConfig } from './config';
import * as qdr from './qdrant';
import { aggregate } from './mongo';

export type QuizItem = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

export async function generateRagQuiz(topicOrQuestion: string): Promise<QuizItem> {
  const cfg = await getRuntimeConfig();
  const backend = (process.env.VECTOR_BACKEND || 'qdrant').toLowerCase();
  const hasQdrant = Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);

  // 1) 先用問題做 embedding
  const queryVector = await embedText(topicOrQuestion, 'RETRIEVAL_QUERY');

  // 2) 依現有向量設定查找相關片段
  let hits: any[] = [];
  if (backend === 'qdrant' && hasQdrant) {
    const limit = Number(cfg.TOPK ?? 6);
    const scoreTh = Number.isFinite(cfg.SCORE_THRESHOLD) ? cfg.SCORE_THRESHOLD : undefined;
    const res = await qdr.search(queryVector, limit, scoreTh, undefined);
    hits = res.map((r: any) => ({
      content: r?.payload?.text || r?.payload?.content || '',
      source: r?.payload?.source || '-',
      page: r?.payload?.page ?? '-',
      section: r?.payload?.section || '',
      score: r?.score,
    }));
  } else if (process.env.ATLAS_DATA_API_BASE || process.env.ATLAS_DATA_API_URL) {
    const pipe = [
      {
        $vectorSearch: {
          index: process.env.ATLAS_SEARCH_INDEX,
          path: 'embedding',
          queryVector,
          numCandidates: Number(cfg.NUM_CANDIDATES ?? 400),
          limit: Number(cfg.TOPK ?? 6),
        },
      },
      {
        $project: {
          content: 1,
          source: 1,
          page: 1,
          section: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];
    const r: any = await aggregate(pipe);
    hits = r?.documents || [];
  }

  // 3) 組合 context 文字
  const maxChars = 2000;
  let used = 0;
  const ctxParts: string[] = [];
  for (const h of hits) {
    const t = h.content || '';
    if (!t) continue;
    if (used + t.length > maxChars) break;
    used += t.length;
    const section = h.section ? `（段落：${h.section}）` : '';
    ctxParts.push(`- ${t}\n（來源：${h.source} 第 ${h.page ?? '-'} 頁 ${section}）`);
  }

  const contextText =
    ctxParts.length > 0
      ? ctxParts.join('\n')
      : '（目前沒有找到相關文件，可依照一般常識出題即可。）';

  // 4) 請 Gemini 依 context 出一題選擇題（JSON 格式）
  const system = [
    '你是一個測驗命題助理，負責根據提供的知識內容，出「單題」選擇題測驗使用者的理解程度。',
    '請只輸出 JSON，不要夾雜多餘文字。',
    'JSON 格式為：',
    '{',
    '  "question": "題目文字",',
    '  "options": ["選項A", "選項B", "選項C", "選項D"],',
    '  "correct_index": 0,',
    '  "explanation": "說明為什麼正確答案是這一個，並補充重點。"',
    '}',
  ].join('\n');

  const prompt = `${system}\n\n主題：${topicOrQuestion}\n\n以下是與主題最相關的知識內容（可能節錄自多個文件）：\n${contextText}\n\n請依上述 JSON 格式，出一題適合作為測驗的選擇題。`;

  const raw = await generateWithContext(prompt);

  function tryParse(jsonText: string): QuizItem {
    const trimmed = jsonText.trim();
    try {
      const obj = JSON.parse(trimmed);
      if (
        !obj ||
        typeof obj.question !== 'string' ||
        !Array.isArray(obj.options) ||
        typeof obj.correct_index !== 'number' ||
        typeof obj.explanation !== 'string'
      ) {
        throw new Error('invalid quiz shape');
      }
      return obj as QuizItem;
    } catch {
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start >= 0 && end > start) {
        const sub = trimmed.slice(start, end + 1);
        const obj = JSON.parse(sub);
        if (
          !obj ||
          typeof obj.question !== 'string' ||
          !Array.isArray(obj.options) ||
          typeof obj.correct_index !== 'number' ||
          typeof obj.explanation !== 'string'
        ) {
          throw new Error('invalid quiz shape');
        }
        return obj as QuizItem;
      }
      throw new Error('cannot parse quiz JSON');
    }
  }

  const quiz = tryParse(raw);

  // 安全防護：至少 2 個選項，correct_index 落在範圍內
  if (!Array.isArray(quiz.options) || quiz.options.length < 2) {
    throw new Error('quiz options too few');
  }
  if (quiz.correct_index < 0 || quiz.correct_index >= quiz.options.length) {
    quiz.correct_index = 0;
  }

  return quiz;
}

