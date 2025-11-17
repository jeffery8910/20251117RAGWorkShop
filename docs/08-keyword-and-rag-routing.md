# 08｜關鍵字自動回覆與 RAG 並行策略

## 需求
- 指定關鍵字時回覆固定內容；一般聊天走 RAG 後臺回答。

## 策略 A（建議）：在 n8n 內部實作關鍵字
- 優點：避免與 LINE 內建自動回覆重複發送。
- 作法：
  - 在 Webhook 後加入 IF 節點，讀取 `config/keywords.json`。
  - 命中則回覆固定訊息；未命中才進入 RAG 子流程。

## 策略 B（保留內建）：使用 LINE 內建關鍵字 + 後端 RAG
- 風險：LINE 仍會把事件送至 Webhook，可能雙重回覆。
- 緩解：
  - 在 n8n 端以同一套 `keywords.json` 檢測，若命中則「不再回覆」。
  - 可加上 300–500ms 延遲，留給內建自動回覆先回；未命中再走 RAG。
- 維護成本：需確保 OA Manager 的關鍵字清單與 `keywords.json` 同步（建議只維護一份，以 repo 為準）。

## `config/keywords.json` 範例
```json
{
  "keywords": [
    { "match": "課表", "reply": "本週課表請見：https://example.com/schedule" },
    { "match": "報名", "reply": "報名表單：https://example.com/register" }
  ]
}
```

