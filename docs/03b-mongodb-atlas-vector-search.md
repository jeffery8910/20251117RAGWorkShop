# 03b｜MongoDB Atlas Vector Search（備選）

## 目的
- 以 Atlas Vector Search 建立向量索引，提供 RAG 檢索的替代方案。

## 步驟摘要
1) 建立專案與 Cluster。
2) 建立資料庫與集合（例如：`rag.docs`）。
3) 以一次嵌入請求取得維度，建立 Vector Search 索引（指定 `dimensions` 與 `similarity`）。
4) 將連線字串保存到 Codespaces Secret：`ATLAS_URI`。

## 注意
- 本教學其餘步驟以 Qdrant 為預設；若採 Atlas，請在嵌入與 n8n 檢索處改用 Atlas 對應操作（於 `docs/05-embedding-ingest-from-codespaces.md` 與 `docs/06-n8n-cloud-workflow-rag.md` 有備註）。

## 【可測試】Atlas Data API（aggregate limit 1）
```bash
curl -s -X POST "$ATLAS_DATA_API_BASE/aggregate" \
  -H "content-type: application/json" \
  -H "api-key: $ATLAS_DATA_API_KEY" \
  -d '{
    "dataSource":"'"$ATLAS_DATA_SOURCE"'",
    "database":"'"$ATLAS_DATABASE"'",
    "collection":"'"$ATLAS_COLLECTION"'",
    "pipeline":[{"$limit":1}]
  }' | jq '.documents | length'
```
看到數字（0 或 1）代表 Data API 正常；出現 401/403/404 時請檢查參數與 App Services 設定。
