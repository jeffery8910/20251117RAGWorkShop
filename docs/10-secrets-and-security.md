# 10｜機密管理與安全

## 機密來源
- Codespaces Secrets：`GEMINI_API_KEY`、`QDRANT_URL`、`QDRANT_API_KEY`、`LINE_CHANNEL_*`、`ATLAS_URI`
- n8n Credentials：對應上列，用於雲端工作流程。

## 原則
- 永不提交金鑰至版本控制。
- 權限最小化：只給必要讀/寫權限。
- 定期滾動金鑰並更新 Secrets/Credentials。

## LINE 簽名驗證
- 使用 `X-Line-Signature` + `Channel secret`（HMAC-SHA256）驗證 Webhook 來源。

## 提示注入防護
- 生成前將檢索片段加入明確邊界與來源標記。
- 限制系統提示允許的操作範圍。

