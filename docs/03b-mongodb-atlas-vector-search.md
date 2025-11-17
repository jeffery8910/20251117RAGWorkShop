# 03b．MongoDB Atlas（進階補充：非工作坊主線）

> 本章節僅作為「進階補充」與「相容性說明」。  
> 工作坊主線：**不使用 Atlas Data API，也不需要任何 `ATLAS_DATA_API_*` 的環境變數**。  
> 若你只想完成這次 RAG x LINE 練習，可以直接略過本章。

---

## 1. 我們在這個專案裡怎麼看 Atlas？

- 本專案的 RAG 主線全部走：
  - 向量庫：Qdrant Cloud（`QDRANT_URL` / `QDRANT_API_KEY` / `QDRANT_COLLECTION`）
  - 向量模型：Gemini Embedding (`text-embedding-004` 或 `gemini-embedding-001`)
- MongoDB Atlas 在這裡的角色是：
  - **選配** 的設定 / 日誌 / 對話紀錄儲存後端。
  - 透過 **MongoDB Driver**（`MONGODB_URI`、`MONGODB_DB`），而不是 Data API。
- 過去曾經用過 Atlas Data API + Vector Search 的版本，現在已經不再推薦，也不會在 docs 中示範：
  - 不需要設定 `ATLAS_DATA_API_BASE`、`ATLAS_DATA_API_KEY`... 之類的變數。
  - 若你有舊版專案，請優先考慮升級到 Qdrant 或 MongoDB Driver 路線。

---

## 2. 如果還是想用 Atlas，怎麼接比較安全？

> 僅適合已熟悉 MongoDB Atlas 的同學。建議在 side project 或 PoC 中試玩，不要塞進這次工作坊主線流程裡，以免混淆學員。

推薦兩種方式：

1. **MongoDB Driver（推薦）**
   - 在 cloud-app 中：
     - 設定 `LOG_PROVIDER=atlas-driver`
     - 設定：
       - `MONGODB_URI`
       - `MONGODB_DB`
       - （選填）`MONGODB_COLLECTION_LOGS`、`MONGODB_COLLECTION_CONVERSATIONS`、`MONGODB_COLLECTION_CONFIG`
   - 優點：
     - 沒有 Data API EOL / 權限範圍問題。
     - 型別與查詢行為與一般 Node.js 驅動一致。

2. **自行實作 Vector Search Pipeline**
   - 若你想用 Atlas Vector Search 作為向量庫：
     - 可以在 **你自己的 Server / Cloud Function / n8n workflow** 裡：
       - 以 Driver 或 HTTP API 實作 embedding → upsert → search 流程。
     - 然後透過 `ANSWER_WEBHOOK_URL` 讓 cloud-app 把問題轉發給你自訂的後端。
   - 在這種設計下，cloud-app 只當「前端 Webhook + 管理後台」，真正的 RAG 引擎在你自己的服務裡。

---

## 3. 工作坊建議：何時可以完全忽略這章？

你可以完全忽略本章，專心照以下路線做：

1. Qdrant Cloud 建立 cluster，設定好：
   - `QDRANT_URL`
   - `QDRANT_API_KEY`
   - `QDRANT_COLLECTION`（例如 `workshop_rag_docs`）
2. Google AI Studio 建好：
   - `GEMINI_API_KEY`
3. cloud-app 設好最基本的 env：
   - `ADMIN_TOKEN`、`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`
4. 透過 `/admin` 上傳知識庫、測試 RAG / 測驗功能。

只要以上四步沒問題，整個 RAG x LINE 線上服務就能跑完，不需要任何 Atlas 相關設定。  
這也是工作坊對學員預期的最小路線。 
