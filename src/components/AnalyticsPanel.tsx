"use client";
import { useState } from "react";

interface AnalyticsPanelProps {
  token: string;
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

type EmbeddingsResponse = {
  backend: string;
  count: number;
  meanDistance: number;
  stdDistance: number;
  threshold3Sigma: number;
  points: EmbeddingPoint[];
};

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

type QaResponse = {
  count: number;
  meanAvgDistance: number;
  stdAvgDistance: number;
  threshold3Sigma: number;
  items: QaItem[];
};

export default function AnalyticsPanel({ token }: AnalyticsPanelProps) {
  const [embeddings, setEmbeddings] = useState<EmbeddingsResponse | null>(null);
  const [embeddingsLoading, setEmbeddingsLoading] = useState(false);
  const [qaStats, setQaStats] = useState<QaResponse | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmbeddings = async () => {
    setError(null);
    setEmbeddingsLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/embeddings?limit=200", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "載入嵌入點失敗");
      }
      const j = (await res.json()) as EmbeddingsResponse;
      setEmbeddings(j);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setEmbeddingsLoading(false);
    }
  };

  const loadQaStats = async () => {
    setError(null);
    setQaLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/qa?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "載入問答統計失敗");
      }
      const j = (await res.json()) as QaResponse;
      setQaStats(j);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setQaLoading(false);
    }
  };

  // 簡單將嵌入點畫在一個 SVG 平面上
  const renderEmbeddingScatter = () => {
    if (!embeddings || embeddings.points.length === 0) return null;
    const pts = embeddings.points;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 10;
    const width = 400;
    const height = 260;

    const scaleX = (x: number) =>
      pad +
      ((x - minX) / (maxX === minX ? 1 : maxX - minX)) * (width - pad * 2);
    const scaleY = (y: number) =>
      pad +
      ((y - minY) / (maxY === minY ? 1 : maxY - minY)) * (height - pad * 2);

    return (
      <svg
        width={width}
        height={height}
        className="bg-gray-950 border border-gray-800 rounded"
      >
        {pts.map((p, i) => (
          <circle
            key={p.id ?? i}
            cx={scaleX(p.x)}
            cy={scaleY(p.y)}
            r={p.isOutlier ? 4 : 2.5}
            fill={p.isOutlier ? "#ef4444" : "#22c55e"}
            opacity={0.8}
          />
        ))}
      </svg>
    );
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">
          嵌入點分佈與 3σ Outlier
        </h2>
        <p className="text-sm text-gray-400">
          從向量庫擷取一小部分嵌入點樣本，計算每個點距離群心的距離，並以 3 個標準差作為
          outlier 門檻。紅點代表可能的異常點。
        </p>
        <button
          className="inline-flex items-center px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-sm text-white disabled:opacity-50"
          onClick={loadEmbeddings}
          disabled={embeddingsLoading}
        >
          {embeddingsLoading ? "載入中…" : "載入嵌入點樣本"}
        </button>

        {embeddings && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-2 text-sm text-gray-300">
              <div>向量後端：{embeddings.backend}</div>
              <div>樣本數：{embeddings.count}</div>
              <div>
                平均距離（μ）：{embeddings.meanDistance.toFixed(4)}
              </div>
              <div>
                距離標準差（σ）：{embeddings.stdDistance.toFixed(4)}
              </div>
              <div>
                3σ 門檻（μ + 3σ）：{embeddings.threshold3Sigma.toFixed(4)}
              </div>
              <div>
                Outlier 數量：
                {embeddings.points.filter((p) => p.isOutlier).length}
              </div>
            </div>
            <div>{renderEmbeddingScatter()}</div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">
          問答／測驗平均距離與 Outlier
        </h2>
        <p className="text-sm text-gray-400">
          根據每一筆回答所命中的文件距離，計算平均距離並以 3 個標準差判斷是否為 outlier。
          可以用來觀察哪些問答或測驗題可能缺乏足夠的知識支撐。
        </p>
        <button
          className="inline-flex items-center px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-sm text-white disabled:opacity-50"
          onClick={loadQaStats}
          disabled={qaLoading}
        >
          {qaLoading ? "載入中…" : "載入最近問答統計"}
        </button>

        {qaStats && (
          <div className="space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>
                問答筆數：
                {qaStats.count}
              </div>
              <div>
                平均「平均距離」 μ：
                {qaStats.meanAvgDistance.toFixed(4)}
              </div>
              <div>
                標準差 σ：
                {qaStats.stdAvgDistance.toFixed(4)}
              </div>
              <div>
                3σ 門檻（μ + 3σ）：
                {qaStats.threshold3Sigma.toFixed(4)}
              </div>
              <div>
                Outlier 筆數：
                {qaStats.items.filter((i) => i.isOutlier).length}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-300">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-2 py-1">時間</th>
                    <th className="px-2 py-1">問題（前 20 字）</th>
                    <th className="px-2 py-1">類型</th>
                    <th className="px-2 py-1">平均距離</th>
                    <th className="px-2 py-1">距離範圍</th>
                    <th className="px-2 py-1">Outlier</th>
                  </tr>
                </thead>
                <tbody>
                  {qaStats.items.map((item) => (
                    <tr
                      key={item.id}
                      className={
                        "border-b border-gray-800" +
                        (item.isOutlier ? " bg-red-900/20" : "")
                      }
                    >
                      <td className="px-2 py-1">
                        {new Date(item.ts).toLocaleString()}
                      </td>
                      <td className="px-2 py-1">
                        {item.question.slice(0, 20)}
                      </td>
                      <td className="px-2 py-1">
                        {item.isQuiz ? "測驗" : "一般問答"}
                      </td>
                      <td className="px-2 py-1">
                        {item.avgDistance.toFixed(4)}
                      </td>
                      <td className="px-2 py-1">
                        {item.minDistance.toFixed(3)}~
                        {item.maxDistance.toFixed(3)}
                      </td>
                      <td className="px-2 py-1">
                        {item.isOutlier ? "是" : "否"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

