# 14．非 md 檔案與其他支援檔（Scripts / Codespaces 等）

這一篇說明 repo 裡除了 `.md` 知識庫之外，與 cloud-app / Qdrant / CI 有關的其他檔案要怎麼用。  
重點是：**向量資料一律走 Qdrant + Gemini**，不再使用 Atlas Data API。

---

## 一．批次建庫腳本與資料目錄

- `scripts/ingest-qdrant.ts`
  - 功能：在 Codespaces 或 CI 內執行，將 `data/` 下面的 `.md/.txt` 等文字檔：
    1. 切成 chunks  
    2. 呼叫 Gemini 產生 embedding  
    3. 寫入 Qdrant Cloud Collection
  - 需要的環境變數：
    - `GEMINI_API_KEY`
    - `QDRANT_URL`
    - `QDRANT_API_KEY`
    - 可選：`QDRANT_COLLECTION`（預設 `workshop_rag_docs`）
  - 可調參數（同樣透過環境變數）：
    - `INGEST_GLOB`、`CHUNK_SIZE`、`CHUNK_OVERLAP`
  - 在 Codespaces 預設已安裝好：
    - `@google/generative-ai`、`@qdrant/js-client-rest`、`dotenv`、`globby`
  - 執行方式：
    - `npx ts-node scripts/ingest-qdrant.ts`

- `data/.gitkeep`
  - 目的：確保 repo 裡永遠有 `data/` 目錄（空資料也可以 commit）。
  - 之後只要把 `.md/.txt` 丟進 `data/`，CI / scripts 即可讀取。

---

## 二．設定檔與環境變數模板

- `templates/.env.example`
  - 用途：列出開發 / 部署會用到的環境變數 Key，作為設定時的參考。
  - 建議做法：把需要的 key 複製到：
    - GitHub Codespaces Secrets
    - Vercel / Render 的 Environment Variables

- `config/keywords.json`
  - 用途：給 n8n workflow 使用的關鍵字設定檔（例如固定文案、流程路由）。
  - cloud-app 本身的關鍵字設定，建議直接在 `/admin` → 系統設定裡管理，不必改 `keywords.json`。

---

## 三．Codespaces 開發環境

- `.devcontainer/devcontainer.json`、`.devcontainer/Dockerfile`
  - 用途：在 GitHub Codespaces 自動建立 Node.js 20 的開發容器。
  - 好處：
    - 一鍵開環境就能跑 `npm run dev`、`npx ts-node ...` 等指令。
  - 使用方式：
    - 在 GitHub Repo 頁面 → `Code` → `Codespaces` → `Create codespace on main`。

---

## 四．CI 工作流程（GitHub Actions）

- `.github/workflows/ingest-on-data-changes.yml`
  - 觸發條件：`data/**` 或 `scripts/**` 有變更。
  - 行為：
    - 在 Runner 內執行 `scripts/ingest-qdrant.ts`，自動把最新的知識庫內容寫入 Qdrant。
  - 所需 Secrets：
    - `GEMINI_API_KEY`
    - `QDRANT_URL`
    - `QDRANT_API_KEY`
    - 建議加上 `QDRANT_COLLECTION`

---

## 五．cloud-app Web App（Next.js）

- `cloud-app/package.json`
  - 定義 Next.js 專案與常用 script：
    - `npm run dev`
    - `npm run build`
    - `npm start`
  - Node 版本建議 >= 18（工作坊建議用 20）。

- `cloud-app/.env.local.sample`
  - 用途：示範 cloud-app 所需的環境變數。
  - 常見鍵值：
    - `ADMIN_TOKEN`、`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`
    - `GEMINI_API_KEY`
    - `VECTOR_BACKEND=qdrant`、`QDRANT_URL`、`QDRANT_API_KEY`、`QDRANT_COLLECTION`
    - `LOG_PROVIDER=none`（預設關閉對話紀錄；若改為 `atlas-driver` / `pg` / `mysql` / `supabase`，請依各自說明加上 `MONGODB_URI`、`DATABASE_URL` 等）

