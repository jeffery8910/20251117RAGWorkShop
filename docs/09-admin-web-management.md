# 09：cloud-app 管理後台（Web）

本篇說明 `cloud-app` 的 `/admin` 管理介面要怎麼看、怎麼用，以及它背後大概在做什麼事。

---

## 介面概觀

- 技術架構：Next.js App Router，部署在 Vercel / Render 等平台。
- 權限控管：
  - 透過環境變數 `ADMIN_TOKEN` 保護。
  - 進入 `/admin` 時，前端會要求輸入 Token，通過後才會呼叫各種 `/api/admin/*`。
  - Token 只會存在瀏覽器 `localStorage`，不會顯示在畫面上。
- 主要目標：
  - 管理「知識庫文件」（RAG 使用的內容）。
  - 調整 RAG 參數與系統 Prompt。
  - （選用）設定 n8n Webhook 轉發規則。
  - 檢查對話紀錄與系統健康狀態。

頁面標題為「RAG ＋ LINE 管理後台」，分為數個分頁（Tabs）：

1. 系統設定
2. 檔案上傳
3. 純文字上傳
4. 線上測問
5. 資料管理
6. 記錄查詢
7. 對話紀錄（連結到 `/admin/conversations`）

---

## 分頁說明

### 1. 系統設定（Config）

這一頁使用 `ConfigPanel` 元件，對應 API：`/api/admin/config`。

- **系統回覆說明（Prompt）**
  - 告訴模型「你是誰、要怎麼回答」，例如：
    - 你是本單位的客服助理，請參考知識庫內容，用繁體中文回答使用者問題。
  - 儲存在 Atlas `config` collection 或環境變數中。

- **關鍵字（keywords）**
  - 是 cloud-app 內部用來判斷「是否啟動 RAG」的關鍵字。
  - 不是 LINE 官方帳號後台的「關鍵字自動回覆」；兩者彼此獨立。
  - 若需要讓 LINE 原生關鍵字處理，可在 `config.keywordRules` 中設定 `mode: "native"`。

- **RAG 相關參數**
  - `TOPK`：每次檢索要取回幾筆文件來組成回答。
  - `SCORE_THRESHOLD`：文件相似度門檻（0～1）。
  - `NUM_CANDIDATES`：向量搜尋時初步掃描的候選數量。

- **n8n Webhook URL（FORWARD_TO_N8N_URL）**
  - 若希望由 n8n workflow 處理 LINE 訊息，填入 n8n 的 Webhook URL，例如：
    - `https://your-n8n.onrender.com/webhook/line/webhook`
  - 留白代表不啟用轉發，LINE 訊息會直接由 cloud-app 內建的 RAG 流程處理。

- **n8n 轉發規則（FORWARD_RULE）**
  - 空值：不轉發到 n8n（全部在 cloud-app 處理）。
  - `all`：所有 LINE 訊息都 POST 到 n8n，由 n8n 回覆 LINE。
  - `keywords`：只有命中關鍵字規則的訊息才轉發，其餘在 cloud-app 用 RAG 回覆。

儲存時前端會以 `PUT /api/admin/config` 更新後端設定。

### 2. 檔案上傳（Upload）

對應 `UploadPanel`，主要用來上傳 PDF/TXT/MD/DOCX 等檔案，流程概念：

- 前端：選取檔案 → 切成 chunk（`chunkSize` / `overlap`）→ 上傳進 `/api/admin/docs/upload`。
- 後端：
  1. 解析檔案內容。
  2. 呼叫 Gemini Embedding API 產生向量。
  3. 寫入 Qdrant / Atlas（依 `VECTOR_BACKEND` 設定）。
  4. 回傳每個檔案的成功筆數與錯誤訊息。

頁面會顯示：

- 上傳進度（MB / 總量、%）。
- 每個檔案成功插入的 chunk 數。

### 3. 純文字上傳（Text Upload）

對應 `TextUploadPanel`，適合「小段文字」快速加入知識庫：

- 前端：輸入「內容」與「來源名稱（source）」→ POST `/api/admin/docs`。
- 後端：與檔案上傳流程類似，也會做 embedding 與寫入向量庫。

### 4. 線上測問（Test）

對應 `TestPanel`，呼叫 `/api/test`：

