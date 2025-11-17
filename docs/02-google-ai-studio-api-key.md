# 02｜申請 Google AI Studio（Gemini）API Key（GEMINI_API_KEY）

## 目的
- 取得可用於嵌入與生成的 Gemini API Key，並安全保存於 Codespaces。

## 步驟
1) 前往 Google AI Studio，使用 Google 帳號登入。
2) 建立 API Key 並保存。
3) 回到 GitHub 專案頁 > `Settings` > `Codespaces` > `Secrets` 新增：
   - `GEMINI_API_KEY = <你的金鑰>`（後續 cloud-app 與 scripts 皆讀取此鍵）

## 使用建議
- 嵌入：預設使用 `gemini-embedding-001`（官方建議的通用 Embedding）；生成：預設使用 `gemini-2.5-flash`（皆可在環境變數調整）。
- 嚴禁將金鑰寫入檔案或提交到版本控制。

## 驗證
- 之後在 Codespaces 以示範腳本呼叫一次嵌入 API（見 `docs/05-embedding-ingest-from-codespaces.md`）。

## 【可測試】Gemini Key 最快檢查
```bash
curl -s -X POST \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "content-type: application/json" \
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent" \
  -d '{"model":"models/text-embedding-004","content":{"parts":[{"text":"health-check"}]}}' \
| jq '.embedding.values | length'
```
看到數字（如 768、3072 等）代表 Key 可用；出現 401/403/429 請依訊息調整。
