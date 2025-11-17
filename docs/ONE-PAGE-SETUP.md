# 一頁完成：LINE + RAG + Qdrant（cloud-app）

這份文件給「只想跟著一步一步做完」的人：  
照著做一輪，你就會得到一個可以接 LINE、用 RAG 回答問題的 cloud-app。

> 本路線只使用 Qdrant + Gemini，不使用 Atlas Data API。  
> 若要玩 Atlas，請看 `03b-mongodb-atlas-vector-search.md`（進階補充，可略過）。

---

## 0. 你需要準備的東西

- 一個 Vercel 帳號（建議主路線使用 Vercel 部署）
- 一個 LINE Messaging API Channel（在 LINE Developers 建立）
- 一個 Qdrant Cloud 專案（或自架 Qdrant）
- 一把 Google AI Studio API Key（Gemini）

---

## 1. 在 Vercel 設定環境變數（一次到位）

到 Vercel → 專案 → `Settings` → `Environment Variables`，依序填入：

### 必填：系統與模型

- `ADMIN_TOKEN`  
  - 自己取一組長一點的字串，用來登入 `/admin`。
- `GEMINI_API_KEY`  
  - 依 `docs/02-google-ai-studio-api-key.md` 建立。
- `EMBED_MODEL`  
  - 建議：`text-embedding-004`
- `GEN_MODEL`  
  - 建議：`gemini-2.5-flash`

### 必填：LINE

- `LINE_CHANNEL_SECRET`  
  - LINE Developers → Messaging API Channel → Basic settings → Channel secret
- `LINE_CHANNEL_ACCESS_TOKEN`  
  - LINE Developers → Messaging API → Issue channel access token

### 必填：Qdrant

- `VECTOR_BACKEND= qdrant`
- `QDRANT_URL`  
  - Qdrant Cloud Console → Cluster → REST URL（例如 `https://<cluster-id>.<region>.cloud.qdrant.io`）
- `QDRANT_API_KEY`  
  - Qdrant Cloud → API Keys
- `QDRANT_COLLECTION`  
  - 建議先用：`workshop_rag_docs`
- （可選）`EMBED_DIM=768`  
  - 僅在你改用 `gemini-embedding-001` 時需要，配合 768 維。

### 選配：對話紀錄後端

> 若只是跑工作坊主線，可以一律先設 `LOG_PROVIDER=none`，等熟悉後再加。

- `LOG_PROVIDER`  
  - 預設：`none`
  - 若要開啟 MongoDB Atlas（Driver）：
    - `LOG_PROVIDER=atlas-driver`
    - `MONGODB_URI`
    - `MONGODB_DB`
    - 可選：`MONGODB_COLLECTION_LOGS`、`MONGODB_COLLECTION_CONVERSATIONS`、`MONGODB_COLLECTION_CONFIG`
  - 若要用 Postgres：
    - `LOG_PROVIDER=pg`
    - `DATABASE_URL`
  - 若要用 MySQL：
    - `LOG_PROVIDER=mysql`
    - `MYSQL_URL`
  - 若要用 Supabase：
    - `LOG_PROVIDER=supabase`
    - `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`

### 選配：外部回答後端

- `ANSWER_WEBHOOK_URL`  
  - 若你有自己的 API，可以讓 cloud-app 把 `{ question, topK, scoreThreshold, numCandidates }` POST 過去。
- `ANSWER_WEBHOOK_TOKEN`  
  - 對應 Authorization: Bearer 的 token。

---

## 2. 重新部署 cloud-app

1. 在 Vercel 專案頁面按 `Redeploy`（必要時勾選 `Clear build cache`）。
2. 部署完成後，記住你的網址，例如：`https://your-app.vercel.app`。
3. 在瀏覽器開啟 `https://your-app.vercel.app/admin`：
   - 第一次會要求輸入 `ADMIN_TOKEN`，輸入你剛在環境變數設定的值。

---

