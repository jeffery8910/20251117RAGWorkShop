import { NextRequest } from "next/server";
import { listConversations } from "@/lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get("authorization") || "";
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

type QaItem = {
  id: string;
  ts: string;
  question: string;
  isQuiz: boolean;
  avgDistance: number;
  minDistance: number;
  maxDistance: number;
  isOutlier: boolean;
};

export async function GET(req: NextRequest) {
  if (!auth(req)) return new Response("unauthorized", { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") || 100), 10),
    500
  );

  // 取得最近一批對話記錄（包含 in / out）
  const convs = await listConversations(limit * 4, {}); // 多抓一些再過濾

  // 建立 message map：id -> text
  const messages = new Map<string, any>();
  for (const c of convs) {
    if (c.type === "message") {
      messages.set(String(c.id), c);
    }
  }

  const items: QaItem[] = [];
  const allAvgDistances: number[] = [];

  for (const c of convs) {
    if (c.type !== "reply") continue;
    const hits = Array.isArray(c.hits) ? c.hits : [];
    if (!hits.length) continue;

    // 由 replyToId 找回對應的問題
    const qId = c.replyToId ? String(c.replyToId) : "";
    const msg = qId ? messages.get(qId) : null;
    const questionText: string =
      typeof msg?.text === "string"
        ? msg.text
        : typeof c.text === "string"
        ? c.text
        : "";

    // score -> distance（1 - score），因 Qdrant Cosine 越大越相似
    const distances: number[] = [];
    for (const h of hits) {
      const s =
        typeof h.score === "number"
          ? h.score
          : typeof h.similarity === "number"
          ? h.similarity
          : undefined;
      if (typeof s === "number") {
        distances.push(1 - s);
      }
    }
    if (!distances.length) continue;

    const n = distances.length;
    const avg = distances.reduce((a, b) => a + b, 0) / n;
    const min = Math.min(...distances);
    const max = Math.max(...distances);

    const isQuiz =
      (c.meta && c.meta.quiz) ||
      (typeof c.text === "string" && c.text.startsWith("[QUIZ]"));

    const item: QaItem = {
      id: String(c.id),
      ts: c.ts ? String(c.ts) : new Date().toISOString(),
      question: questionText || "(未知問題文字)",
      isQuiz: Boolean(isQuiz),
      avgDistance: avg,
      minDistance: min,
      maxDistance: max,
      isOutlier: false, // 先占位，後面再根據 global 統計更新
    };

    items.push(item);
    allAvgDistances.push(avg);
  }

  if (!items.length) {
    return new Response(
      JSON.stringify({
        count: 0,
        meanAvgDistance: 0,
        stdAvgDistance: 0,
        threshold3Sigma: 0,
        items: [],
      }),
      { headers: { "content-type": "application/json" } }
    );
  }

  const n = allAvgDistances.length;
  const mean =
    allAvgDistances.reduce((a, b) => a + b, 0) / (n === 0 ? 1 : n);
  const variance =
    allAvgDistances.reduce((acc, d) => acc + (d - mean) * (d - mean), 0) /
    (n <= 1 ? 1 : n - 1);
  const std = Math.sqrt(Math.max(variance, 0));
  const threshold3Sigma = mean + 3 * std;

  for (const item of items) {
    item.isOutlier = item.avgDistance > threshold3Sigma;
  }

  return new Response(
    JSON.stringify({
      count: items.length,
      meanAvgDistance: mean,
      stdAvgDistance: std,
      threshold3Sigma,
      items,
    }),
    { headers: { "content-type": "application/json" } }
  );
}

