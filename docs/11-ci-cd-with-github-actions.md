# 11｜CI/CD：自動嵌入與部署（範例）

## 目的
- 檔案更新自動觸發重新嵌入；必要時部署前端或後端服務。

## 作法
- 工作流程偵測 `data/**` 變更 → 在雲端 Runner 執行 `scripts/ingest-qdrant.ts`，將資料寫入 Qdrant。
- 部署前端（選配）：推送到 Vercel／Cloud Run。

## 檔案
- `.github/workflows/ingest-on-data-changes.yml`（本專案已附樣板，可依實際環境修正）。

## Secrets（GitHub Actions）
- 必填：`GEMINI_API_KEY`、`QDRANT_URL`、`QDRANT_API_KEY`、（選）`QDRANT_COLLECTION`
- 若使用 Atlas 作為設定/日誌：視需要加入 `ATLAS_DATA_API_BASE`、`ATLAS_DATA_API_KEY` 等。