## 3. 設定 LINE Webhook

1. 到 LINE Developers → Messaging API Channel
2. 設定：
   - Webhook URL：`https://your-app.vercel.app/api/line-webhook`
   - Use webhook：開啟
   - Auto-reply / Greeting：建議關閉（避免跟 bot 回覆重疊）
3. 把 `Channel secret`、`Channel access token` 填回剛剛的 Vercel 環境變數（已做過可以略過）。

簡單測試 Webhook（選配）：

```bash
BODY='{"events":[{"type":"message","message":{"type":"text","text":"help"},"replyToken":"DUMMY","source":{"type":"user","userId":"Utest"}}]}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$LINE_CHANNEL_SECRET" -binary | openssl base64 -A)
curl -sS -i https://your-app.vercel.app/api/line-webhook \
  -H "content-type: application/json" \
  -H "X-Line-Signature: $SIG" \
  --data "$BODY"
# 正常會看到 HTTP/1.1 200 OK
```

---

## 4. 在 `/admin` 上傳知識庫並測試

- `/admin` → 3) 檔案上傳（支援 `.pdf/.txt/.md/.docx`）
  - 選擇你的講義 / 說明文件上傳。
  - chunk 參數建議：`size = 600–1000`、`overlap = 10–20%`。
- `/admin` → 4) 貼上文字
  - 適合貼 FAQ / 短說明，不必另外存檔。
- `/admin` → 5) 測試
  - 輸入問題，例如「這個服務的計價方式是什麼？」  
  - 確認能看到來自 Qdrant 的 hits（source / page / score）。

---

## 5. 快速自我檢查

- Qdrant URL 格式
  - `QDRANT_URL` 應該是純 API URL，不要帶 `/collections` 或 `/dashboard`。
  - `QDRANT_COLLECTION` 只是一個名字，例如 `workshop_rag_docs`。
- 維度一致性
  - `text-embedding-004` 原生 768 維；若切換到 `gemini-embedding-001`，請一起調整 `EMBED_DIM=768` 並重新建 collection。
- 關鍵字來源
  - 預設的 `DEFAULT_KEYWORDS` 只影響關鍵字觸發行為，不再依賴 Atlas。
- LINE 自動回覆
  - 若你開啟了 LINE 的 Auto-reply / Greeting，可能會跟 bot 回覆打架；建議關閉。

---

## 6. 一份 .env 範例（可先在本機測試，再貼到 Vercel）

```env
# 基本
ADMIN_TOKEN=請自行設定
GEMINI_API_KEY=請填入你的 Gemini API Key
EMBED_MODEL=text-embedding-004
GEN_MODEL=gemini-2.5-flash
DEFAULT_KEYWORDS=help,課程,說明,客服

# Qdrant（向量庫）
VECTOR_BACKEND=qdrant
QDRANT_URL=https://<cluster-id>.<region>.cloud.qdrant.io
QDRANT_API_KEY=請填入 Qdrant API Key
QDRANT_COLLECTION=workshop_rag_docs

# LINE
LINE_CHANNEL_SECRET=請填入 LINE Channel secret
LINE_CHANNEL_ACCESS_TOKEN=請填入 LINE Access token

# 對話紀錄（預設關閉）
LOG_PROVIDER=none
# 若改用 atlas-driver / pg / mysql / supabase，請依各自需求補齊對應連線字串。
```

---

## 7. 完成前最後確認

- [ ] 能登入 `/admin`（ADMIN_TOKEN 正確）
- [ ] `/admin/setup` 顯示 Qdrant / Gemini 狀態正常
- [ ] 已用檔案上傳或貼上文字建好一點知識庫
- [ ] 在 LINE bot 輸入問題時，看到的是根據知識庫內容回答的 RAG 回覆，而不是預設空白答案

做到這裡，你就完成一個可用的 LINE x RAG cloud-app。  
後續可以再探索 `/admin` 的「測驗」、「向量分析」等進階功能。 
