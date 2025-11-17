# 03｜Qdrant Cloud 建立向量索引（預設）

## 目的
- 在 Qdrant Cloud 建立可供 RAG 檢索的 Collection，供後續嵌入腳本寫入並由 n8n 檢索。

## 前置條件
- 已具備 Qdrant Cloud 帳號。

## 步驟
1) 建立 Cluster：登入 Qdrant Cloud，選擇區域與方案建立新叢集。
2) 建立 API Key：於專案設定新增 API Key（僅需寫入/讀取權限）。
3) 取得 REST 端點 URL（`QDRANT_URL`）。
4) 於 GitHub Codespaces Secrets 新增：`QDRANT_URL`、`QDRANT_API_KEY`。
5) Collection 維度：建議由「首次寫入」的嵌入腳本動態偵測向量維度後建立（避免手動填錯）。

## 驗證
- 待執行 `scripts/ingest-qdrant.ts` 後，於 Qdrant Console 檢視 Collection 與 Points 數量。

## 常見錯誤
- 維度不符：請刪除 Collection 後，改用嵌入腳本自動以「正確維度」重建。
- 權限不足：確認 API Key 具備讀寫權限。

## 【可測試】Qdrant 端點與 API Key
```bash
curl -s -H "api-key: $QDRANT_API_KEY" "$QDRANT_URL/collections" | jq '.result.collections | length'
```
回傳數字代表連線成功；若為 401/403/404，請檢查 URL 與 Key 是否正確。
