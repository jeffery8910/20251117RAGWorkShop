# 一頁式部署與設定指南（LINE × RAG × Qdrant）

本文件從零開始，帶你把本專案部署到雲端、接上 LINE、上傳教材並完成測試。若只看一份文件，請看這份即可。

---

## 0. 你需要先準備
- 一個 Vercel 專案（Root Directory 指向 `cloud-app/`）
- 一個 LINE Messaging API Channel（可在 LINE Developers 申請）
- Qdrant Cloud 叢集（或自架 Qdrant）
- Google AI Studio API Key（Gemini）

---

## 1. 在 Vercel 設定環境變數（一次到位）
把下列鍵值加到 Vercel 專案 Settings → Environment Variables。若有「XXX」請換成你的實際值。

必填（後台與模型）
- `ADMIN_TOKEN`＝自行設定強密碼（用於 /admin 登入）
- `GEMINI_API_KEY`＝你的 Google AI Studio API Key
- `EMBED_MODEL`＝`text-embedding-004`（建議；固定 768 維）
- `GEN_MODEL`＝`gemini-2.5-flash`
- `DEFAULT_KEYWORDS`＝`help,課程,教材,客服`（關鍵字清單，逗號分隔；當未啟用 Atlas 設定庫時生效）

向量庫（預設 Qdrant）
- `VECTOR_BACKEND`＝`qdrant`
- `QDRANT_URL`＝你的叢集 REST 基底 URL（不含子路徑，例如 `https://<cluster-id>.<region>.cloud.qdrant.io`）
- `QDRANT_API_KEY`＝Qdrant 叢集 API Key（不是 collection 名稱）
- `QDRANT_COLLECTION`＝集合名稱（例如 `workshop_rag_docs`，只放名稱即可）
- （可選）`EMBED_DIM`＝`768`（若你改用 `gemini-embedding-001`，請加上此值以對齊 768 維）

Atlas（可選，兩種路線）
- A.（推薦）直連 Atlas 驅動（不走 Data API，避開 EOL 風險）：
  - `LOG_PROVIDER=atlas-driver`
  - `MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/?retryWrites=true&w=majority&appName=<AppName>`
  - `MONGODB_DB=ragdb`
  - （可選集合名）`MONGODB_COLLECTION_LOGS=logs`、`MONGODB_COLLECTION_CONVERSATIONS=conversations`、`MONGODB_COLLECTION_CONFIG=config`
- B.（不建議新案）App Services Data API：需 `ATLAS_DATA_API_BASE/KEY/DATA_SOURCE/DATABASE/COLLECTION`（EOL 中，僅供相容）

LINE（讓使用者在 LINE 中對話）
- `LINE_CHANNEL_SECRET`＝LINE 後台 Basic settings → Channel secret
- `LINE_CHANNEL_ACCESS_TOKEN`＝Messaging API → Issue 長期 Token

可選（把回答委外到你的後端）
- `ANSWER_WEBHOOK_URL`＝你的後端 API（POST `{ question, topK, scoreThreshold, numCandidates }`）
- `ANSWER_WEBHOOK_TOKEN`＝Authorization: Bearer 使用

可選（對話紀錄後端；預設關閉）
- `LOG_PROVIDER`＝`none`（預設）或 `atlas` / `pg` / `mysql` / `supabase`
  - Atlas：`ATLAS_DATA_API_BASE`、`ATLAS_DATA_API_KEY`、`ATLAS_DATA_SOURCE`、`ATLAS_DATABASE`、`ATLAS_COLLECTION`、`ATLAS_SEARCH_INDEX`
  - Postgres：`DATABASE_URL`
  - MySQL：`MYSQL_URL`
  - Supabase：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`

版本固定（已內建，僅備註）
- 本專案已鎖 Node 20：`package.json` → `engines.node=20.x`，`vercel.json` → `NODE_VERSION=20`

---

## 2. 重新部署
- 在 Vercel 按「Redeploy」，建議勾選「Clear build cache」。
- 部署完成後，管理後台位址：`https://<你的域名>/admin`（先輸入 `ADMIN_TOKEN`）。

---

## 3. LINE 後台（Messaging API）設定
- Webhook URL：`https://<你的域名>/api/line-webhook`
- Use webhook：開啟
- Auto-reply / Greeting：建議關閉（避免雙重回覆；如需歡迎詞，可在我們的 webhook 實作 follow 事件）
- 把 `Channel secret` 與 `Channel access token` 貼回 Vercel 對應變數

