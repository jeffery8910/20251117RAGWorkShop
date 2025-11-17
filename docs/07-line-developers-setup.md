# 07｜LINE Developers 設定（雲端 Webhook）

## 目的
- 建立 Messaging API Channel，設定 Webhook 指向 n8n，取得必要憑證。

## 步驟
1) 建立 Provider 與 Channel（Messaging API）。
2) 取得 `Channel access token` 與 `Channel secret`，分別保存到：
   - Codespaces Secrets：`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`
   - n8n Credentials：同名或同義名稱
3) 設定 Webhook URL：指向 n8n Webhook 節點產生的 HTTPS 端點。
4) 驗證 Webhook：點選「Verify」。
5) 關閉 LINE Official Account Manager 的「歡迎訊息」以避免無意義雙響應（如不需要）。

## 測試
- 從手機傳訊至該官方帳號，觀察 n8n 工作流程觸發與回覆。

