# 檢索與切分參數指南（RAG Admin）

本檔說明 /admin 介面與環境變數中，與「檢索與切分」相關的數值意義、建議範圍與範例設定。

---

## 主要檢索參數
- `TOPK`（預設 6）
  - 意義：每次從向量庫取回的片段數（top‑K）。K 越大涵蓋越多，但回覆較慢、也可能引入雜訊。
  - 建議範圍：4–8 起步；內容高度分散可拉到 8–10。
  - 範例：課程問答採 6；FAQ/簡答採 4；政策文件或規範採 8。

- `SCORE_THRESHOLD`（Qdrant；預設 0.1）
  - 意義：相似度分數門檻，低於門檻的片段會被過濾。數值越高越嚴格。
  - 注意：分數尺度依模型與相似度度量而異（本專案 Qdrant 使用 Cosine，相似度約 0–1）。
  - 建議範圍：0.10–0.30。噪音多→調高；常回「找不到內容」→調低。
  - 範例：教學文本較一致用 0.2；多類混雜資料可試 0.25–0.3。

- `NUM_CANDIDATES`（Atlas Vector Search；預設 400）
  - 意義：候選數。Atlas 會先取候選再精排，候選越多結果較穩定但較慢。
  - 建議範圍：200–800；資料量很大時可 1000+。
  - 範例：小型知識庫 200；中型 400；大型 800。

---

## 切分參數（上傳教材）
- `chunkSize`（預設 800）
  - 意義：每一分塊的最大字元數（中文以字數估算）。
  - 建議範圍：600–1000（約 300–500 tokens）。塊太小→上下文不足；太大→嵌入成本與撞噪音上升。
  - 範例：教案/簡報 700–900；規範/合約 900–1100。

- `overlap`（預設 120）
  - 意義：相鄰分塊的重疊字元數，避免句子被切斷而失去語義。
  - 建議範圍：chunkSize 的 10%–20%。
  - 範例：chunkSize=800 時 overlap=80–160（本專案預設 120 ≈ 15%）。

- `source` / `page` / `section`
  - 意義：來源標籤與位置，會被一併寫入 payload 用於引用與檢索。
  - 建議：`source` 用檔名（含副檔名），`page` 用頁碼或章節號，`section` 放章節標題。

---

## 嵌入模型與維度（重要）
- `EMBED_MODEL`（預設 `text-embedding-004` 或 `gemini-embedding-001`）
  - `text-embedding-004`：維度固定 768。
  - `gemini-embedding-001`：預設 3072，可用 `EMBED_DIM` 降到 768 等常見維度。
- `EMBED_DIM`（可選）
  - 意義：指定輸出維度（僅 gemini‑embedding 系列支援）。
  - 重要：必須與現有 Qdrant Collection 維度一致；否則寫入會得到 400 Bad Request。
  - 建議：若之前用 768 建庫，改模型時將 `EMBED_DIM=768`；或在 /admin 清空集合後重建。

---

## 推薦組合
- 速度優先（FAQ/客服）
  - chunkSize=700，overlap=80，TOPK=4，SCORE_THRESHOLD=0.15，EMBED_DIM=768。
- 精準引用（課綱/規範）
  - chunkSize=900，overlap=120，TOPK=8，SCORE_THRESHOLD=0.25（或 0.3），EMBED_DIM=768。
- 長文件混合（講義/上課筆記）
  - chunkSize=800，overlap=120，TOPK=6，SCORE_THRESHOLD=0.2，EMBED_DIM=768。

---

## 調參流程（實務）
1) 先固定嵌入模型與維度（避免維度不相容）。
2) 以 chunkSize=800/overlap=120、TOPK=6、SCORE_THRESHOLD=0.2 起跑。
3) 檢查 /admin/conversations 的命中率與引用品質。
4) 有噪音→提高門檻或減少 TOPK；找不到→降低門檻或增加 TOPK。
5) 句子常被切斷→提高 overlap；每塊資訊過少→提高 chunkSize。
6) Atlas 方案：資料量變大時提高 NUM_CANDIDATES（200→400→800）。

---

## 常見錯誤對照
- Qdrant 400 Bad Request：嵌入向量維度與 Collection 不符 → 對齊 `EMBED_DIM` 或清空集合。
- 沒有檢索到片段：TOPK 太小或門檻過高 → 調低門檻/提高 TOPK；或資料未上傳成功。
- 回覆過長/離題：TOPK 過大或 chunkSize 過大 → 降低其中之一。

---

## 檢查清單（部署/切換模型時）
- [ ] `EMBED_MODEL` 與 `EMBED_DIM` 是否與既有資料一致？
- [ ] Qdrant：`QDRANT_URL`、`QDRANT_API_KEY`、`QDRANT_COLLECTION` 正確？
- [ ] `/admin/setup` 勾選 DB 測試顯示 Qdrant OK？
- [ ] 隨機抽樣問題驗證引用（來源/頁碼）是否合理？

