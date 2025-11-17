# 16｜部署 cloud-app（Vercel 或 Render，二擇一）

本文件說明如何把 `cloud-app/` 部署到雲端，提供 LINE Webhook 與管理介面（/admin）。你只需要擇一平台部署即可：Vercel 或 Render。

## 選擇平台
- Vercel（預設建議）
  - 優點：Next.js 原生、設定最少、Webhook 路徑可直接使用。
  - 適用：一般 RAG + LINE Webhook 場景。
- Render（替代方案）
  - 優點：傳統常駐 Node 服務、較寬鬆的執行時間。
  - 適用：需要較長任務或進程層控制時。

## 必要環境變數（兩平台相同）
- 基本
  - `ADMIN_TOKEN`（管理頁存取權杖）
  - `GEMINI_API_KEY`（Google AI Studio 金鑰）
  - `EMBED_MODEL`（預設 `text-embedding-004`）
  - `GEN_MODEL`（預設 `gemini-2.5-flash`）
  - `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`
- 向量庫（預設 Qdrant）
  - `VECTOR_BACKEND=qdrant`
  - `QDRANT_URL`、`QDRANT_API_KEY`、`QDRANT_COLLECTION=workshop_rag_docs`
- 對話紀錄（預設關閉，可改 atlas-driver/atlas/pg/mysql/supabase）
  - `LOG_PROVIDER=none`（預設）或改為 `atlas-driver` / `atlas` / `pg` / `mysql` / `supabase`
  - 若 `atlas-driver`：`MONGODB_URI`、`MONGODB_DB`（可選集合名 `MONGODB_COLLECTION_*`）
  - 若 `atlas`：`ATLAS_DATA_API_BASE`、`ATLAS_DATA_API_KEY`、`ATLAS_DATA_SOURCE`、`ATLAS_DATABASE`、`ATLAS_COLLECTION`、`ATLAS_SEARCH_INDEX`
  - 若 `pg`：`DATABASE_URL`；若 `mysql`：`MYSQL_URL`；若 `supabase`：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`

- （可選）委外回答給你的後端
  - `ANSWER_WEBHOOK_URL`、`ANSWER_WEBHOOK_TOKEN`、`ANSWER_WEBHOOK_TIMEOUT_MS=15000`

重要：GitHub Codespaces 的 Secrets 僅用於 Codespaces 內部開發與腳本，並不會自動同步到 Vercel/Render。部署到雲端後，務必在「部署平台專案」再次填入上述環境變數。

## 部署到 Vercel（推薦）
1) 新建專案
- 在 Vercel Dashboard → Add New → Project → Import Git Repository
- Root Directory 設為 `cloud-app/`

2) 設定環境變數（Project Settings → Environment Variables）
- 填入「必要環境變數」章節所列鍵值（若尚未設定對話紀錄後端，將 `LOG_PROVIDER` 設為 `none`）

3) Node 版本固定（避免自動升級造成相容性問題）
- 本專案已設定：`cloud-app/package.json` → `engines.node=20.x`；`cloud-app/vercel.json` → `NODE_VERSION=20`

4) 部署完成後
- 管理頁：`https://<your-app>.vercel.app/admin`（先輸入 `ADMIN_TOKEN`）
- Webhook：LINE 後台設定 `https://<your-app>.vercel.app/api/line-webhook`
- 健康檢查：`/admin/setup`（可勾選 DB 測試）

## 部署到 Render（替代）
1) 建立 Web Service
- 以 `cloud-app/render.yaml` 建立服務或從 Dashboard 新建 Web Service
- Build：`npm install && npm run build`；Start：`npm start`

2) 設定環境變數（Service → Environment）
- 填入「必要環境變數」章節所列鍵值

3) 部署完成後
- 管理頁：`https://<service>.onrender.com/admin`
- Webhook：LINE 後台設定 `https://<service>.onrender.com/api/line-webhook`
- 健康檢查：`/admin/setup`

4) 設定 Keep-Alive（避免休眠）
- Render 免費方案 15 分鐘無活動會休眠
- 方法 1：使用專案內建的 GitHub Actions（見專案根目錄 `.github/workflows/keep-render-alive.yml`）
  - 到 GitHub repo → Settings → Secrets → Actions → New secret
  - Name: `RENDER_SERVICE_URL`，Value: `https://<service>.onrender.com`
  - Actions 會每 10 分鐘自動 ping `/api/health`
- 方法 2：使用外部監控服務（UptimeRobot、Cron-job.org 等）
  - 設定 HTTP 監控，URL: `https://<service>.onrender.com/api/health`
  - 間隔: 10-14 分鐘

## 方案 B：Vercel + Render 混合架構（推薦免費方案）

Vercel 免費方案執行時間限制 10 秒，RAG 流程可能超時。建議採用混合架構：
- **Vercel（前端）**：處理 LINE webhook 驗簽、轉發請求（< 3 秒）
- **Render（後端）**：處理 RAG 運算（無時間限制，免費 850 小時/月）

### 架構流程
```
LINE 用戶 → Vercel (驗簽 + 轉發) → Render (RAG 處理) → 回覆
         ↓ (Render 故障時)
         → Vercel 本地 RAG (fallback)
```

### 部署步驟

