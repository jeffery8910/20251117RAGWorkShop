# 14｜非 md 檔案使用指南（雲端優先 / Codespaces）

本文件彙整本專案中「非 .md」檔案的作用與使用方式，方便你在雲端（GitHub Codespaces、Vercel、Render、n8n Cloud、Qdrant Cloud）直接操作，不涉及本機環境。

## 一、腳本與資料目錄
- `scripts/ingest-qdrant.ts`
  - 作用：在 Codespaces 或 CI 中，將 `data/` 的教材檔（.md/.txt）做分塊 → 呼叫 Gemini 產生嵌入 → 寫入 Qdrant Cloud Collection。
  - 需求環境變數：`GEMINI_API_KEY`、`QDRANT_URL`、`QDRANT_API_KEY`、（選）`QDRANT_COLLECTION`（預設 `workshop_rag_docs`）
  - 可調參數（環境變數）：`INGEST_GLOB`、`CHUNK_SIZE`、`CHUNK_OVERLAP`
  - Codespaces 安裝依賴（一次）：
    - `npm i @google/generative-ai @qdrant/js-client-rest dotenv globby`
  - 執行：
    - `npx ts-node scripts/ingest-qdrant.ts`
  - 備註：此腳本預設支援 Qdrant。若要寫入 Atlas，請改用 cloud-app Admin 上傳 API（見後述）或自行擴充腳本。

- `data/.gitkeep`
  - 作用：確保版本庫內存在 `data/` 目錄，以便放入教材。把你的 `.md/.txt` 檔直接放到 `data/` 即可（CI 或腳本會讀取）。

## 二、範本與設定（以 Web 操作為主）
- `templates/.env.example`
  - 作用：環境變數樣板（僅供參考）。實務上請在「GitHub Codespaces Secrets、Vercel/Render 專案環境變數」設定，不要把機密寫進檔案。

- `config/keywords.json`
  - 作用：提供 n8n 流程的關鍵字清單（策略 A），作為是否走「固定回覆」或「RAG 流程」的路由依據。
  - 注意：cloud-app 預設的關鍵字清單存放在 Atlas 的 `config` 集合（由 Admin UI 修改）；此 `keywords.json` 主要給 n8n 使用。一般情境請直接在 `/admin` 介面調整，不需 `curl`。

## 三、Codespaces 開發容器
- `.devcontainer/devcontainer.json`、`.devcontainer/Dockerfile`
  - 作用：在 GitHub Codespaces 自動建立 Node.js 20 的開發容器，方便你在雲端直接執行腳本、檢閱程式碼與推送更新。
  - 使用方式：在 GitHub 專案頁 → `Code` → `Codespaces` → `Create codespace on main`，容器啟動後即可使用。

## 四、CI 工作流程（GitHub Actions）
- `.github/workflows/ingest-on-data-changes.yml`
  - 觸發：當 `data/**` 或 `scripts/**` 有變更時。
  - 作用：在雲端 Runner 直接執行 `scripts/ingest-qdrant.ts`，自動把變動教材嵌入到 Qdrant。
  - 需要在「Repository → Settings → Secrets and variables → Actions → Secrets」設定：`GEMINI_API_KEY`、`QDRANT_URL`、`QDRANT_API_KEY`（與 `QDRANT_COLLECTION`）。
  - 注意：此流程使用 `npx ts-node` 執行 TypeScript；若你的組織限制 npx 安裝，請把 `ts-node` 加到 `devDependencies`，或改將腳本轉譯為 JS 再執行。

## 五、雲端 Web App（cloud-app/，Next.js）
- `cloud-app/package.json`
  - 作用：Next.js 專案定義。指令：`npm run dev`、`npm run build`、`npm start`。Node 需 >= 18。

- `cloud-app/.env.local.sample`
  - 作用：環境變數範例。部署到 Vercel/Render 時，請把這些鍵值填入專案的 Environment Variables。
  - 關鍵變數（最小集）：
    - `ADMIN_TOKEN`、`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`
    - `GEMINI_API_KEY`
    - `VECTOR_BACKEND=qdrant`、`QDRANT_URL`、`QDRANT_API_KEY`、`QDRANT_COLLECTION`
    - （對話紀錄儲存）`LOG_PROVIDER` 預設 atlas，需 `ATLAS_DATA_API_*` 等參數；或改 pg/mysql/supabase 並提供對應連線。

- `cloud-app/render.yaml`
  - 作用：Render 一鍵部署設定。建立 Web Service 後，把相同的環境變數填上；Webhook 路徑為 `/api/line-webhook`。

- `cloud-app/next.config.mjs`、`cloud-app/tsconfig.json`
  - 作用：Next.js 與 TypeScript 設定，通常不需更動。

- API 與 Library（重要）
  - `cloud-app/src/lib/gemini.ts`：
    - 使用 `GEMINI_API_KEY` 呼叫 Google AI Studio；`EMBED_MODEL` 預設 `text-embedding-004`、`GEN_MODEL` 預設 `gemini-2.5-flash`。
  - `cloud-app/src/lib/qdrant.ts`：
    - Qdrant REST 客戶端封裝；`QDRANT_URL`、`QDRANT_API_KEY`、`QDRANT_COLLECTION` 必填。
    - 進階操作：`deleteBySource(source)`、`scrollBySource(source)`、`clearCollection()` 提供刪除/重嵌/清空功能。
  - `cloud-app/src/lib/rag.ts`：
    - RAG 主流程（預設 Qdrant，`VECTOR_BACKEND=qdrant`）；若未設 Qdrant 參數，會回退使用 Atlas Vector Search（需 `ATLAS_*` 變數與索引）。
  - `cloud-app/src/lib/mongo.ts`：
    - 透過 Atlas Data API 存取 `config`/`logs`/`conversations` 等集合（若 `LOG_PROVIDER=atlas`）。
  - `cloud-app/src/lib/line.ts`：
    - 驗簽與回覆 LINE Messaging API。需 `LINE_CHANNEL_SECRET` 與 `LINE_CHANNEL_ACCESS_TOKEN`。
  - `cloud-app/src/lib/chunker.ts`：
    - 簡易文字分塊工具（Admin 上傳 API 會用到）。

