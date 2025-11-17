# API 訊息與回應格式一覽（cloud-app）

此檔列出主要 App Routes 的請求方法、授權需求、回應 JSON 形狀與常見錯誤訊息，方便串接與除錯。

> 除非特別標示，所有 `/api/admin/*` 皆需 `Authorization: Bearer <ADMIN_TOKEN>`。

## 授權
- `GET /api/admin/ping`
  - 用途：僅驗證 Token 是否正確（不連外部服務）。
  - 200：`{ ok: true }`
  - 401：`unauthorized`

## 設定與健康檢查
- `GET /api/admin/config`
  - 回應：`{ prompt, keywords, TOPK, SCORE_THRESHOLD, NUM_CANDIDATES }`（未設 Atlas 時為預設值）
- `PUT /api/admin/config`
  - Body：同上；成功後回最新設定。
- `GET /api/health?withDb=0|1`
  - 回應：`{ provider, checks: Array<{ name, ok, info?, error? }>, envSummary }`

## 文檔上傳與管理
- `POST /api/admin/docs`（貼上純文字）
  - Body：`{ content, source, page?, section? }`
  - 回應：`{ inserted: number }`
- `POST /api/admin/docs/upload`（檔案）
  - form-data：`files[]=...`（多檔）+ `chunkSize` + `overlap`
  - 回應：`{ totalInserted, results: [{ file, inserted }], errors: [{ file, error }] }`
  - 常見錯誤文字：
    - `Vector store not configured`（Qdrant/Atlas 未設）
    - `PDF 解析失敗：...`、`DOCX 解析失敗：...`
    - `Bad Request`（多為 Qdrant 維度不符）
- `POST /api/admin/docs/reembed`
  - Body：`{ source }`
  - 回應：`{ reembedded: number }`
- `DELETE /api/admin/docs?source=...`
  - 回應：`{ deleted: true }`
- `POST /api/admin/vector/clear`
  - 回應：`{ cleared: true }`

## 對話紀錄與日誌
- `GET /api/admin/logs?limit=50`
  - 回應：`{ logs: any[] }`（未設 Atlas/Supabase/PG/MySQL 時為空陣列）
- `GET /api/admin/conversations?limit=50&userId=&channelId=&q=&from=&to=`
  - 回應：`{ conversations: any[] }`
- `GET /api/admin/conversations/[id]`
  - 回應：單筆對話 JSON 或 404

## 測試問答
- `POST /api/test`
  - Body：`{ question: string }`
  - 回應：`{ answer: string, hits: any[] }`
  - 可能錯誤：`Gemini embed failed` / `Gemini generate failed`

## LINE Webhook
- `POST /api/line-webhook`
  - Header：`X-Line-Signature`
  - 回應：`ok` 或 401 `unauthorized`

---

## 錯誤訊息對照（節錄）
- 授權：`unauthorized` → 缺少/錯誤 `ADMIN_TOKEN` 或簽章錯誤。
- Qdrant：`Bad Request` → 多為向量維度不符；清空集合或對齊 `EMBED_DIM`。
- Gemini：`Gemini embed failed …` / `generate failed …` → 檢查 API Key、模型名、速率限制。
- 解析：`PDF 解析失敗 …`、`DOCX 解析失敗 …` → 檔案可能受保護或格式不支援。

