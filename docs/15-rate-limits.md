# 15｜Google AI（Gemini）免費額度與速率限制

本文件聚焦「Google AI Studio（Gemini）」的免費額度遵循做法，不修改其他供應商。實際配額可能變動，請以 Google 後台顯示為準，並在環境變數填入相符的限制值。

## A. 雲端 App（cloud-app）層
- 目的：限制 Gemini 的呼叫頻率與並發，並對 429/503 實作退避重試。
- 已內建：`src/lib/ratelimit.ts` + `src/lib/gemini.ts`
  - 環境變數（請依你的免費額度填值）：
    - `GEMINI_RPS`、`GEMINI_RPM`、`GEMINI_MAX_CONCURRENCY`
    - `GLOBAL_RETRY_MAX`、`GLOBAL_RETRY_BASE_MS`、`GLOBAL_RETRY_MAX_DELAY_MS`
  - 套用位置：
    - 嵌入與生成皆走 `limitedJsonPost('gemini', ...)`，自動根據上列變數限速與退避。
  - 提醒：若平台自動水平擴展，這是「單實例軟限制」。如需全域嚴格限速，請額外使用外部 KV/Redis 實作分散式限速器。

## B. Ingest 腳本（scripts/ingest-qdrant.ts）層（僅針對 Gemini）
- 目的：批次嵌入時避免 429。
- 提供環境變數：
  - `EMBED_DELAY_MS`：每次呼叫嵌入前延遲（毫秒）。
- 建議：先以 `EMBED_DELAY_MS=200` 起步，視 429 情況調整；或減少一次處理的分塊數量（降低 `CHUNK_SIZE` / 提高 `CHUNK_OVERLAP`）。

## C. n8n Workflow 層（選配）
- 單訊息通常只有 2–3 次 Gemini 呼叫（Embed/Generate）。
- 若瞬時量偏高，可在 Gemini 相關的 HTTP 節點前加入 `Wait` 節點（100–300ms）以拉開請求間距。

## D. 操作建議
- 從保守值開始（RPS/RPM/並發 1），觀察 429/延遲情況，再逐步上調。
- 監控 429/503：一旦發生，提升 `EMBED_DELAY_MS`、下調 `GEMINI_RPS/RPM` 或 `GEMINI_MAX_CONCURRENCY`。

---
若需要我為你的實際免費額度（RPS/RPM）預先填入 `.env` 範例，請提供你帳號後台顯示的限制，我會幫你對應更新。
