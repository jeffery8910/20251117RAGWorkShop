# 教學專案：RAG x LINE Chatbot（雲端版本）

這個專案示範如何用 **Google AI Studio（Gemini）＋ Qdrant Cloud ＋ LINE Messaging API** 建立一個具備 RAG 能力的 LINE Chatbot，並提供：

- `cloud-app/`：Next.js（App Router）打造的雲端版 LINE Webhook + 管理後台。
- `n8n/`：可選用的 n8n workflow，負責更複雜的流程自動化。
- `docs/`：一步步的講義，適合工作坊或自學。

---

## 一鍵部署 cloud-app 到 Vercel / Render

cloud-app 已經整理好成獨立的 Next.js 專案，可以直接從 GitHub 一鍵匯入並部署。

> 注意：下面連結中的 `<YOUR_GITHUB_REPO_URL>` 請換成這個專案在 GitHub 上的網址  
> （例如：`https://github.com/your-org/your-repo`）。

### Vercel 一鍵部署 cloud-app

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=<YOUR_GITHUB_REPO_URL>&root-directory=cloud-app&project-name=rag-line-cloud-app&repository-name=rag-line-cloud-app&env=ADMIN_TOKEN,GEMINI_API_KEY,EMBED_MODEL,GEN_MODEL,LINE_CHANNEL_SECRET,LINE_CHANNEL_ACCESS_TOKEN,VECTOR_BACKEND,QDRANT_URL,QDRANT_API_KEY,QDRANT_COLLECTION,TOPK,SCORE_THRESHOLD,NUM_CANDIDATES,LOG_PROVIDER&envDescription=請依照 docs%2F16-cloud-app-deploy.md 設定環境變數&envLink=docs%2F16-cloud-app-deploy.md)

建議步驟：

1. 確認 GitHub 上已經有這個 repo（或自己的 fork）。
2. 將上面按鈕裡的 `<YOUR_GITHUB_REPO_URL>` 改成實際的 GitHub 專案網址。
3. 點按鈕登入 Vercel，確認：
   - Root Directory 選 `cloud-app`
   - Node 版本為 20.x（專案已在 `package.json` / `vercel.json` 指定）
4. 依照 `docs/16-cloud-app-deploy.md` 填寫必要環境變數（`ADMIN_TOKEN`、`GEMINI_API_KEY`、`QDRANT_*`、`LINE_*`…）。
5. 部署完成後，在 LINE Developers 將 Webhook 指到：
   - `https://<your-vercel-app>.vercel.app/api/line-webhook`

### Render 一鍵部署 cloud-app

本 repo 內已包含 `cloud-app/render.yaml`，可以用 Render 的「Deploy to Render」按鈕自動建立服務。

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=<YOUR_GITHUB_REPO_URL>&dir=cloud-app)

建議步驟：

1. 同樣將 `<YOUR_GITHUB_REPO_URL>` 換成實際 GitHub 專案網址。
2. 點按鈕登入 Render，確認服務使用 repo 裡的 `cloud-app/render.yaml`。
3. 在 Render 的 Environment 區塊輸入 `docs/16-cloud-app-deploy.md` 中列出的環境變數。
4. 部署完成後，在 LINE Developers 將 Webhook 指到：
   - `https://<your-render-service>.onrender.com/api/line-webhook`

> Vercel / Render 的細節與進階架構（例如 Vercel 做入口、Render 專門跑 RAG）都寫在 `docs/16-cloud-app-deploy.md` 和 `docs/17-n8n-optional-deploy.md`。

---

## 專案結構與說明文件

主要說明都在 `docs/` 目錄，推薦閱讀順序：