#### 步驟 1：部署 Render（RAG 後端）
1. Render Dashboard → New Web Service → Connect GitHub
2. Root Directory: `cloud-app`
3. 環境變數設定（完整 RAG 變數）：
   ```
   ADMIN_TOKEN=你的強密碼
   GEMINI_API_KEY=你的key
   EMBED_MODEL=gemini-embedding-001
   EMBED_DIM=768
   GEN_MODEL=gemini-2.5-flash
   QDRANT_URL=你的qdrant網址
   QDRANT_API_KEY=你的key
   QDRANT_COLLECTION=workshop_rag_docs
   VECTOR_BACKEND=qdrant
   TOPK=6
   SCORE_THRESHOLD=0.1
   NUM_CANDIDATES=400
   LOG_PROVIDER=none
   ```
4. Deploy → 取得網址：`https://rag-backend-xxx.onrender.com`
5. 設定 Keep-Alive（見上述方法）

#### 步驟 2：部署 Vercel（Webhook 前端）
1. Vercel Dashboard → New Project → Import Git Repository
2. Root Directory: `cloud-app`
3. 環境變數設定（**輕量設定，僅 LINE + 委外**）：
   ```
   # 基本
   ADMIN_TOKEN=你的強密碼（與 Render 相同）
   
   # LINE
   LINE_CHANNEL_SECRET=你的secret
   LINE_CHANNEL_ACCESS_TOKEN=你的token
   
   # 委外到 Render（關鍵設定）
   ANSWER_WEBHOOK_URL=https://rag-backend-xxx.onrender.com/api/test
   ANSWER_WEBHOOK_TOKEN=你的強密碼（與 ADMIN_TOKEN 相同）
   ANSWER_WEBHOOK_TIMEOUT_MS=30000
   ```
   
   **注意**：Vercel **不需要**填入 `GEMINI_API_KEY`、`QDRANT_*` 等變數（由 Render 處理）

4. Deploy

#### 步驟 3：LINE Webhook 設定
- LINE Developers Console → Webhook URL: `https://<your-app>.vercel.app/api/line-webhook`
- 測試驗證：送訊息到 LINE bot，確認回覆正常

### 容錯機制

系統內建自動降級：
- ✅ Render 正常：Vercel 轉發到 Render 處理
- ⚠️ Render 超時/故障：Vercel 自動回退到本地 RAG
- 建議：如需完整容錯，在 Vercel 也填入 Gemini + Qdrant 變數

### 優勢比較

| 方案 | Vercel 單機 | Render 單機 | **Vercel + Render** |
|------|------------|------------|-------------------|
| 執行時間限制 | 10 秒 | 無限制 | **無限制** |
| 冷啟動時間 | 無 | 30-60 秒 | **Vercel 快速驗簽** |
| 成本 | 免費 | 免費 | **雙免費** |
| 可靠性 | 中 | 中 | **高（雙備援）** |
| 適合場景 | 輕量 RAG | 完整功能 | **工作坊教學** |

## 部署後操作（全部在 Web 完成）
- 上傳教材：/admin →「上傳教材（檔案上傳）」支援 PDF/TXT/MD/DOCX（可多檔）或「貼上純文字」
- 資料管理：/admin → 刪除來源、重新嵌入來源、清空集合
- 測試問答：/admin → 線上測試（不經 LINE）
- 日誌與追蹤：/admin → 查看流程日誌與對話紀錄

## 常見問題（與環境變數作用域）
- 我已在 Codespaces 填過變數，部署還要再填嗎？
  - 需要。Codespaces Secrets 只對 Codespaces（雲端開發容器）生效；Vercel/Render 需各自填入環境變數。
- GitHub Actions 會自動把 Secrets 帶到 Vercel/Render 嗎？
  - 不會。GitHub Actions 的 Secrets 僅在 CI workflow 中使用；Vercel/Render 仍需分別設定。
- n8n Cloud 呢？
  - n8n 的 Credentials 與變數也需要在 n8n 環境內各自設定，不會與 Vercel/Render 共用。

## 檢查清單
- [ ] 已選擇一個平台（Vercel 或 Render）
- [ ] 已填入雲端平台的環境變數
- [ ] LINE Webhook 指向部署後的 `/api/line-webhook`
- [ ] `/admin/setup` 檢查通過；可在 /admin 上傳教材並完成問答測試

## 【可測試】部署後功能驗收
- 健康檢查：
  - 瀏覽 `https://<your-app>/admin/setup`（勾選 DB 測試）
- API 測試問答（以 ADMIN_TOKEN 呼叫）：
  ```bash
  curl -s -X POST "https://<your-app>/api/test" \
    -H "authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" \
    -d '{"question":"這是測試嗎？"}' | jq .
  ```

---
附錄｜Vercel 常見建置錯誤
- TypeScript 找不到型別（`@types/react`、`@types/node`、`@types/pdf-parse`、`@types/pg`）：已納入 `devDependencies`，若仍提示請檢查 lock 檔與安裝是否成功。
- `ENOENT ./test/data/05-versions-space.pdf`（pdf-parse）：已在 `next.config.mjs` 以 alias 指向核心檔（`pdf-parse/lib/pdf-parse.js`）。
- App Route 在 build 期打到 Atlas 失敗（`APP_ID` 404）：專案已對 `/api/*` 設 `dynamic='force-dynamic'`、`revalidate=0`；同時 Atlas 未設定或仍為占位值時會自動採預設設定/回空陣列，不再中斷建置。
