# 12｜疑難排解

## Webhook 驗證失敗（403）
- 檢查 `X-Line-Signature` 計算是否使用正確 `Channel secret`。
- 確認 n8n Webhook 路徑與 LINE 後台設定一致。

## 向量維度錯誤
- 刪除 Qdrant Collection，重新以腳本自動建立。
- 確認嵌入模型未更換（更換模型可能導致維度不同）。

## 回覆延遲或超時
- 減少 Top-K 或片段長度；在生成前先壓縮 Context。
- 加入重試與超時設定。

## 重複回覆
- 若同時啟用 LINE 內建關鍵字與後端回覆，請依 `docs/08-keyword-and-rag-routing.md` 實作去重。

---
## Vercel 建置相關
- TypeScript 找不到型別（`Could not find a declaration file`）
  - 確認 `devDependencies` 已包含：`@types/react`、`@types/node`、`@types/pdf-parse`、`@types/pg`，並重新安裝。
- `ENOENT: ./test/data/05-versions-space.pdf`（來自 pdf-parse）
  - 由於套件 `index.js` 內含測試碼，已在 `next.config.mjs` 以 `alias: { 'pdf-parse$': 'pdf-parse/lib/pdf-parse.js' }` 迴避；若自行修改，請保留該 alias。
- App Route 在 build 期呼叫外部服務導致失敗（如 Atlas Data API 404 APP_ID）
  - 已將 `/api/*` 設為 `dynamic='force-dynamic'` 並 `revalidate=0`；同時當 Atlas 未設定或填入占位值時，將回傳預設/空資料而非拋錯。
- Node 版本相容性
  - 若出現 Node 22 相關崩潰，請將 `package.json` 的 `engines.node` 設為 `20.x`，並在 Vercel 設 `NODE_VERSION=20`（專案已內建）。
