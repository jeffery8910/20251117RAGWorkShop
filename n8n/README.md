# n8n Workflow：LINE RAG with Qdrant（Gemini）

本目錄提供可匯入 n8n Cloud（或自建 n8n）的工作流程 JSON：`workflows/line-rag-qdrant.json`。

## 匯入步驟
- 登入 n8n → `Workflows` → `Import from File` → 選擇 `line-rag-qdrant.json`。
- 開啟後在左上角按 `Activate` 前，先編輯節點 `Set`：
  - 填入對應值：
    - `GEMINI_API_KEY`
    - `EMBED_MODEL`（預設 `text-embedding-004`）
    - `GEN_MODEL`（預設 `gemini-2.5-flash`）
    - `QDRANT_URL`、`QDRANT_API_KEY`、`QDRANT_COLLECTION`
    - `LINE_CHANNEL_ACCESS_TOKEN`
    - `TOP_K`（預設 6）
- Webhook 節點路徑為：`/line/webhook`（方法：POST）。將此 URL 設為 LINE Developers 的 Webhook URL。

## 注意事項（驗簽）
- n8n 的 Webhook 節點無法直接取得「raw body」字串，計算 `X-Line-Signature` 可能受 JSON 解析影響而失敗。
- 建議：
  1) 若需要嚴格驗簽，改用 cloud-app（Next.js）的 `/api/line-webhook` 作為 Webhook 入口，由 cloud-app 驗簽後轉發到 n8n（選配），或
  2) 在網路邊界（反向代理）層代為驗簽；或
  3) 暫時跳過驗簽（不建議於正式環境）。

## 與 cloud-app 後台整合（選配）
- 方案 A：cloud-app 直接處理 RAG（建議）
  - LINE → cloud-app `/api/line-webhook`（已驗簽）→ 內建 Gemini+Qdrant → 回覆
  - 如要委外回答給你的系統：設定 `ANSWER_WEBHOOK_URL`，cloud-app 會先呼叫你的後台，再回退到內建流程。
- 方案 B：cloud-app 驗簽 + 轉發到 n8n
  - 在 cloud-app 新增轉發邏輯（或建立 `/api/line-webhook/n8n`）→ 將驗過簽的事件 POST 到 n8n Webhook 節點
  - 你可在 n8n 內完成 RAG 或其他自動化；如需樣板我可以提供。

## 節點概覽
- Webhook → Set（填入 Secrets/參數）→ Function（取出文字與 replyToken）→
- HTTP Request（Gemini Embedding）→ Function（取 embedding）→
- HTTP Request（Qdrant Search）→ Function（組合 Prompt）→
- HTTP Request（Gemini 生成）→ Function（取回答與 replyToken）→
- HTTP Request（LINE Reply）

## 驗證流程
- 在 LINE 傳訊息 → 觀察 n8n 執行紀錄 → 應回覆由教材知識生成的答案。

## 變更模型與參數
- 可在 `Set` 節點直接調整 `EMBED_MODEL`、`GEN_MODEL`、`TOP_K`。

---
若要我把驗簽（HMAC-SHA256）完整加上，需改成由 cloud-app 驗簽（已實作）或在 Proxy 層處理；需要我補轉發流程樣板請告訴我。
