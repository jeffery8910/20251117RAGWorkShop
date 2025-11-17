# 16．部署 cloud-app（Vercel 或 Render，一台就夠）

這一篇說明怎麼把 `cloud-app/` 部署成可對外服務的 RAG x LINE Webhook + 後台。  
重點：本路線使用 **Qdrant + Gemini**，不使用 Atlas Data API。

---

## 部署架構概念

- Vercel（預設建議）
  - 適合 Next.js App Router
  - Webhook URL 簡單、支援自動憑證與 CI
  - 一台就能同時跑 LINE Webhook + `/admin` 後台
- Render（備選）
  - 比較「傳統」的 Node Web Service
  - 適合長時間運行與客製 Keep-Alive

工作坊建議：**選一個平台就好**，不要同時部署兩邊，以免環境變數/ Webhook 搞混。

---

## 必要環境變數（兩邊都一樣）

- 基本
  - `ADMIN_TOKEN`（後台管理密碼，用於 `/admin` 登入）
  - `GEMINI_API_KEY`（Google AI Studio API Key）
  - `EMBED_MODEL`（預設 `text-embedding-004`）
  - `GEN_MODEL`（預設 `gemini-2.5-flash`）
  - `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`

- 向量庫（Qdrant）
  - `VECTOR_BACKEND=qdrant`
  - `QDRANT_URL`
  - `QDRANT_API_KEY`
  - `QDRANT_COLLECTION=workshop_rag_docs`（可改，但建議先照此名稱）

- 對話紀錄（選配：預設關閉）
  - 預設值：`LOG_PROVIDER=none`
  - 若使用 MongoDB Atlas（Driver）：
    - `LOG_PROVIDER=atlas-driver`
    - `MONGODB_URI`
    - `MONGODB_DB`
    - 可加：`MONGODB_COLLECTION_LOGS`、`MONGODB_COLLECTION_CONVERSATIONS`、`MONGODB_COLLECTION_CONFIG`
  - 若使用 Postgres：
    - `LOG_PROVIDER=pg`
    - `DATABASE_URL`
  - 若使用 MySQL：
    - `LOG_PROVIDER=mysql`
    - `MYSQL_URL`
  - 若使用 Supabase：
    - `LOG_PROVIDER=supabase`
    - `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`

- 其他可選
  - `ANSWER_WEBHOOK_URL`、`ANSWER_WEBHOOK_TOKEN`、`ANSWER_WEBHOOK_TIMEOUT_MS=15000`

> 提醒：  
> 本文件與整個工作坊流程都不再使用任何 `ATLAS_DATA_API_*` 相關變數。

---

## 在 Vercel 部署

1. 匯入 Git 專案
   - 在 Vercel Dashboard → `Add New` → `Project` → `Import Git Repository`
   - 若 cloud-app 是整個 repo 的 root，Root Directory 設為 `.`（預設即可）。

2. 設定 Environment Variables
   - 到專案頁 → `Settings` → `Environment Variables`
   - 將上面「必要環境變數」一節列出的 key/value 全部填入（至少先填基本與 Qdrant）。
   - 若暫時不打算開啟對話紀錄，`LOG_PROVIDER` 設為 `none`。

3. 指定 Node 版本（避免 22 帶來的相容性問題）
   - 在 `cloud-app/package.json` 裡：
     - `"engines": { "node": "20.x" }`
   - 或在 Vercel 介面設置 `NODE_VERSION=20`。

4. 觸發第一次 Deploy
   - 回到 `Deployments`，重新 Deploy 一次（必要時勾 `Clear build cache`）。
   - 部署成功後，先記下你的 URL，例如：`https://your-app.vercel.app`。

5. 驗證
   - 後台網址：`https://your-app.vercel.app/admin`  
     - 第一次會要求輸入 `ADMIN_TOKEN`。
   - 健康檢查：`https://your-app.vercel.app/admin/setup`
     - 檢查 Qdrant / Gemini / LINE 等設定是否就緒。

---

## 在 Render 部署

1. 建立 Web Service
   - 在 Render Dashboard → `New` → `Web Service`
   - 指定 Git repo，根目錄為 `cloud-app/` 或你實際使用的路徑。
   - Build Command：`npm install && npm run build`
   - Start Command：`npm start`

2. 設定 Environment
   - Service → `Environment`
   - 將與 Vercel 相同的一組環境變數填入。

3. 驗證
   - 後台網址：`https://<service>.onrender.com/admin`
   - Webhook：`https://<service>.onrender.com/api/line-webhook`
   - 健康檢查：`/admin/setup`

4. Keep-Alive（可選）
   - Render 免費方案 15 分鐘無流量會休眠，可視需要：
     - 使用內建 GitHub Actions workflow（例如 `keep-render-alive.yml`）定期 ping `/api/health`。
     - 或使用 UptimeRobot / Cron-job.org 等外部服務。

---

## 雙平台協作（進階，可略過）

若你真的需要「Vercel + Render」一起用，可以考慮：

- Vercel：只收 LINE Webhook、做輕量轉發
- Render：跑 RAG、長時間計算（例如大量 PDF ingest）

範例架構：

```text
LINE → Vercel (接 webhook + 驗簽) → Render (RAG API) → LINE
      ↘ fallback：Vercel 本機 RAG（若 Render 掛掉）
```

但對工作坊而言，**單一平台就夠**，建議先把一台服務用穩。

---

## 部署後常見操作

- `/admin` → 檔案上傳
  - 上傳 `.pdf/.txt/.md/.docx`，會自動切段 + 嵌入 + 寫入 Qdrant。
- `/admin` → 貼上文字
  - 適合貼 FAQ / 簡短說明，不需另外存成檔案。
- `/admin` → 向量管理 / 清空向量庫
  - 若調整 EMBED_MODEL 或 Qdrant 維度，可在這裡清空後重新上傳。
- `/admin` → 對話紀錄
  - 查看 LINE 來往訊息與 RAG 命中來源。

---

## 最後檢查清單

- [ ] 至少選好一個部署平台（Vercel 或 Render）
- [ ] 所有必要環境變數都已填入
- [ ] LINE Webhook 指向 `<your-app>/api/line-webhook`
- [ ] `/admin/setup` 顯示各服務狀態都 OK
- [ ] `/admin` 能上傳知識庫並完成一次測試問答
