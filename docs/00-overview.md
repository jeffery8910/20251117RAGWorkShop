# 00｜總覽（架構 × 部署 × 環境變數 × 測試）

本文件將原先分散於多個 Overview 檔（架構、環境變數等）整併為單一入口，提供雲端優先的一條龍指引：從架構概念、環境變數取得來源、部署方式，到可立即執行的「可測試」步驟。

## 1) 目標與成果
- 打造可獨立運作的 RAG × LINE Chatbot：上傳教材 → 產生嵌入 → 向量檢索 → 回覆到 LINE。
- 完全雲端：開發在 GitHub Codespaces；部署在 Vercel 或 Render（二擇一）。
- 「管理頁 /admin」即可完成檔案上傳（PDF/TXT/MD/DOCX）、分塊、嵌入、刪除、重嵌、清空集合與線上測試，無需終端機。
- n8n 屬「可選」外掛，用於可視化編排與進階整合（見「8) n8n 可選部署」）。

## 2) 架構與元件
- LLM 與嵌入：Google AI Studio（Gemini；預設生成 `gemini-2.5-flash`、嵌入 `gemini-embedding-001`）。
- 向量庫（預設）：Qdrant Cloud（可改 Atlas Vector Search）。
- Web 服務：cloud-app（Next.js；/api/line-webhook、/admin）。
- LINE：Messaging API 作為訊息入口與回覆。
- Codespaces：雲端開發環境與（選配）批次腳本執行。

資料流（簡化）
1. 在 /admin 上傳教材（或貼文字）→ 伺服器分塊 → Gemini 產生嵌入 → 寫入 Qdrant/Atlas。
2. 使用者於 LINE 發問 → cloud-app 產生查詢向量 → 向量庫 Top‑K 檢索 → 帶 Context 給 Gemini 生成 → 回覆 LINE。

## 3) 部署選擇（擇一）
- Vercel（預設）：Next.js 原生、設定簡易、Webhook 路徑可直接用。
- Render（替代）：常駐 Node 進程、執行時間較寬鬆。
- 詳細步驟：見 docs/16-cloud-app-deploy.md。

## 4) 環境變數總覽與取得來源
（完整細節與可測試片段，見 docs/00-overview-env.md）
- 必填（最小集）
  - `ADMIN_TOKEN`：自訂強密碼（/admin 管理頁）。
  - `GEMINI_API_KEY`：Google AI Studio → Projects → API Keys。
  - `EMBED_MODEL` / `GEN_MODEL`（預設：`gemini-embedding-001` / `gemini-2.5-flash`）。
  - `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN`：LINE Developers。
  - `VECTOR_BACKEND`：預設 `qdrant`。
  - `QDRANT_URL` / `QDRANT_API_KEY` / `QDRANT_COLLECTION`：Qdrant Cloud 叢集頁面。
- 對話紀錄（擇一）：`LOG_PROVIDER=atlas|pg|mysql|supabase`，並依 Provider 填各自連線鍵（Atlas Data API、DATABASE_URL、MYSQL_URL、SUPABASE_*）。
- 進階（Gemini 免費層軟限；僅影響 Gemini 呼叫端）
  - 生成：`GEMINI_GEN_RPM=10`、`GEMINI_GEN_MAX_CONCURRENCY=1`
  - 嵌入：`GEMINI_EMBED_RPM=100`、`GEMINI_EMBED_MAX_CONCURRENCY=1`
  - 退避：`GLOBAL_RETRY_MAX=4`、`GLOBAL_RETRY_BASE_MS=500`、`GLOBAL_RETRY_MAX_DELAY_MS=5000`

Secrets 作用域提醒
- GitHub Codespaces Secrets 僅在 Codespaces 容器內有效；不會自動同步到 Vercel/Render。
- 部署到 Vercel/Render 後，務必在各平台專案再次填入環境變數。

## 5) 管理頁 /admin 功能
- 檔案上傳（多檔）：支援 PDF/TXT/MD/DOCX；可設定分塊大小與重疊。
- 貼上純文字：輸入來源檔名與內容即可嵌入。
- 資料管理：刪除指定來源、重新嵌入指定來源、清空整個向量集合（皆含安全確認）。
- 線上測試（不經 LINE）：直接在頁面測試 RAG 回覆。
- 日誌與對話紀錄：檢視流程日誌與入出站訊息；支援條件過濾。

## 6) 工作流程（雲端與 UI 為主）
- 上傳教材 → 分塊/嵌入 → 寫入向量庫 → 線上測試。
- 需要批次或 CI 自動嵌入時，再用 Codespaces/Actions 執行 `scripts/ingest-qdrant.ts`（見 docs/05）。

## 7) 速率限制（Gemini；免費層指引）
- 預設通道已分離：生成（2.5 Flash）與嵌入（Embedding）。
- 建議起始值：`GEMINI_GEN_RPM=10`、`GEMINI_EMBED_RPM=100`、並發皆設 1；依實際配額再微調。
- 批次嵌入：用 `EMBED_DELAY_MS` 控制節奏（估算 RPM→每請求間隔 ≈ 60,000/RPM ms）。

## 8) n8n 可選部署（與 cloud-app 分離）
- 非必要；僅在需要可視化編排、排程、串接 CRM/報表時再用。
- 建議部署在 Render 或 n8n Cloud（Vercel 不適合長駐進程）。
- 整合模式：
  - A 純 cloud-app：Webhook 指向 cloud-app。
  - B Webhook 指向 n8n：全部在 n8n 流程處理。
  - C cloud-app 驗簽後再轉發到 n8n（建議；可加轉發開關）。
- 參見 docs/17-n8n-optional-deploy.md 與範例 workflow：`n8n/workflows/line-rag-qdrant.json`。

## 9) 安全建議
- 任何金鑰與憑證一律以環境變數保存；不要提交到版本庫。
- 嚴格驗簽：cloud-app 的 `/api/line-webhook` 已內建 LINE 簽名驗證。
- 提示注入防護：上下文加來源標記；限制 System Prompt 權限範圍。

## 10) 【可測試】快速檢查清單
- Gemini Key（curl 嵌入僅印向量長度）：見 docs/02-google-ai-studio-api-key.md。
- Qdrant 端點（列出 collections）：見 docs/03-qdrant-cloud-setup.md。
- Atlas Data API（aggregate limit 1）：見 docs/03b-mongodb-atlas-vector-search.md。
- 部署驗收：見 docs/16-cloud-app-deploy.md（/admin/setup、/api/test）。

—
補充：原先的 Overview 拆分檔已整併至本檔；若需更細節步驟與圖文說明，請依序閱讀 `/docs` 其餘章節。
