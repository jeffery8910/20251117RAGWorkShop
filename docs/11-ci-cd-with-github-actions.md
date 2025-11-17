# 11．CI/CD：自動建索引與部署檢查

## 目的
- 當你更新 `data/**` 內容時，自動在 CI（GitHub Actions）裡重跑 Qdrant 建庫腳本。
- 搭配 Vercel / Render 的自動部署，確保每次佈版都帶著最新知識庫。

## 作法概念
- 專案內提供一支腳本：`scripts/ingest-qdrant.ts`  
  - 在 CI Runner 裡執行，將 `data/` 下的 `.md/.txt` 等文字資料：
    1. 切成 chunks  
    2. 送到 Gemini 做 embedding  
    3. 寫入 Qdrant Collection
- 只要有人修改 `data/**` 或 `scripts/**`，GitHub Actions 就會觸發這支腳本。

## 工作流程檔
- `/.github/workflows/ingest-on-data-changes.yml`  
  - 這份 workflow 範例已經在 repo 裡，可以依自己需求微調（例如 branch 條件、排程等）。

## Secrets（GitHub Actions）
- 必填：
  - `GEMINI_API_KEY`
  - `QDRANT_URL`
  - `QDRANT_API_KEY`
  - 建議加上 `QDRANT_COLLECTION`（例如 `workshop_rag_docs`）
- 若同時要把對話紀錄寫進 MongoDB Atlas（Driver 選項，非 Data API）：
  - 依需要再額外加入：
    - `MONGODB_URI`
    - `MONGODB_DB`

> 注意：  
> 本路線不再使用 MongoDB Atlas Data API，也不需要任何 `ATLAS_DATA_API_*` 類型的環境變數。  
> 若要擴充成使用 Atlas Vector Search，請用 Driver 或自訂腳本處理，與本工作坊主線無關。
