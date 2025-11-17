# 12．常見錯誤排除

## Webhook 驗證失敗（403）
- 檢查 `X-Line-Signature` 計算是否使用正確的 `Channel secret`。
- 確認 n8n Webhook 網址與 LINE 後台設定一致。

## 向量庫維度錯誤
- 刪除 Qdrant Collection，讓程式重新自動建立。
- 確認目前使用的嵌入模型與先前建庫時相同（維度需一致）。

## 回答品質不穩
- 調整 Top-K 或分數門檻；觀察 Context 是否足夠。
- 增加知識庫內容與分段設定。

## 關鍵字與 RAG 切換
- 若同時使用 LINE 關鍵字流程與 RAG 回答，請參考 `docs/08-keyword-and-rag-routing.md` 的路由設計。

---
## Vercel 部署相關
- TypeScript 型別宣告找不到（`Could not find a declaration file`）
  - 確認 `devDependencies` 已包含 `@types/react`、`@types/node`、`@types/pdf-parse`、`@types/pg` 等，並重新安裝依賴。
- `ENOENT: ./test/data/05-versions-space.pdf`（來自 pdf-parse）
  - 使用 `next.config.mjs` 的 alias：`alias: { 'pdf-parse$': 'pdf-parse/lib/pdf-parse.js' }`，避免載入內建測試檔路徑。
- App Route 在 build 階段對外部服務健康檢查失敗
  - 對 `/api/*` 路由設定 `dynamic='force-dynamic'` 與 `revalidate=0`，並避免在 build 時直接依賴外部服務健康狀態。
- Node 版本不相容
  - 若出現 Node 22 相關錯誤，建議在 `package.json` 的 `engines.node` 指定 `20.x`，並在 Vercel 設 `NODE_VERSION=20`。

---
## Qdrant：Wrong input: Not existing vector name

**症狀**

- 上傳檔案（例如 `ai_learning_flow.pdf`）時，後台顯示錯誤：  
  `Qdrant upsert failed: Bad Request | {"status":{"error":"Wrong input: Not existing vector name error: "},"time":...} | status=400`

**原因說明**

- cloud-app 預設使用「單一向量、沒有名稱」的 collection 設定：
  - `vectors: { size: <dim>, distance: "Cosine" }`
- 若你在 Qdrant Cloud UI 裡，先手動建立過同名 collection，且使用「命名向量 / 多向量」設定，例如：
  - `vectors: { content: { size: <dim>, distance: "Cosine" } }`
- 當 cloud-app 嘗試用 `vector: number[]`（未指定名稱）寫入時，Qdrant 找不到對應的向量名稱，就會回傳 `Not existing vector name` 錯誤。

**解法**

1. 確認目前使用的 collection 名稱：
   - 環境變數 `QDRANT_COLLECTION`，若未設定，預設為 `workshop_rag_docs`。
2. 移除這個 collection，讓 cloud-app 自己重新建立：
   - 方法 A：從管理後台操作  
     - 進入 `/admin` → 向量 / Data 管理 → 點「清空向量庫」。  
     - 這會刪除 Qdrant 上對應的 collection。
   - 方法 B：從 Qdrant Cloud UI 操作  
     - 登入 Qdrant Cloud → 選擇對應專案 → Collections → 刪除 `QDRANT_COLLECTION` 指向的那個 collection。
3. 刪除後，重新在 `/admin` 上傳一次檔案：
   - 第一次上傳時，程式會呼叫 `ensureCollection(dim)`，用單一向量設定重新建立 collection。

**避免再次發生**

- 不要在 Qdrant Cloud 以「命名向量 / 多向量」模式手動重建與 `QDRANT_COLLECTION` 相同名稱的 collection。
- 若只想檢查資料狀況，可以在 Qdrant UI 查看 points 與 payload；collection 結構本身讓 cloud-app 自動管理即可。