- 前端：輸入測試問題 → POST `/api/test`。
- 後端：
  1. 對問題做 embedding。
  2. 從向量庫查詢最相關文件。
  3. 用 Prompt＋Context＋問題呼叫 Gemini 產生回答。
  4. 回傳 answer（不會觸發 LINE）。

用來在不用動 LINE Bot 的情況下，直接在 web 上確認 RAG 是否正常。

### 5. 資料管理（Data Management）

對應 `DataManagementPanel`，管理已經匯入的資料：

- 讀取來源列表：`GET /api/admin/docs/sources`。
- 刪除某個來源所有文件：`DELETE /api/admin/docs?source=...`。
- 重新嵌入某個來源（換 embedding 模型時使用）：`POST /api/admin/docs/reembed`。
- 清空整個向量集合：`POST /api/admin/vector/clear`。

這一頁主要是給「維運／資料管理」使用，平常不會常開。

### 6. 記錄查詢（Logs）

對應 `LogsPanel`，呼叫 `/api/admin/logs?limit=50` 取得最近的系統 log：

- 資料來源依 `LOG_PROVIDER` 而定（Atlas / Mongo / Postgres / MySQL / Supabase 等）。
- 會記錄：關鍵字命中、RAG 執行、錯誤、n8n 轉發狀況等。

### 7. 對話紀錄（Conversations）

- 頁面路徑：`/admin/conversations`。
- 後端由 `logs.ts`／`atlas-driver.ts` 提供查詢。
- 每筆紀錄包含：時間、使用者 ID、方向（使用者訊息 / 機器人回覆）、文字內容、命中的文件等。

---

## 後端業務邏輯（簡要版）

### LINE Webhook → cloud-app `/api/line-webhook`

1. 驗證 `X-Line-Signature`（用 `LINE_CHANNEL_SECRET`）。
2. 解析事件，取得 `text`、`replyToken`、`userId`、`channelId`。
3. 讀取設定（`getConfig()`）：
   - Prompt / keywords / TOPK / SCORE_THRESHOLD / NUM_CANDIDATES
   - `forwardToN8nUrl`、`forwardRule`
4. 讀取關鍵字規則（`loadKeywordRules()`）：
   - 支援 `reply`（固定回覆）、`mode: 'rag' | 'native'` 等。
5. 若設定了 `forwardToN8nUrl`：
   - `FORWARD_RULE=all`：所有訊息都轉發到 n8n。
   - `FORWARD_RULE=keywords`：只有命中關鍵字規則的訊息會轉發。
   - 轉發方式：`POST forwardToN8nUrl`，body 為原始 LINE JSON。
   - 預期由 n8n workflow 呼叫 LINE Reply API 回覆。
6. 若沒有轉發，或這次不符合轉發條件：
   - 判斷是否有命中 `mode: 'native'` → 不回覆，交給 LINE 原生關鍵字。
   - 否則：
     - 若關鍵字規則有 `reply`，直接用固定文案回覆。
     - 若命中了 cloud-app 設定的 `keywords`，直接做 RAG 搜尋（`ragAnswer()`）。
     - 否則：當一般問答，也用 RAG 搜尋。
   - 回覆由 `replyToLine()` 完成。
7. 整個過程中會呼叫 `logEvent()`、`logConversation()` 記錄狀況，方便在 `/admin` 裡查 log / 對話。

### n8n 測試 API

- `GET /api/admin/n8n/test`
  - 需要 `ADMIN_TOKEN`。
  - 讀取 `forwardToN8nUrl`，改成同一個 host 的 `/rest/ping`。
  - 用來快速確認 n8n 服務是否正常（不會送真正的 LINE 訊息）。

---

## 使用建議與說明優化

- 管理者不需要理解所有技術細節，建議只記住三件事：
  1. 在「系統設定」填好 Prompt / 關鍵字 / n8n Webhook 與轉發規則。
  2. 在「檔案上傳／純文字上傳」把要給機器人看的文件上傳進來。
  3. 用「線上測問」先測試答案是否正確，再開放給 LINE 使用者。

- 若有啟用 n8n：
  - 建議先在 n8n 裡用假的 `replyToken` 測試整個 workflow。
  - 再回 `cloud-app` 設定 `FORWARD_TO_N8N_URL` / `FORWARD_RULE`，用「線上測問」＋真實 LINE 測試。

管理者可以先讀這份文件，再搭配 `messages-admin-ui.md` 看實際畫面文案，就能比較容易理解整個系統在做什麼。
