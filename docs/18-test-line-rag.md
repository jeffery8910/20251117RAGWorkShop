# 18｜LINE RAG 測試指南（一步一步驗證）

本文件教你如何從「連線」到「實際問答」逐步測試 LINE × RAG 是否工作。

---

## 0. 前置檢查（雲端）
1) 部署完成，取得你的網域：`https://<your-app>.vercel.app`
2) 在 Vercel 專案的環境變數已設定：
   - `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`
   - `ADMIN_TOKEN`、`GEMINI_API_KEY`
   - `VECTOR_BACKEND=qdrant`、`QDRANT_URL`、`QDRANT_API_KEY`、`QDRANT_COLLECTION`
   - （可選）`DEFAULT_KEYWORDS=help,課程,教材,客服`
3) 開啟 `/admin/setup` 檢視健康檢查（可勾選 DB 測試）：
   - Qdrant/Atlas 顯示 OK
   - 環境變數分組中，LINE/Qdrant/Gemini 欄位都「已填」

---

## 1. 設定 LINE 後台（Messaging API）
- Webhook URL：`https://<your-app>.vercel.app/api/line-webhook`
- Use webhook：開啟
- Auto-reply / Greeting：建議關閉（避免雙重回覆；若要歡迎詞，可在我們的 webhook 實作 follow 事件）
- 產生 Channel access token（長期），複製 Channel secret 與 token 到 Vercel

---

## 2. 驗證 Webhook 到達（不經 LINE App）
> 目的：確定你的 webhook URL + 簽章驗證是 200 OK。

在本機終端機執行（將變數換成你的真實值）：

```
export LINE_CHANNEL_SECRET='<你的 LINE Channel secret>'
export WEBHOOK='https://<your-app>.vercel.app/api/line-webhook'
BODY='{"events":[{"type":"message","message":{"type":"text","text":"help"},"replyToken":"DUMMY","source":{"type":"user","userId":"Utest"}}]}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$LINE_CHANNEL_SECRET" -binary | openssl base64 -A)

curl -sS -i "$WEBHOOK" \
  -H "content-type: application/json" \
  -H "X-Line-Signature: $SIG" \
  --data "$BODY"
```

期待：`HTTP/1.1 200 OK`。
- 若 401：`LINE_CHANNEL_SECRET` 不對或簽章計算錯。
- 若 404：Webhook URL 路徑錯（必須是 `/api/line-webhook`）。
- 注意：`replyToken` 是假的，所以不會在 LINE App 收到回覆，僅用於驗證端點與簽章。

---

## 3. 驗證 RAG 本身（不走 LINE）
> 目的：確定嵌入/檢索/生成流程無誤。

```
curl -sS https://<your-app>.vercel.app/api/test \
  -H "authorization: Bearer <你的 ADMIN_TOKEN>" \
  -H "content-type: application/json" \
  -d '{"question":"這是測試嗎？"}'
```

- 回傳 `{ answer, hits }` 表示 RAG 流程 OK。
- 若錯誤：常見為金鑰缺失、Qdrant 連線或向量維度不符（見 §6）。

---

## 4. 實際在 LINE App 測試
1) 確認機器人已加為好友，Webhook 已啟用。
2) 在 LINE 對 bot 輸入：
   - `help`（測試關鍵字快捷回覆；比對為「完全相符」）
   - 任意問題（走 RAG：嵌入→Qdrant 檢索→生成→回覆）
3) 若沒有回覆：
   - 先回到 §2 測試 webhook 200 是否成立。
   - 檢查 LINE 後台是否開著 Auto‑reply，導致雙重回覆或干擾。

---

## 5. 觀察紀錄（選配）
- `/admin/conversations`：需設定 `LOG_PROVIDER` 與對應連線後可檢視。
- `/admin` → 7) 日誌：需設定 Atlas/Supabase/PG/MySQL 中任一。
- Vercel Logs：可查看函式執行與錯誤堆疊。

---

## 6. 常見問題與快速對策
- Webhook 401：`LINE_CHANNEL_SECRET` 不正確 → 重新貼到 Vercel，重新部署。
- Webhook 404：URL 路徑錯 → 必須是 `/api/line-webhook`。
- Qdrant 404 `page not found`：`QDRANT_URL` 寫成 node‑0 或帶 `/collections` 子路徑 → 請用叢集基底 URL，不帶子路徑。
- Qdrant 400 `Bad Request`：向量維度不相容 → `text-embedding-004`（768 維），或 `gemini-embedding-001` + `EMBED_DIM=768`；或清空/改新 `QDRANT_COLLECTION`。
- 沒命中關鍵字：比對邏輯為「去空白 + 小寫 + 完全相符」→ 先用 `help` 測試；或設定 `DEFAULT_KEYWORDS`。
- 雙重回覆：關閉 LINE 後台 Auto‑reply/Greeting；或將關鍵字邏輯統一在我們後端。

---

## 7. 測試清單（過關標準）
- [ ] §2 Webhook 驗證 `200 OK`
- [ ] §3 `/api/test` 能回 `{ answer, hits }`
- [ ] §4 在 LINE 輸入 `help` 會收到快捷回覆
- [ ] §4 在 LINE 輸入一般問題能收到 RAG 回覆

---

## 8. 延伸（可選）
- 歡迎詞：在 webhook 增加 follow 事件處理，替代 LINE Greeting。
- 關鍵字：在 /admin 的「關鍵字清單」集中管理，避免與 LINE 後台關鍵字混用。
- 問答委外：設定 `ANSWER_WEBHOOK_URL`，由你的後端產生回答；失敗時回退內建 RAG。
