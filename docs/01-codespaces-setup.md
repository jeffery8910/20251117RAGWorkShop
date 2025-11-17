# 01｜Codespaces 與雲端前置設定

## 目的
- 在 GitHub Codespaces 建立可重現的雲端開發環境，集中管理機密並準備資料目錄。

## 前置條件
- GitHub 帳號與可用的 Codespaces 額度。
- 本 repo 已推送至 GitHub。

## 步驟
1) 啟用 Codespaces：在 GitHub 專案頁 > `Code` > `Codespaces` > `Create codespace on main`。
2) 建立 Secrets：GitHub 專案頁 > `Settings` > `Codespaces` > `Secrets` > `New repository secret`。
   - `GEMINI_API_KEY`：Google AI Studio 金鑰
   - `QDRANT_URL`：Qdrant Cloud REST 端點（例：https://XXXXXXXX-YYYYYY.region.cloud.qdrant.io）
   - `QDRANT_API_KEY`：Qdrant API Key
   - `QDRANT_COLLECTION`：向量集合名（預設 `workshop_rag_docs`）
   - `LINE_CHANNEL_ACCESS_TOKEN`：LINE Messaging API Channel Access Token
   - `LINE_CHANNEL_SECRET`：LINE Channel Secret
   - （選）`ATLAS_URI`：MongoDB Atlas 連線字串
3) 開啟 Codespace 後，確認 `.devcontainer/` 自動安裝依賴並載入環境變數。
4) 建立資料夾：`data/`（放教材原始檔），`config/`（放關鍵字等設定），`templates/`（環境檔樣板）。

## 驗證
- 在 Codespaces 終端機輸入：`echo $GEMINI_API_KEY`（或 `printenv GEMINI_API_KEY`）確認變數存在（不需列出完整值）。

## 常見錯誤
- 找不到金鑰：請再次檢查是「Codespaces Secrets」（非 Actions Secrets），並重新建立 Codespace 以載入最新變更。
- 端點錯誤：Qdrant URL 需為 REST 端點且含 https 前綴。

## 【可測試】Codespaces Secrets 快速驗證（終端機）
- 測試 Gemini（只印向量長度，不外洩內容）：
  ```bash
  curl -s -X POST \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "content-type: application/json" \
    "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent" \
    -d '{"model":"models/text-embedding-004","content":{"parts":[{"text":"ping"}]}}' \
  | jq '.embedding.values | length'
  ```
- 測試 Qdrant（列出 collections 數量）：
  ```bash
  curl -s -H "api-key: $QDRANT_API_KEY" "$QDRANT_URL/collections" | jq '.result.collections | length'
  ```