- `cloud-app/render.yaml`
  - 用途：Render 的部署設定檔，用來建立 Web Service。
  - 內含：
    - build command：`npm install && npm run build`
    - start command：`npm start`
    - 會將 Webhook 路徑指到 `/api/line-webhook`。

- `cloud-app/next.config.mjs`、`cloud-app/tsconfig.json`
  - 分別對應 Next.js 與 TypeScript 的設定。

---

## 六．API 與 Library（關鍵檔案索引）

- `cloud-app/src/lib/gemini.ts`
  - 使用 `GEMINI_API_KEY` 呼叫 Google AI Studio。
  - `EMBED_MODEL` 預設 `text-embedding-004`，`GEN_MODEL` 預設 `gemini-2.5-flash`。

- `cloud-app/src/lib/qdrant.ts`
  - 包裝 Qdrant REST API：`QDRANT_URL`、`QDRANT_API_KEY`、`QDRANT_COLLECTION`。
  - 提供常用操作：
    - `ensureCollection`、`upsertPoints`
    - `search`
    - `deleteBySource(source)`、`scrollBySource(source)`、`clearCollection()`

- `cloud-app/src/lib/rag.ts`
  - RAG 主流程（使用 Qdrant 作為向量庫）。
  - 本工作坊路線只支援 `VECTOR_BACKEND=qdrant`，不再教學 Atlas Vector Search / Data API。

- `cloud-app/src/lib/mongo.ts` / `cloud-app/src/lib/atlas-driver.ts`
  - 提供設定 / 日誌 / 對話紀錄的儲存選項（MongoDB Driver）。
  - 對工作坊而言屬「進階選配」，主線可以只用 `LOG_PROVIDER=none`。

- `cloud-app/src/lib/line.ts`
  - 封裝 LINE Messaging API 收發邏輯，使用 `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`。

- `cloud-app/src/lib/chunker.ts`
  - 將原始文字切成 chunks，提供給 embedding 與建索引流程使用。

---

## 七．API Routes（可用 curl 測試，需帶 ADMIN_TOKEN）

> 以下 route 多數需要 `Authorization: Bearer <ADMIN_TOKEN>` header。

- `cloud-app/src/app/api/line-webhook/route.ts`
  - LINE Webhook 入口，需在 LINE Developers 裡把 Webhook URL 指到這裡。

- `cloud-app/src/app/api/admin/docs/upload/route.ts`
  - 對應 `/admin` 裡的「檔案上傳」功能，可上傳 `.pdf/.txt/.md/.docx`，自動抽取文字並寫入 Qdrant。

- `cloud-app/src/app/api/admin/docs/route.ts`
  - 對應 `/admin` 的「貼上文字」功能，也支援 `DELETE ?source=...` 以來源刪除整批資料。

- `cloud-app/src/app/api/admin/docs/reembed/route.ts`
  - 重新對某個 `source` 的文件做 embedding 並更新向量（例如換 model 時使用）。

---

## 八．常見誤解說明

- 「對話紀錄一定要 Atlas Data API 嗎？」  
  - 否。本工作坊完全不使用 Atlas Data API，也不需要任何 `ATLAS_DATA_API_*` 的環境變數。  
  - 若要用 MongoDB，只需走 Driver：`LOG_PROVIDER=atlas-driver` 搭配 `MONGODB_URI`、`MONGODB_DB`。

- 「為什麼還看到 Atlas 相關檔名？」  
  - 某些程式檔名如 `atlas-driver.ts` 只是沿用歷史命名，實作已改為 Driver 版本，與 Data API 無關。  
  - 所有教學步驟都以 Qdrant + Gemini 為主線，Mongo 只做設定 / 日誌儲存的補充選項。