- `docs/00-overview.md`：整體說明與架構圖
- `docs/00-overview-env.md`：環境變數與各雲端服務角色
- `docs/01-codespaces-setup.md`：GitHub Codespaces 快速啟動
- `docs/02-google-ai-studio-api-key.md`：取得 Gemini API Key
- `docs/03-qdrant-cloud-setup.md` / `docs/03b-mongodb-atlas-vector-search.md`：向量庫準備
- `docs/04-prepare-knowledge-base.md`：準備知識庫內容
- `docs/05-embedding-ingest-from-codespaces.md`：在 Codespaces 中做 embedding／寫入向量庫
- `docs/06-n8n-cloud-workflow-rag.md`：n8n workflow 架構與匯入
- `docs/07-line-developers-setup.md`：建立 LINE 官方帳號與 Webhook 設定
- `docs/08-keyword-and-rag-routing.md`：關鍵字與 RAG 路由策略
- `docs/09-admin-web-management.md`：cloud-app 管理後台（`/admin`）的操作說明
- `docs/10-secrets-and-security.md`：Secrets 管理與安全性
- `docs/11-ci-cd-with-github-actions.md`：簡易 CI/CD 設定
- `docs/12-troubleshooting.md`：常見錯誤排除
- `docs/13-checklist.md`：上線前檢查清單
- `docs/14-non-md-files-usage.md`：處理非 Markdown 檔案的注意事項
- `docs/15-rate-limits.md`：各雲服務的流量與費用提醒
- `docs/16-cloud-app-deploy.md`：cloud-app 在 Vercel / Render 的完整部署教學
- `docs/17-n8n-optional-deploy.md`：如何把 n8n 串進整體架構（選用）
- `docs/18-test-line-rag.md`：如何在 LINE 端實際驗證 RAG 功能

訊息與錯誤碼相關文件：

- `docs/messages-admin-ui.md`
- `docs/messages-api.md`
- `docs/messages-errors.md`
- `docs/messages-line-bot.md`

---

## 關於 outdated/ 目錄

`outdated/` 裡是早期版本的說明與 AGENTS 設定，主要是為了保留設計過程與歷史，不建議再依照那邊的步驟操作。請以 `docs/` 內的新文件為主。

---

## 開發模式（本機或 Codespaces）

若要在本機或 Codespaces 開發 `cloud-app`：

```bash
cd cloud-app
npm install
npm run dev
```

然後打開 `http://localhost:3000/admin`，輸入你設定的 `ADMIN_TOKEN` 即可進入管理後台。其餘細節請參考 `docs/09-admin-web-management.md`。

---

## n8n �P RAG �쪺�}�o�覡

�n8n �i�H�V�U�ڰѤF�@�ӧ��� RAG �覡�A�H�U���p�ܡG

1. **n8n ���n�Q�� Google Gemini + Qdrant / Atlas**  
   - �b n8n workflow �̪��I�s Gemini �άO�� LLM API�A�M Qdrant / Atlas �V�q�w�ؿ��C  
   - RAG �y�{�]Ău�n8n �쥻���e�u�C

2. **n8n �N cloud-app �[�֦p�u RAG Service**  
   - cloud-app �I�s�� `POST /api/test` ��RAG API�A�ھڷs�@���� `/admin` �W�]�w��� Prompt�B���Ѧ^�h�BVector Backend�B�˯��Ѽơ^�޲z RAG �ʧ@�C  
   - n8n �u�n�� HTTP Request �� cloud-app�G[0m
     - `POST https://<cloud-app>/api/test`�Abody �] `{"question":"�ϥΪ̰��D"}` �^  
     - �N�^�Ǫ�� `answer` ��b LINE Reply API �^�ФW�C  
   - �o�覡�̷ӽT�n�Q�� LLM / RAG �]�w���@�X�޲z�b cloud-app�An8n �t�d����R�O��Ϫ��y�{���X�B�s�p�R���I�s���ӡC

�ݤ��n���~�A�]�i�H���F `docs/06-n8n-cloud-workflow-rag.md` ��n8n workflow ����A�M `docs/17-n8n-optional-deploy.md` ����X�ӫ᥻[�c�A����ѹϥΪ̤��@���쪺���ĳ�C
