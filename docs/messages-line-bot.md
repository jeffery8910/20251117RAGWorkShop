# LINE 對話介面訊息一覽（cloud-app）

此檔整理 cloud-app 與 LINE 用戶互動時、可能出現的文字訊息與來源檔案位置，方便教學或客製。

## 入口與驗簽
- 路由：`/api/line-webhook`（App Route）
- 驗簽失敗：HTTP 401 `unauthorized`（內文）。
- 程式位置：`src/app/api/line-webhook/route.ts`、`src/lib/line.ts`。

## 正常互動訊息
- 預設關鍵字回覆（命中 Admin 設定的關鍵字）
  - 文字：`收到！這是預設關鍵字回覆。也可以直接輸入問題，我會用教材知識來回答。`
  - 位置：`src/app/api/line-webhook/route.ts`（邏輯：讀取 `getConfig().keywords`，完全相符則採此回覆）。
- 一般 RAG 回覆
  - 由 `ragAnswer()` 產生，會依 Prompt + 檢索片段組合文字。
  - 位置：`src/lib/rag.ts`（檢索/生成）、`src/app/api/line-webhook/route.ts`（回覆與記錄）。

## 例外與錯誤
- 全域錯誤回覆（try/catch）
  - 文字：`抱歉，系統暫時無法回覆，請稍後再試。`
  - 同時寫入 `logEvent({ type: 'error', q, error })` 與 `logConversation({ type:'error', ... })`。
- 回覆 API 失敗
  - 位置：`replyToLine()` 內 swallow，但不會再丟出錯誤影響主要流程。

## 客製建議
- 關鍵字回覆內容：可改為讀取 `config` 中的長文（例如課綱、FAQ），或導向 `/admin` 教材上傳說明。
- 異常回覆：可依錯誤類型（例如限流、後端逾時）提供不同說明。
- 多語系：將固定字串抽離成 `src/i18n/line.ts`，依 Channel/User 設定語系。

