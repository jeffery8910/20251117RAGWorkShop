# 00（補）｜環境變數總覽與取得來源（.env 指南）

本表整理 cloud-app 與工作坊相關的所有環境變數，並標註去哪裡取得或如何設定。完整總覽請以 docs/00-overview.md 為主；本檔保留作速查。

- 最小必填（cloud-app 運行）
  - `ADMIN_TOKEN`
    - 自行設定強密碼；用於 `/admin` 管理頁。
  - `GEMINI_API_KEY`
    - Google AI Studio → Projects → API Keys → Create API key。見 docs/02-google-ai-studio-api-key.md。
  - `EMBED_MODEL`、`GEN_MODEL`
    - 預設 `text-embedding-004`、`gemini-2.5-flash`，可維持預設。
  - `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`
    - LINE Developers → Messaging API Channel：Secret 在 Basic settings；Access token 於 Messaging API 頁籤 Issued。見 docs/07-line-developers-setup.md。
  - `VECTOR_BACKEND`
    - 預設 `qdrant`（採 Qdrant Cloud）。
  - `QDRANT_URL`、`QDRANT_API_KEY`、`QDRANT_COLLECTION`
    - Qdrant Cloud Console：Cluster 詳情頁取得 REST 端點（URL）與 API Key；集合名可自訂（例 `workshop_rag_docs`）。見 docs/03-qdrant-cloud-setup.md。

- 對話紀錄儲存（擇一，預設關閉）
  - `LOG_PROVIDER=none`（預設）
  - `ATLAS_DATA_API_BASE`：App Services 啟用 Data API 後的 Base URL（通常以 `/action` 結尾）
  - `ATLAS_DATA_API_KEY`：App Services → API Keys 建立
  - `ATLAS_DATA_SOURCE`：例 `Cluster0`
  - `ATLAS_DATABASE`、`ATLAS_COLLECTION`：例 `ragdb`、`docs`
  - `ATLAS_SEARCH_INDEX`：例 `vector_index`
  - 參考 docs/03b-mongodb-atlas-vector-search.md
  - 或（推薦）`LOG_PROVIDER=atlas-driver`（直連 Atlas，不走 Data API）
    - `MONGODB_URI`、`MONGODB_DB`
    - （可選）`MONGODB_COLLECTION_LOGS`、`MONGODB_COLLECTION_CONVERSATIONS`、`MONGODB_COLLECTION_CONFIG`
  - `LOG_PROVIDER=pg`
    - `DATABASE_URL`：Postgres 連線 URI（Vercel Postgres/Neon 提供）
  - `LOG_PROVIDER=mysql`
    - `MYSQL_URL`：MySQL 連線 URI（PlanetScale 提供）
  - `LOG_PROVIDER=supabase`
    - `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`：Supabase Project → Settings → API

- 進階（可選）
  - Gemini 免費層軟性速率限制（僅 Gemini 端會使用）
    - 2.5 Flash（生成）：`GEMINI_GEN_RPM=10`、`GEMINI_GEN_MAX_CONCURRENCY=1`
    - Embedding：`GEMINI_EMBED_RPM=100`、`GEMINI_EMBED_MAX_CONCURRENCY=1`
    - 通用退避：`GLOBAL_RETRY_MAX=4`、`GLOBAL_RETRY_BASE_MS=500`、`GLOBAL_RETRY_MAX_DELAY_MS=5000`
  - 若向量庫改 Atlas Vector Search：把 `VECTOR_BACKEND` 改為非 `qdrant`，並填妥 Atlas 相關變數與向量索引。
  - 若要將回答委外到你的後台：
    - `ANSWER_WEBHOOK_URL`、`ANSWER_WEBHOOK_TOKEN`、`ANSWER_WEBHOOK_TIMEOUT_MS=15000`
  - Embedding 維度（避免 Qdrant 維度不符 Bad Request）
    - `EMBED_DIM`：使用 `gemini-embedding-001` 時可設為 `768` 與 `text-embedding-004` 對齊；若改模型，務必與既有 Collection 維度一致，或先在 /admin 清空集合後重新上傳。

提示
- GitHub Codespaces 的 Secrets 不會自動同步到 Vercel/Render；部署後仍須在平台專案填入（見 docs/16-cloud-app-deploy.md）。
- 可直接參考 `cloud-app/.env.local.sample` 的鍵名與說明，再複製到雲端平台設定。

【可測試】部署前快速自查
- Gemini Key：見 docs/02-google-ai-studio-api-key.md 的「【可測試】」段落（curl 嵌入僅輸出向量長度）
- Qdrant 端點：見 docs/03-qdrant-cloud-setup.md（curl `/collections`）
- Atlas Data API：見 docs/03b-mongodb-atlas-vector-search.md（aggregate limit 1）
