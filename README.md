# RAG x LINE Cloud App（雲端版教學專案）

這個專案示範如何用 **Google AI Studio（Gemini）＋ Qdrant Cloud ＋ LINE Messaging API** 建立一個具備 RAG 能力的 LINE Chatbot，並且提供：

- `src/`：Next.js App Router 應用程式（LINE Webhook + 管理後台 `/admin`）
- `docs/`：一步步的教學講義與說明文件
- `n8n/`：可選用的 n8n workflow（例如 `workflows/line-rag-qdrant.json`），用來處理進階流程自動化

> 你會在 GitHub 上以 **cloud-app** 這個資料夾當作整個專案的 Root。

---

## 一鍵部署到 Vercel / Render

cloud-app 已經整理成獨立的 Next.js 專案，可以直接從 GitHub 一鍵匯入並部署。

> 下面連結中的 `<YOUR_GITHUB_REPO_URL>` 請換成實際的 GitHub 專案網址  
> （例如：`https://github.com/your-org/rag-line-cloud-app`）。

### Vercel 一鍵部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=<YOUR_GITHUB_REPO_URL>&root-directory=.&project-name=rag-line-cloud-app&repository-name=rag-line-cloud-app&env=ADMIN_TOKEN,GEMINI_API_KEY,EMBED_MODEL,GEN_MODEL,LINE_CHANNEL_SECRET,LINE_CHANNEL_ACCESS_TOKEN,VECTOR_BACKEND,QDRANT_URL,QDRANT_API_KEY,QDRANT_COLLECTION,TOPK,SCORE_THRESHOLD,NUM_CANDIDATES,LOG_PROVIDER&envDescription=請依照 docs%2F16-cloud-app-deploy.md 設定環境變數&envLink=docs%2F16-cloud-app-deploy.md)

建議步驟：

1. 確認 GitHub 上已經有這個 repo（或自己的 fork）。
2. 將按鈕 URL 中的 `<YOUR_GITHUB_REPO_URL>` 改成實際 GitHub 專案網址。
3. 點按鈕登入 Vercel，確認：
   - Root Directory：`.`（也就是 cloud-app 自己當作 repo root）
   - Node 版本：20.x（本專案已在 `package.json` / `vercel.json` 指定）
4. 依照 `docs/16-cloud-app-deploy.md` 填入必要環境變數：
   - `ADMIN_TOKEN`
   - `GEMINI_API_KEY`
   - `VECTOR_BACKEND`、`QDRANT_URL`、`QDRANT_API_KEY`、`QDRANT_COLLECTION`
   - `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`
   - 以及建議的 RAG 參數：`TOPK`、`SCORE_THRESHOLD`、`NUM_CANDIDATES`
5. 部署完成後，到 LINE Developers 將 Webhook 指向：
   - `https://<your-vercel-app>.vercel.app/api/line-webhook`

### Render 一鍵部署

專案根目錄已包含 `render.yaml`，可以用 Render 的按鈕自動建立 Web Service：

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=<YOUR_GITHUB_REPO_URL>&dir=.)

建議步驟：

1. 同樣將 `<YOUR_GITHUB_REPO_URL>` 改成實際 GitHub 專案網址。
2. 點按鈕登入 Render，確認服務使用根目錄下的 `render.yaml`。
3. 在 Render Environment 區塊填入 `docs/16-cloud-app-deploy.md` 中列出的環境變數。
4. 部署完成後，在 LINE Developers 將 Webhook 設定為：
   - `https://<your-render-service>.onrender.com/api/line-webhook`

> 關於「Vercel 當入口、Render 做 RAG 重負載」的進階架構，細節都整理在 `docs/16-cloud-app-deploy.md` 和 `docs/17-n8n-optional-deploy.md`。

---

## 說明文件（docs/）

所有教學說明都在 `docs/` 底下，推薦閱讀順序：

- `docs/00-overview.md`：整體說明與架構圖
- `docs/00-overview-env.md`：環境變數與雲端服務角色
- `docs/01-codespaces-setup.md`：GitHub Codespaces 快速啟動
- `docs/02-google-ai-studio-api-key.md`：取得 Gemini API Key
- `docs/03-qdrant-cloud-setup.md` / `docs/03b-mongodb-atlas-vector-search.md`：向量庫準備
- `docs/04-prepare-knowledge-base.md`：準備知識庫內容
- `docs/05-embedding-ingest-from-codespaces.md`：在 Codespaces 中做 embedding／寫入向量庫
- `docs/06-n8n-cloud-workflow-rag.md`：n8n workflow 架構與匯入
- `docs/07-line-developers-setup.md`：設定 LINE 官方帳號與 Webhook
- `docs/08-keyword-and-rag-routing.md`：關鍵字與 RAG 路由策略
- `docs/09-admin-web-management.md`：cloud-app 管理後台 `/admin` 的操作說明
- `docs/10-secrets-and-security.md`：Secrets 管理與安全性
- `docs/11-ci-cd-with-github-actions.md`：CI/CD 範例
- `docs/12-troubleshooting.md`：常見錯誤排除
- `docs/13-checklist.md`：上線前檢查清單
- `docs/14-non-md-files-usage.md`：如何處理非 Markdown 檔案
- `docs/15-rate-limits.md`：各雲服務的流量與費用提醒
- `docs/16-cloud-app-deploy.md`：cloud-app 在 Vercel / Render 的部署教學
- `docs/17-n8n-optional-deploy.md`：如何把 n8n 串進整體架構（選用）
- `docs/18-test-line-rag.md`：如何在 LINE 端實際驗證 RAG 功能

訊息與錯誤碼相關文件：

- `docs/messages-admin-ui.md`
- `docs/messages-api.md`
- `docs/messages-errors.md`
- `docs/messages-line-bot.md`

---

## 開發模式（本機或 Codespaces）

若要在本機或 Codespaces 開發 `cloud-app`：

```bash
npm install
npm run dev
```

開啟 `http://localhost:3000/admin`，輸入你設定的 `ADMIN_TOKEN` 就能進入管理後台。  
其餘後台操作細節請參考 `docs/09-admin-web-management.md`。

---

## n8n 與 RAG 的開發模式

n8n 可以透過兩種方式使用這個專案的 RAG 能力：

1. **n8n 直接呼叫 Google Gemini ＋ Qdrant / Atlas**  
   - 在 n8n workflow 裡直接串 Gemini 以及 Qdrant / Atlas API，自己實作 embedding、向量搜尋與回覆流程。

2. **n8n 把 cloud-app 當成 RAG Service**  
   - cloud-app 提供 RAG API（例如 `POST /api/test`），背後實際使用哪個 Prompt、模型、向量庫等，都由 `/admin` 的設定決定。
   - n8n workflow 只要用 HTTP Request 呼叫 cloud-app 的 API，取得 `answer` 後再透過 LINE Reply API 回覆即可。

詳細做法請參考：

- `docs/06-n8n-cloud-workflow-rag.md`
- `docs/17-n8n-optional-deploy.md`

