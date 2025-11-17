# 05｜在 Codespaces 產生嵌入並寫入向量庫（亦可全程用 Web）

## 目的
- 你可以完全不使用終端機，改在 Web 管理介面完成資料嵌入：
  - 檔案上傳（PDF/TXT/MD）或貼上純文字 → 伺服器分塊 → Gemini 嵌入 → 寫入 Qdrant/Atlas。
- 若需要批次處理或自動化，才建議在 Codespaces/CI 執行腳本。

## Web 介面（無需終端機）
- 部署完成後，至 `/admin`：
  - 「3) 上傳教材（檔案上傳）」：選擇 .pdf/.txt/.md/.docx，設定「分塊大小/重疊」，送出後會自動嵌入並寫入向量庫。
  - 「4) 上傳教材（貼上純文字）」：填入來源檔名與內容，送出即可。

## 在 Codespaces 執行（選配）
### 前置條件
- 已設定 Codespaces Secrets：`GEMINI_API_KEY`、`QDRANT_URL`、`QDRANT_API_KEY`（或 `ATLAS_URI`）。

### 安裝依賴
```bash
npm init -y
npm i @google/generative-ai @qdrant/js-client-rest dotenv globby
```
（若需 PDF/Docx 解析，再安裝對應解析器。）

### 腳本說明
- `scripts/ingest-qdrant.ts`（嵌入模型預設 `gemini-embedding-001`；可用 `EMBED_MODEL` 覆寫）：
  - 掃描 `data/` 內的 `.md`、`.txt`
  - 以簡易重疊分塊產生片段
  - 以 Gemini 產生嵌入
  - 自動以「嵌入維度」建立（或更新）Qdrant Collection 後，批次上傳 Points
- 若改用 Atlas，請於腳本內切換寫入程式碼（保留備註區）。

### Google AI 免費額度速率限制建議
- 透過 `EMBED_DELAY_MS` 控制嵌入請求節奏（毫秒），例如先設 `200` 再視情況調整。
- 如遇 429（Rate limit），提高 `EMBED_DELAY_MS` 或減少一次處理的分塊數量（降低 `CHUNK_SIZE` / 提高 `CHUNK_OVERLAP`）。

### 執行（選配）
```bash
npx ts-node scripts/ingest-qdrant.ts
```

## 驗證
- Qdrant Console 檢視 Collection 的 Points 數量與向量維度。

## 常見錯誤
- 429/額度：提高 `EMBED_DELAY_MS` 或減小分塊數量。
 - 維度錯誤：刪除 Collection 後重新執行讓腳本以正確維度建立（維度由模型回傳決定）。

## 【可測試】小檔案試跑（Codespaces）
```bash
mkdir -p data && echo "這是一段測試教材內容。" > data/sample.txt
export EMBED_DELAY_MS=200
npx ts-node scripts/ingest-qdrant.ts
```
執行成功後，可在 Qdrant Console 看到新 points；或用：
```bash
curl -s -H "api-key: $QDRANT_API_KEY" "$QDRANT_URL/collections/$QDRANT_COLLECTION/points/count" | jq .
```
