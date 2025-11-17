# 17：n8n 可選擇性部署（與 cloud-app 串接）

這一篇說明如果你想把 n8n 和 `cloud-app`（Next.js）搭配使用，要怎麼部署、怎麼串接，讓：

- RAG ＋ LINE 的基本功能由 `cloud-app` 處理。
- 額外的流程自動化（排程、寫表單、叫其他 API…）交給 n8n。

> 若只是要完成「LINE 問答＋知識庫 RAG」，`cloud-app` 本身就夠用，n8n 完全是選配。

---

## 什麼情境需要 n8n？

- 想用拖拉節點方式設計流程，例如：
  - 收到某種關鍵字就寫入 Google Sheet / Notion / DB。
  - 回覆前需要先查第三方 API（報名系統、CRM 等）。
- 希望 cloud-app 專心做「RAG 問答」，其他業務邏輯交給 workflow engine。
- 需要把 LINE 訊息同時分流到多個系統（例如：一條走 RAG，一條走客服排班）。

---

## n8n 可以部署在哪裡？

常見幾種：

- **n8n Cloud**（官方託管）。
- **Render**：Free/付費方案都可，適合教學與 PoC。
- **Railway / Fly.io / VM / Kubernetes**：只要能跑 Node 或 Docker 就可以。

以下以 Render 範例簡述（完整細節可參考官方文件）：

1. 建一個 Web Service：
   - Build Command：`npm i n8n -g`
   - Start Command：`n8n start`
2. 設定環境變數：
   - `N8N_PORT=5678`
   - `N8N_PROTOCOL=https`
   - `N8N_HOST=<service>.onrender.com`
   - `WEBHOOK_URL=https://<service>.onrender.com`
   - `N8N_ENCRYPTION_KEY=<隨機 32+ 字元>`
   - 視需要開 `N8N_BASIC_AUTH_*` 做帳密保護。
   - `GEMINI_API_KEY` 建議也放在這邊（給 HTTP Request 節點用）。
3. 加上 Persistent Disk 掛載到 `/home/node/.n8n`，讓 workflow / credentials 持久化。
4. 完成後，用瀏覽器打開 `https://<service>.onrender.com` 進入 n8n 編輯介面，匯入本 repo 的 `n8n/workflows/line-rag-qdrant.json`。

---

## 與 cloud-app 串接的三種模式

假設：

- `cloud-app` 部署在 Vercel / Render，LINE Webhook 指向 `https://<cloud-app>/api/line-webhook`。
- `n8n` 部署在某個 URL，例如 `https://my-n8n.onrender.com`。

### 模式 A：只用 cloud-app，不用 n8n

- LINE Webhook → `cloud-app` `/api/line-webhook`。
- 驗證簽章、做 RAG、呼叫 LINE Reply API 全部在 cloud-app 內完成。
- `FORWARD_TO_N8N_URL` 留空，即是此模式（預設）。

### 模式 B：LINE 直接打到 n8n Webhook

- LINE Webhook URL 直接設定為：`https://my-n8n.onrender.com/webhook/line/webhook`。
- 所有簽章驗證、RAG、回覆流程由 n8n workflow 自己處理。
- 適合：你想把 cloud-app 當作純「知識庫 + 向量資料內建工具」，但入口完全用 n8n 來管。

> 注意：LINE 簽章驗證在 n8n 會比較麻煩（raw body 取得限制），這個模式不在本 repo 詳細展開。

### 模式 C：cloud-app 驗證＋轉發到 n8n（推薦）

這也是本 repo 現在**已內建**的模式，透過 `/api/line-webhook` 做前置處理，再選擇性轉發給 n8n。

1. LINE Webhook → `https://<cloud-app>/api/line-webhook`
2. cloud-app 做的事：
   - 驗證 `X-Line-Signature`。
   - 解析事件、查關鍵字規則。
   - 依設定決定：
     - 直接用 cloud-app 的 RAG 回覆，或
     - 把原始事件 JSON 轉發到 n8n Webhook。

轉發行為由兩個設定決定：

- `FORWARD_TO_N8N_URL` ：n8n Webhook URL，例如：
  - `https://my-n8n.onrender.com/webhook/line/webhook`
- `FORWARD_RULE`：
  - 空值：不轉發，全部在 cloud-app 處理。
  - `all`：所有訊息都轉發到 n8n。
  - `keywords`：只有命中關鍵字規則的訊息才轉發。