- API Routes（可用 curl 測試，需 `Authorization: Bearer <ADMIN_TOKEN>`）
  - `cloud-app/src/app/api/line-webhook/route.ts`
    - LINE Webhook 入口；在 LINE Developers 後台設為 Webhook URL。
  - `cloud-app/src/app/api/admin/docs/upload/route.ts`
    - 透過 `/admin` 介面的「檔案上傳」功能呼叫，支援 .pdf/.txt/.md/.docx（自動轉文字與分塊）。
  - `cloud-app/src/app/api/admin/docs/route.ts`
    - 由 `/admin` 介面的「貼上純文字」功能呼叫；同一路徑的 `DELETE ?source=...` 會刪除指定來源的所有分塊。
  - `cloud-app/src/app/api/admin/docs/reembed/route.ts`
    - 重新為指定 `source` 的分塊產生嵌入（Qdrant/Atlas 均支援）。
  - `cloud-app/src/app/api/admin/vector/clear/route.ts`
    - 清空向量集合（Qdrant：刪除 Collection；Atlas：`deleteMany({})`）。
  - `cloud-app/src/app/api/admin/config/route.ts`
    - 讀寫運行設定（Prompt、keywords、TOPK 等）。
  - `cloud-app/src/app/api/admin/logs/route.ts`
    - 讀取流程日誌。
  - `cloud-app/src/app/api/admin/conversations/route.ts`
    - 查詢對話紀錄（可用 `userId`、`channelId`、`q`、`from`、`to`、`limit`）。
  - `cloud-app/src/app/api/admin/conversations/[id]/route.ts`
    - 讀取單筆對話明細。
  - `cloud-app/src/app/api/test/route.ts`
    - 不透過 LINE 的測試問答 API。
  - `cloud-app/src/app/api/health/route.ts`
    - 環境/連線健康檢查（`?withDb=1` 可啟用實際連線測試）。

- Admin UI（管理介面）
  - `cloud-app/src/app/page.tsx`：預設導向 `/admin`。
  - `cloud-app/src/app/admin/page.tsx`：
    - 設定 Admin Token（保存在瀏覽器 localStorage）、編輯 Prompt/關鍵字/參數、上傳教材（純文字）、線上測試、查看流程日誌。
  - `cloud-app/src/app/admin/setup/page.tsx`：
    - 健康檢查（環境變數檢視 + 選擇性 DB/Qdrant 連線測試）。
  - `cloud-app/src/app/admin/conversations/page.tsx`、`[id]/page.tsx`：
    - 對話列表與明細（含 RAG 命中片段分數）。

## 六、資料庫建表腳本（選用）
- `cloud-app/scripts/sql/postgres_conversations.sql`
  - 用途：在 Postgres 建立 `conversations` 表與索引（若 `LOG_PROVIDER=pg`）。
  - 執行：
    - `psql "$DATABASE_URL" -f cloud-app/scripts/sql/postgres_conversations.sql`

- `cloud-app/scripts/sql/mysql_conversations.sql`
  - 用途：在 MySQL 建立 `conversations` 表與索引（若 `LOG_PROVIDER=mysql`）。
  - 執行：
    - `mysql "$MYSQL_URL" < cloud-app/scripts/sql/mysql_conversations.sql`

## 七、媒體資源
- `RAG 工作坊.png`、`RAG 工作坊LANDING.png`
  - 作用：對外宣傳或文件插圖，與系統運行無關。

## 八、部署與路由摘要
- Qdrant（預設）：設定 `QDRANT_URL`、`QDRANT_API_KEY`、（選）`QDRANT_COLLECTION`。
- Gemini：設定 `GEMINI_API_KEY`；模型可用 `EMBED_MODEL=text-embedding-004`、`GEN_MODEL=gemini-2.5-flash`。
- LINE Webhook：在 LINE Developers 指向你的部署 `/api/line-webhook`。
- 對話紀錄：預設 `LOG_PROVIDER=atlas`，亦可切換 `pg/mysql/supabase` 並套用對應建表腳本。
- 透過 Admin：
  1) `/admin` 設定 Prompt/關鍵字與上傳教材
  2) `/admin/setup` 檢查環境與連線
  3) `/admin/conversations` 檢視對話與命中片段

## 九、安全建議
- 機密一律放在雲端環境變數（Codespaces Secrets、Vercel/Render Env）。
- 啟用 LINE 簽名驗證（已內建於 Webhook Route）。
- 若同時使用 LINE 內建關鍵字回覆與後端 RAG，請依文件 `docs/08-keyword-and-rag-routing.md` 配置去重邏輯。

---
若需我幫你產生可「直接匯入 n8n」的 workflow JSON（Webhook → 驗簽 → Embedding → Qdrant 搜尋 → Gemini 生成 → LINE 回覆），告訴我，我會新增 `n8n/workflows/line-rag-qdrant.json` 與 `n8n/README.md`。
