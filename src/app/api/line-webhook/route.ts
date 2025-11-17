import { verifyLineSignature, replyToLine } from '@/lib/line';
import { ragAnswer } from '@/lib/rag';
import { logEvent, getConfig as getMongoConfig } from '@/lib/mongo';
import { logConversation } from '@/lib/logs';
import { loadKeywordRules, findKeywordMatch } from '@/lib/keywords';
import { generateRagQuiz } from '@/lib/quiz';

export const runtime = 'nodejs';
export const maxDuration = 30; // Vercel Free: 10s default, Hobby: up to 60s
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  const sig = req.headers.get('x-line-signature') || '';
  const raw = await req.text();
  if (!verifyLineSignature(raw, sig)) {
    return new Response('unauthorized', { status: 401 });
  }

  const body = JSON.parse(raw);
  const ev = body?.events?.[0];
  const text = ev?.message?.text || '';
  const replyToken = ev?.replyToken;
  const userId = ev?.source?.userId;
  const channelId = ev?.source?.type;
  if (!text || !replyToken) return new Response('ok');

  const crypto = await import('crypto');
  const inId = crypto.randomUUID();

  // Normalize text & load keyword rules once
  const normalized = String(text).trim().toLowerCase();
  const rules = await loadKeywordRules();
  const keywordHit = findKeywordMatch(rules, normalized);
  const filter = keywordHit?.source
    ? { must: [{ key: 'source', match: { value: keywordHit.source } }] }
    : undefined;

  // Config (from Atlas / driver if available, otherwise env)
  const cfg = await getMongoConfig();
  const cfgKeywords = Array.isArray(cfg.keywords) ? (cfg.keywords as string[]) : [];

  // Quiz: 幫我測驗 xxx 觀念
  const quizPrefix = '幫我測驗';
  const wantsQuiz = text.startsWith(quizPrefix);

  // n8n forwarding settings (config overrides env)
  const forwardToN8nUrl =
    (cfg.forwardToN8nUrl as string | undefined) || process.env.FORWARD_TO_N8N_URL;
  const forwardRule = (
    (cfg.forwardRule as string | undefined) ||
    process.env.FORWARD_RULE ||
    ''
  ).toLowerCase();

  // Log inbound message (even if forwarded)
  await logConversation({
    id: inId,
    type: 'message',
    direction: 'in',
    text,
    userId,
    channelId,
    meta: {
      ...(forwardToN8nUrl ? { forwardToN8nUrl, forwardRule: forwardRule || 'all' } : {}),
      quiz: wantsQuiz ? true : undefined
    }
  });

  // Quiz mode 優先處理（不轉發到 n8n）
  if (wantsQuiz) {
    try {
      const topicRaw = text.slice(quizPrefix.length).trim();
      const topic = topicRaw || '這個主題';
      const quiz = await generateRagQuiz(topic);

      const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
      const quickReplyItems = quiz.options.slice(0, labels.length).map((opt, idx) => ({
        type: 'action',
        action: {
          type: 'message',
          label: `${labels[idx]}. ${opt}`.slice(0, 20),
          text: `我選擇：${labels[idx]}`
        }
      }));

      const questionText = `來測驗「${topic}」的觀念吧！\n\n題目：${quiz.question}`;

      const flexContents = {
        type: 'bubble',
        size: 'mega',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'RAG 測驗題',
              weight: 'bold',
              size: 'lg',
              color: '#00C48C'
            },
            {
              type: 'text',
              text: `主題：${topic}`,
              size: 'sm',
              color: '#aaaaaa',
              margin: 'sm',
              wrap: true
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'text',
              text: quiz.question,
              wrap: true,
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: quiz.options.slice(0, labels.length).map((opt, idx) => ({
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: `${labels[idx]}`,
                    size: 'sm',
                    color: '#999999',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: opt,
                    size: 'sm',
                    color: '#ffffff',
                    wrap: true,
                    flex: 5
                  }
                ]
              }))
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'text',
              text: `正確答案：${labels[quiz.correct_index]}`,
              size: 'sm',
              color: '#00C48C',
              margin: 'md',
              wrap: true
            },
            {
              type: 'text',
              text: `解析：${quiz.explanation}`,
              size: 'sm',
              color: '#dddddd',
              margin: 'sm',
              wrap: true
            }
          ]
        }
      };

      const messages = [
        {
          type: 'text',
          text: questionText,
          quickReply: {
            items: quickReplyItems
          }
        },
        {
          type: 'flex',
          altText: 'RAG 測驗題與解析',
          contents: flexContents
        }
      ];

      await logEvent({
        type: 'quiz_generated',
        topic,
        question: quiz.question,
        options: quiz.options,
        correct_index: quiz.correct_index
      });

      const outId = crypto.randomUUID();
      await logConversation({
        id: outId,
        replyToId: inId,
        type: 'reply',
        direction: 'out',
        text: `[QUIZ] ${quiz.question}`,
        userId,
        channelId,
        hits: [],
        meta: { quiz: true, topic }
      });

      await replyToLine(replyToken, messages);
      return new Response('ok');
    } catch (e: any) {
      await logEvent({
        type: 'quiz_error',
        q: text,
        error: String(e?.message || e)
      });
      // 失敗就落回一般 RAG pipeline
    }
  }

  // Optional: forward to n8n instead of handling in cloud-app
  if (forwardToN8nUrl) {
    const rule = forwardRule || 'all'; // default: forward all
    const shouldForward =
      rule === 'all' || (rule === 'keywords' && !!keywordHit && keywordHit.mode !== 'native');

    if (shouldForward) {
      try {
        const res = await fetch(forwardToN8nUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: raw
        });
        await logEvent({
          type: 'forward_n8n',
          q: text,
          url: forwardToN8nUrl,
          status: res.status
        });
      } catch (e: any) {
        await logEvent({
          type: 'forward_n8n_error',
          q: text,
          url: forwardToN8nUrl,
          error: String(e?.message || e)
        });
      }
      // n8n workflow is expected to call LINE Reply API directly
      return new Response('ok');
    }
  }

  let answer = '(�t�Φ��L�A�ȵL���e)';
  let skipReply = false;

  try {
    // Keyword routing: native / static reply / RAG with filter
    let handled = false;

    if (keywordHit?.mode === 'native') {
      // Honor LINE native keyword reply: bot skips replying to avoid double messages
      await logEvent({ type: 'keyword_native', q: text, rule: keywordHit });
      skipReply = true;
      handled = true;
    }

    if (keywordHit?.reply) {
      answer = keywordHit.reply;
      await logEvent({ type: 'keyword', q: text, answer, rule: keywordHit });
      handled = true;
    }

    // RAG keyword trigger: if text contains any configured keyword (substring), run RAG immediately
    if (!handled) {
      const lowerKeywords = cfgKeywords.map(k => String(k).toLowerCase());
      if (Array.isArray(cfgKeywords) && lowerKeywords.some(k => normalized.includes(k))) {
        const { answer: a, hits } = await ragAnswer(text, { filter });
        answer = a || answer;
        const compactHits = hits.map((h: any) => ({
          source: h.source,
          page: h.page,
          score: h.score
        }));
        await logEvent({ type: 'reply_rag_keyword', q: text, answer, hits: compactHits });
        const outId = crypto.randomUUID();
        await logConversation({
          id: outId,
          replyToId: inId,
          type: 'reply',
          direction: 'out',
          text: answer,
          userId,
          channelId,
          hits: compactHits
        });
        handled = true;
      }
    }

    if (!handled) {
      // Explain when user only sends a bare keyword
      const lowerKeywords = cfgKeywords.map(k => String(k).toLowerCase());
      if (lowerKeywords.includes(normalized)) {
        answer =
          '����I�o�O�w�]����r�^�СC�]�i�H������J���D�A�ڷ|�αЧ����ѨӦ^���C';
      } else {
        const { answer: a, hits } = await ragAnswer(text, { filter });
        answer = a || answer;
        const compactHits = hits.map((h: any) => ({
          source: h.source,
          page: h.page,
          score: h.score
        }));
        await logEvent({ type: 'reply', q: text, answer, hits: compactHits });
        const outId = crypto.randomUUID();
        await logConversation({
          id: outId,
          replyToId: inId,
          type: 'reply',
          direction: 'out',
          text: answer,
          userId,
          channelId,
          hits: compactHits
        });
      }
    }
  } catch (e: any) {
    answer = '��p�A�t�μȮɵL�k�^�СA�еy��A�աC';
    await logEvent({ type: 'error', q: text, error: String(e?.message || e) });
    await logConversation({
      type: 'error',
      direction: 'out',
      text: String(e?.message || e),
      userId,
      channelId
    });
  }

  if (!skipReply) {
    try {
      await replyToLine(replyToken, answer);
    } catch {
      // ignore reply error
    }
  }

  return new Response('ok');
}