這兩個設定可以：

- 用環境變數設定（若沒有用 Atlas config）。
- 或在 `/admin` →「系統設定」頁面裡填寫（優先於環境變數）。

n8n 收到的內容就是 LINE 官方 Webhook 的 JSON，workflow 裡可以：

- 再次解析 `events[0].message.text`、`replyToken`。
- 呼叫 Gemini / Qdrant / 其他系統。
- 最後用 LINE Reply API 回覆（`replyToken` 由 n8n 自己掌控）。

---

## cloud-app 後端對 n8n 的業務邏輯

檔案位置：`cloud-app/src/app/api/line-webhook/route.ts`。

1. 驗證 LINE 簽章（`verifyLineSignature`）。
2. 解析事件，取得文字與使用者資訊。
3. 讀取設定（`getConfig()`）：
   - Prompt / keywords / RAG 參數。
   - `forwardToN8nUrl`（DB 欄位）與 `FORWARD_TO_N8N_URL`（環境變數）。
   - `forwardRule`（DB）與 `FORWARD_RULE`（環境變數）。
4. 讀取關鍵字規則（`loadKeywordRules` / `findKeywordMatch`）。
5. 先記錄一筆「使用者傳入訊息」到 `logConversation`。
6. 若設定了 `forwardToN8nUrl`：
   - 判斷 `forwardRule`：
     - `all`：任何訊息都 `POST` 到 n8n。
     - `keywords`：只有命中關鍵字規則（且非 `mode: "native"`）才轉發。
   - 轉發時：
     - `fetch(forwardToN8nUrl, { method: 'POST', body: raw })`。
     - 記錄 `forward_n8n` 或 `forward_n8n_error` 到 log。
   - 轉發後，cloud-app 不再自己回覆 LINE，預期由 n8n workflow 完成 Reply API。
7. 若這次沒有轉發或不符合條件，就走 cloud-app 內建 RAG 流程（詳見 06 & 09 文件）。

---

## /admin 中與 n8n 有關的改版說明

在 `09-admin-web-management.md` 已詳細說明，這裡只補充「跟 n8n 有關」的幾項：

- 「系統設定」新增欄位：
  - **n8n Webhook URL**（FORWARD_TO_N8N_URL）
  - **n8n 轉發規則**（FORWARD_RULE）
- 新增 API：
  - `GET /api/admin/n8n/test`
    - 需要 `ADMIN_TOKEN`。
    - 會從設定讀出 `forwardToN8nUrl`，改成 `https://<n8n-host>/rest/ping` 來測試 n8n 是否存活。

這樣一來，使用者在管理介面就可以完整掌握：

1. cloud-app 自己 RAG 的設定。
2. 要不要轉發到 n8n、怎麼轉發。
3. n8n 目前是否在線上。

---

## n8n 自我檢查與 Webhook 測試

### Ping API 測試

```bash
curl -s https://<service>.onrender.com/rest/ping | jq .
```

### Webhook 模擬測試

可以在本地或 Codespaces 直接模擬一個 LINE 事件 POST 給 n8n：

```bash
curl -s -X POST "https://<service>.onrender.com/webhook/line/webhook" \
  -H 'content-type: application/json' \
  -d '{"events":[{"type":"message","message":{"type":"text","text":"n8n 測試"},"replyToken":"DUMMY","source":{"type":"user","userId":"Uxxx"}}]}'
```

---

## 推薦的實作流程

1. 先完成 cloud-app＋RAG＋LINE 基本功能（不開啟 n8n）。
2. 在 n8n 匯入 `line-rag-qdrant.json`，確認可以針對假 `replyToken` 正常跑完流程。
3. 在 `/admin` 設定：
   - `FORWARD_TO_N8N_URL`
   - `FORWARD_RULE=keywords`（建議先從小流量開始）。
4. 用自己的 LINE 帳號實測：
   - 一般問題 → 應由 cloud-app 回覆。
   - 命中特定關鍵字的訊息 → 應由 n8n workflow 處理並回覆。

這樣可以讓使用者很清楚：

- cloud-app 管理後台主要管「知識庫與 RAG 參數」。
- n8n 管「需要流程設計的業務邏輯」。
- 兩者如何透過 `FORWARD_TO_N8N_URL` ＋ `FORWARD_RULE` 串在一起。