驗證 Webhook（選用，從本機測）
```bash
BODY='{"events":[{"type":"message","message":{"type":"text","text":"help"},"replyToken":"DUMMY","source":{"type":"user","userId":"Utest"}}]}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$LINE_CHANNEL_SECRET" -binary | openssl base64 -A)
curl -sS -i https://<你的域名>/api/line-webhook \
  -H "content-type: application/json" \
  -H "X-Line-Signature: $SIG" \
  --data "$BODY"
# 期待 HTTP/1.1 200 OK
```

---

## 4. 上傳教材與測試
- /admin →「3) 上傳教材（檔案上傳）」：支援 .pdf/.txt/.md/.docx
  - 分塊大小、重疊以「字元數」計算（不是 tokens）。建議 size=600–1000、overlap=10–20% 的 size。
- /admin →「4) 上傳教材（貼上純文字）」：快速測試路徑，預設 size=800、overlap=120
- /admin →「5) 線上測試」：輸入問題直送 RAG（不經 LINE）
- 在 LINE 對 bot 輸入「help」或提問（命中 `DEFAULT_KEYWORDS` 則走快捷回覆）

---

## 5. 快速自我檢查
- Qdrant URL 格式
  - `QDRANT_URL` 只能是「叢集基底 URL」，不要帶 `/collections` 或 `/dashboard`
  - `QDRANT_COLLECTION` 只放名稱（例如 `workshop_rag_docs`）
- 維度一致
  - `text-embedding-004` 固定 768；若用 `gemini-embedding-001` 請加 `EMBED_DIM=768`，或清空/改新 collection
- 關鍵字來源
  - 未設定 Atlas 時，/admin 的關鍵字變更不會持久化；請改用 `DEFAULT_KEYWORDS`（逗號分隔，完全相符比對）
- LINE 自動回覆
  - 建議關閉 Auto-reply/Greeting，避免雙重回覆

---

## 6. 常見錯誤與對策
- Qdrant 404 `page not found`
  - 多為 `QDRANT_URL` 或 `QDRANT_COLLECTION` 寫錯路徑（用 cluster 基底 URL、collection 只放名稱）
- Qdrant 400 `Bad Request`
  - 幾乎都是「向量維度不相容」。清空集合、對齊 EMBED_MODEL/EMBED_DIM=768，或用新 `QDRANT_COLLECTION`
- 403 `forbidden`
  - API Key 錯或權限不符；請用叢集 API Key
- LINE 沒回覆
  - Webhook URL 非 `/api/line-webhook` / 簽章錯 / Auto-reply 干擾 / 關鍵字沒命中（完全相符）
- PDF 解析失敗
  - 檔案受保護或格式特殊→先轉成文字測試；或改用其他 PDF

---

## 7. 參數與最佳實務（精簡版）
- `TOPK`：每次檢索片段數。建議 4–8
- `SCORE_THRESHOLD`（Qdrant）：相似度門檻 0.10–0.30
- `NUM_CANDIDATES`（Atlas）：候選數 200–800
- `chunkSize`：每塊字元數 600–1000
- `overlap`：重疊字元數，約為 `chunkSize` 的 10–20%
- 詳細版：`docs/retrieval-parameters.md`

---

## 8. 一鍵 .env 樣板（可複製貼上再到 Vercel 填入）
```env
# 基本
ADMIN_TOKEN=請填
GEMINI_API_KEY=請填
EMBED_MODEL=text-embedding-004
GEN_MODEL=gemini-2.5-flash
DEFAULT_KEYWORDS=help,課程,教材,客服

# Qdrant（預設向量庫）
VECTOR_BACKEND=qdrant
QDRANT_URL=https://<cluster-id>.<region>.cloud.qdrant.io
QDRANT_API_KEY=請填
QDRANT_COLLECTION=workshop_rag_docs
# 若改用 gemini-embedding-001，建議鎖 EMBED_DIM=768
# EMBED_DIM=768

# LINE
LINE_CHANNEL_SECRET=請填
LINE_CHANNEL_ACCESS_TOKEN=請填

# 對話紀錄後端（預設 none）
LOG_PROVIDER=none
# 若改 atlas / pg / mysql / supabase，請補齊對應變數
```

---

## 9. 驗收清單
- [ ] `/admin` 能登入（ADMIN_TOKEN）
- [ ] `/admin/setup` Qdrant/Atlas 顯示 OK
- [ ] 能上傳教材（檔案或純文字）
- [ ] /admin 線上測試能回覆
- [ ] LINE 對話能回覆；`help` 命中 `DEFAULT_KEYWORDS` 可回快捷說明

---

附註
- 本專案的 API route 皆設為 `dynamic='force-dynamic'`、`revalidate=0`，避免 build 期對外呼叫造成部署失敗。
- pdf 解析採穩定路徑，並在 UI 顯示上傳進度與伺服器處理中提示。
