# 06：在 n8n（雲端）建立 RAG 流程並串 LINE

本篇說明如何在 **n8n Cloud / 自行架設的 n8n** 中匯入本 repo 的 workflow，讓 LINE 訊息可以透過 n8n 做 RAG 處理。

> 補充：n8n 可以有兩種 LLM / RAG 用法：
> 1. 直接在 n8n 裡呼叫 Gemini（本 workflow 預設寫法）。
> 2. 把 cloud-app 當成「RAG API 平台」，n8n 只負責 orchestrate，透過 HTTP 節點呼叫 cloud-app 的 `/api/test` 或自訂的 RAG API。兩種方式都能用，本文件會一起說明。

---

## 前置：匯入 workflow

1. 打開 n8n（Cloud 或自建）：`https://<your-n8n-host>/`。
2. 進入 **Workflows → Import from File**。
3. 匯入本 repo 的 `n8n/workflows/line-rag-qdrant.json`。
4. 開啟 workflow，找到開頭的 `Set` 節點，填入必要變數：
   - `GEMINI_API_KEY`
   - `QDRANT_URL`
   - `QDRANT_API_KEY`
   - `QDRANT_COLLECTION`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `TOP_K`
   - `EMBED_MODEL`
   - `GEN_MODEL`
5. 啟用 workflow（Activate）。

Webhook 節點的路徑預設為：`/line/webhook`，完整 URL 類似：

- `https://<your-n8n-host>/webhook/line/webhook`

你可以把這個 URL 直接填進 LINE Developers 的 Webhook，或搭配 cloud-app 的 `/api/line-webhook` 做轉發（詳見 17 章）。

---

## 預設流程：n8n 直接呼叫 Gemini ＋ Qdrant 做 RAG

這是 `line-rag-qdrant.json` 內建的作法：

1. **Webhook（POST `/line/webhook`）**
   - 接收 LINE 的 webhook JSON，從 `events[0]` 取出使用者訊息及 `replyToken`。
   - 注意：因為 n8n 對 raw body 支援有限，本 workflow 沒做 LINE 簽章驗證，建議在外層用 cloud-app 驗證後再轉發進來（見下節）。

2. **Function：解析訊息**
   - 讀取 `message.text` 為 `userMessage`。
   - 取得 `replyToken`，及 userId / channel 等欄位。

3. **IF / 關鍵字判斷（可選）**
   - 可以在這裡讀 `config/keywords.json` 或寫死一些關鍵字：
     - 若屬於「簡單導引」類型（例如「官網」、「報名」），直接回固定文字。
     - 否則進入 RAG 流程。

4. **RAG 流程**
   - HTTP Request → Gemini Embedding API（`text-embedding-004` 或 config 中的 `EMBED_MODEL`）：
     - 將 `userMessage` 轉成向量。
   - HTTP Request → Qdrant 搜尋：
     - 以 embedding 查詢 Top-K，相似文件。
   - Function：整理 Context：
     - 將命中文件片段整理成文字，組成一個大的 context 字串。
   - HTTP Request → Gemini 文字生成（`GEN_MODEL`）：
     - Prompt = System Prompt ＋ Context ＋ 使用者問題。
     - 產生回答文字 `answer`。

5. **HTTP Request → LINE Reply API**
   - 使用 `LINE_CHANNEL_ACCESS_TOKEN` 呼叫 `v2/bot/message/reply`，帶入 `replyToken` 與回答文字。

6. （可選）紀錄 log／寫入 DB：
   - 可在 workflow 中新增節點，將問題／答案／命中文件寫入 Google Sheet、Notion、DB 等。

> 這種作法的優點是：所有 RAG 細節都在 n8n 內；缺點是如果 cloud-app 也有自己的 RAG，兩邊的設定（模型、向量庫）要自己同步。

---

## 進階：讓 n8n 使用「平台提供的 RAG API」（cloud-app）

若你希望 **LLM 與向量設定都集中在 cloud-app**，n8n 不直接叫 Gemini，而是呼叫 cloud-app 的 API，做法如下：

### 1. 把 cloud-app 當作 RAG Service

cloud-app 已經提供一個測試用 API：

- `POST https://<cloud-app>/api/test`
  - body：`{ "question": "使用者的問題" }`
  - 回傳：`{ "answer": "..." }`（由 cloud-app 內建的 RAG 流程產生）

你可以：

1. 在 n8n workflow 中保留 LINE Webhook / Reply 相關節點。
2. 將原本「Gemini Embedding + Qdrant + Gemini 回答」的那一段改成一個 HTTP Request：
   - Method：`POST`
   - URL：`https://<cloud-app>/api/test`
   - Body：`{ "question": {{$json["userMessage"]}} }`
3. 使用 cloud-app 回傳的 `answer`，再由 LINE Reply API 回覆給使用者。

這樣：

- 模型名稱、向量庫位置、RAG 參數（TOPK / SCORE_THRESHOLD 等）全部由 cloud-app 管理。
- n8n 只負責「什麼情境要叫這個 RAG API」、「前後還要不要做別的事」。

### 2. 如何同時支援兩種模式？

在教學或實務專案中，你可以這樣規劃：

- **簡單版（初學者）：**
  - cloud-app 自己處理 LINE Webhook ＋ RAG（不接 n8n）。
- **進階版 A：**
  - cloud-app 驗證 LINE 簽章，依規則轉發到 n8n（FORWARD_TO_N8N_URL / FORWARD_RULE）。
  - n8n 內部自己做 RAG（本 workflow 原始設計）。
- **進階版 B（推薦給想統一設定的人）：**
  - cloud-app 統一管理 LLM 與向量設定。
  - n8n 透過 HTTP 節點呼叫 cloud-app 的 `/api/test`（或你另外開的 `/api/rag-answer`），讓平台決定用哪個 LLM / 向量庫。

你可以在教學中讓學員先完成「n8n 直接叫 Gemini 的版本」，熟悉 RAG pipeline；再展示如何把那一段換成呼叫 cloud-app RAG API，體會「RAG-as-a-service」的概念。

---

## 安全性與 Secrets

- LINE、Gemini、Qdrant 的憑證可以：
  - 放在 n8n 的 Credentials / Variables。
  - 或者改成 cloud-app 那邊持有，n8n 只拿 cloud-app 的 API Token 來呼叫 RAG API。
- 教學時建議：
  - 把「對外的 API Key」盡量限制在 server-side（cloud-app 或 n8n 的 server 端），不要放在前端。n8n ＋ cloud-app 都屬於 server-side，可以依情境選一個統一出口。

---

## Webhook 測試（本地模擬 LINE）

不想每次都從 LINE 傳訊息，可以用 curl 模擬：

```bash
export N8N_WEBHOOK_URL="https://<your-n8n-host>/webhook/line/webhook"

curl -s -X POST "$N8N_WEBHOOK_URL" \
  -H 'content-type: application/json' \
  -d '{"events":[{"type":"message","message":{"type":"text","text":"測試 RAG"},"replyToken":"DUMMY","source":{"type":"user","userId":"Uxxx"}}]}'
```

若 workflow 已設定正確，應該可以在 n8n 的執行紀錄中看到 flow 跑完，並看到對應的 LINE Reply 節點被觸發。
