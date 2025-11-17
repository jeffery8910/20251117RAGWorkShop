# 常見訊息與錯誤對照（cloud-app）

本檔對應後台 UI 與 API 回覆的常見訊息，提供原因與處理方式說明。

## 授權與存取
- `unauthorized`（401）
  - Admin：缺少/錯誤 `Authorization: Bearer <ADMIN_TOKEN>`。
  - LINE：`X-Line-Signature` 驗簽失敗。
  - 處理：確認 Token、簽章與時區/編碼一致。

## 上傳/解析
- `PDF 解析失敗：…`、`DOCX 解析失敗：…`
  - 來源：`pdf-parse`/`mammoth` 解析時丟錯。
  - 處理：確認檔案未受密碼保護或損毀；必要時轉存為純文字再上傳。
- `Unsupported file type. Please upload .txt, .md, or .pdf`
  - 來源：目前僅支援 txt/md/pdf/docx。
  - 處理：轉支援格式再上傳。

## 向量庫（Qdrant/Atlas）
- `Bad Request`（Qdrant 回 400）
  - 多半是「向量維度不相容」。
  - 處理：
    1) `/admin` → 清空集合後重建；或
    2) 設定 `EMBED_DIM` 與現有集合一致；或
    3) 改用舊模型（例如 `text-embedding-004` 768 維）。
- `Vector store not configured (set QDRANT_URL/API_KEY or Atlas envs)`
  - 來源：未設定 Qdrant 或 Atlas。
  - 處理：在部署平台填入相應環境變數，或改 `QDRANT_COLLECTION` 重新建立。

## 設定/日誌（Atlas）
- `Data API … failed: 404 {"error":"cannot find app using Client App ID 'APP_ID'"}`
  - 來源：Atlas 參數仍為占位字串（APP_ID、YOUR_*）。
  - 處理：改填正確參數，或把 `LOG_PROVIDER=none` 停用 Atlas。

## Gemini
- `Gemini embed failed …`、`Gemini generate failed …`
  - 來源：金鑰無效、模型名錯誤或速率限制。
  - 處理：確認 `GEMINI_API_KEY`、`EMBED_MODEL`、`GEN_MODEL`；調整速率限制環境變數或稍後再試。

## 其他
- `DeprecationWarning: Buffer()`
  - 來源：相依套件使用舊 API；不影響功能。
  - 處理：已升級 `pdf-parse` 降低發生；如要隱藏可設 `NODE_OPTIONS=--no-deprecation`。

