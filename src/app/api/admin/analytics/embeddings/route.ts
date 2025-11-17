import { NextRequest } from "next/server";
import { getQdrantClient, getCollectionName } from "@/lib/qdrant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get("authorization") || "";
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

type EmbeddingPoint = {
  id: string;
  x: number;
  y: number;
  distance: number;
  isOutlier: boolean;
  source?: string;
  page?: string | number;
};

export async function GET(req: NextRequest) {
  if (!auth(req)) return new Response("unauthorized", { status: 401 });

  const backend = (process.env.VECTOR_BACKEND || "qdrant").toLowerCase();
  if (backend !== "qdrant") {
    return new Response(
      "embeddings analytics currently only supports QDRANT backend",
      { status: 400 }
    );
  }
  if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
    return new Response("QDRANT_URL / QDRANT_API_KEY not configured", {
      status: 400,
    });
  }

  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") || 200), 10),
    500
  );

  const client = getQdrantClient();
  const name = getCollectionName();

  // 讀出一批 points（不過濾 source）
  const r: any = await client.scroll(name, {
    with_payload: true,
    with_vectors: true,
    limit,
  } as any);
  const pts = (r?.points || []) as Array<{
    id: string | number;
    payload?: any;
    vector?: number[] | { [key: string]: number[] };
  }>;

  if (!pts.length) {
    return new Response(
      JSON.stringify({
        backend: "qdrant",
        count: 0,
        meanDistance: 0,
        stdDistance: 0,
        threshold3Sigma: 0,
        points: [],
      }),
      { headers: { "content-type": "application/json" } }
    );
  }

  // 取得向量（支援 multi-vector 的情況，先取第一個）
  const vectors: number[][] = [];
  for (const p of pts) {
    const v = p.vector;
    if (Array.isArray(v)) {
      vectors.push(v);
    } else if (v && typeof v === "object") {
      const firstKey = Object.keys(v)[0];
      if (firstKey && Array.isArray((v as any)[firstKey])) {
        vectors.push((v as any)[firstKey]);
      }
    }
  }

  if (!vectors.length) {
    return new Response(
      JSON.stringify({
        backend: "qdrant",
        count: 0,
        meanDistance: 0,
        stdDistance: 0,
        threshold3Sigma: 0,
        points: [],
      }),
      { headers: { "content-type": "application/json" } }
    );
  }

  const dim = vectors[0].length;

  // 計算 centroid
  const centroid = new Array(dim).fill(0) as number[];
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += v[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    centroid[i] /= vectors.length;
  }

  // 計算每一點到 centroid 的距離
  const distances: number[] = [];
  for (const v of vectors) {
    let sum = 0;
    for (let i = 0; i < dim; i++) {
      const d = v[i] - centroid[i];
      sum += d * d;
    }
    distances.push(Math.sqrt(sum));
  }

  const n = distances.length;
  const mean =
    distances.reduce((acc, d) => acc + d, 0) / (n === 0 ? 1 : n);
  const variance =
    distances.reduce((acc, d) => acc + (d - mean) * (d - mean), 0) /
    (n <= 1 ? 1 : n - 1);
  const std = Math.sqrt(Math.max(variance, 0));
  const threshold3Sigma = mean + 3 * std;

  // 為了簡單可視化，取向量前兩個維度當作 x/y
  const points: EmbeddingPoint[] = pts.map((p, idx) => {
    const v = vectors[idx];
    const x = v[0] ?? 0;
    const y = v[1] ?? 0;
    const distance = distances[idx];
    const isOutlier = distance > threshold3Sigma;
    const payload = p.payload || {};
    return {
      id: String(p.id),
      x,
      y,
      distance,
      isOutlier,
      source: typeof payload.source === "string" ? payload.source : undefined,
      page:
        typeof payload.page === "number" || typeof payload.page === "string"
          ? payload.page
          : undefined,
    };
  });

  return new Response(
    JSON.stringify({
      backend: "qdrant",
      count: points.length,
      meanDistance: mean,
      stdDistance: std,
      threshold3Sigma,
      points,
    }),
    { headers: { "content-type": "application/json" } }
  );
}

