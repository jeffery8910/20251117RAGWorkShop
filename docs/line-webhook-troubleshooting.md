# LINE Webhook 在 Vercel 的 401 / 500 除錯指南

> 針對你遇到的：先 401（簽章不過），後 500（程式在驗簽後崩潰）。本文提供可複製的產線檢查清單、cURL 測試方法與最小可行的 Next.js 伺服器端程式碼。

---

## TL;DR（快速結論）
- 401 Unauthorized 幾乎一定是「X-Line-Signature 與原始 body 不相符」。
- 500 是處理函式在驗簽後拋錯（例如重讀 body、環境變數缺失、Edge runtime 相容性問題、對 LINE Reply API 回應未檢查等）。
- 兩個關鍵：
  1) 產生簽章一定要用「完全相同的原始字串（bytes）」；
  2) 伺服器端「只讀一次原始 body」後驗簽，再 `JSON.parse` 使用。

---

## 必備環境變數（Vercel → Project → Settings → Environment Variables）
- `LINE_CHANNEL_SECRET`（必填，驗簽用）
- `LINE_CHANNEL_ACCESS_TOKEN`（選填，若要回覆訊息時才需要）

注意：
- 請確認變數有建在「Production」環境，並重新部署。Vercel 新增/修改環境變數後需要新部署才會生效。

---

## 測試資料與簽章產生

### 建立測試事件（最小 JSON）
建立 `event.json`（內容可依需求調整）：

```json
{
  "destination": "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "events": [
    {
      "replyToken": "0123456789abcdef0123456789abcdef",
      "type": "message",
      "mode": "active",
      "timestamp": 1700000000000,
      "source": { "type": "user", "userId": "Uaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      "message": { "id": "1", "type": "text", "text": "ping" }
    }
  ]
}
```

### macOS/Linux 產生簽章 + 呼叫（使用 openssl）

```bash
export LINE_CHANNEL_SECRET=你的_SECRET
BODY=$(cat event.json)
SIG=$(printf %s "$BODY" | openssl dgst -sha256 -hmac "$LINE_CHANNEL_SECRET" -binary | openssl base64 -A)

# 用 --data-binary 以避免內容被改寫
curl -i -X POST \
  https://rag-workshop-livid.vercel.app/api/line-webhook \
  -H "content-type: application/json" \
  -H "X-Line-Signature: $SIG" \
  --data-binary "$BODY"
```

重點：`openssl base64` 請用 `-A` 以單行輸出；`--data-binary` 可避免 cURL 對 body 做換行或編碼處理。

### Windows PowerShell 產生簽章 + 呼叫（無需 openssl）

```powershell
$secret = $env:LINE_CHANNEL_SECRET  # 或直接字串
$body   = Get-Content .\event.json -Raw
$hmac   = New-Object System.Security.Cryptography.HMACSHA256([Text.Encoding]::UTF8.GetBytes($secret))
$sig    = [Convert]::ToBase64String($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body)))

curl -i -Method POST `
  https://rag-workshop-livid.vercel.app/api/line-webhook `
  -H "content-type: application/json" `
  -H "X-Line-Signature: $sig" `
  -Body $body
```

---

## Next.js（App Router）最小可行處理器

- 適用檔案：`app/api/line-webhook/route.ts`
- 強制使用 Node runtime，避免 Edge 與 Node `crypto` 相容性問題。
- 僅在通過驗簽後才 `JSON.parse`；全程只讀一次原始 body。

```ts
// app/api/line-webhook/route.ts
import crypto from 'crypto';
import type { NextRequest } from 'next/server';
export const runtime = 'nodejs';

function hmacBase64(body: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64');
}
function safeEqual(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

export async function POST(req: NextRequest) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const token  = process.env.LINE_CHANNEL_ACCESS_TOKEN; // 可能為空
  if (!secret) {
    console.error('Missing LINE_CHANNEL_SECRET');
    return new Response(null, { status: 500 });
  }

  const sig  = req.headers.get('x-line-signature') ?? '';
  const body = await req.text(); // 只讀一次！
  const expected = hmacBase64(body, secret);
  if (!safeEqual(sig, expected)) {
    return new Response('invalid signature', { status: 401 });
  }

  try {
    const payload = JSON.parse(body);
    const ev = payload?.events?.[0];

    // 可選：回覆訊息（token 存在且有 replyToken 才嘗試）
    if (token && ev?.replyToken) {
      const res = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          replyToken: ev.replyToken,
          messages: [{ type: 'text', text: 'pong' }],
        }),
      });
      if (!res.ok) {
        console.error('LINE reply failed', res.status, await res.text());
      }
    }

    // 總是回 200，避免 LINE 重試風暴
    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error('handler crashed', e);
    return new Response(null, { status: 500 });
  }
}
```

---

## Next.js（Pages Router）替代方案（若你的專案是 `pages/api`）

- 停用預設 body parser，保留原始 bytes 做驗簽。
- 可用 `raw-body`（需安裝）或自行累積 `req` 的 chunk 取得字串。

```ts
// pages/api/line-webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export const config = { api: { bodyParser: false } };

function hmacBase64(body: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64');
}
function safeEqual(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

async function readRawBody(req: NextApiRequest): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const token  = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!secret) {
    console.error('Missing LINE_CHANNEL_SECRET');
    res.status(500).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const body = await readRawBody(req); // 只讀一次
  const sig = (req.headers['x-line-signature'] as string) ?? '';
  const expected = hmacBase64(body, secret);
  if (!safeEqual(sig, expected)) {
    res.status(401).send('invalid signature');
    return;
  }

  try {
    const payload = JSON.parse(body);
    const ev = payload?.events?.[0];

    if (token && ev?.replyToken) {
      const r = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ replyToken: ev.replyToken, messages: [{ type: 'text', text: 'pong' }] }),
      });
      if (!r.ok) console.error('LINE reply failed', r.status, await r.text());
    }

    res.status(200).send('OK');
  } catch (e) {
    console.error('handler crashed', e);
    res.status(500).end();
  }
}
```

---

## 常見陷阱清單（逐一排查）
- 使用 `--data` 而非 `--data-binary`：body 可能被改寫，導致簽章不符。
- `openssl base64` 沒加 `-A`：多了換行，簽章不同。
- 伺服器端讀了兩次 body：先 `req.text()` 驗簽、後 `req.json()` 再讀一次 → 崩潰或空資料。
- 少設 `LINE_CHANNEL_SECRET` 或設在錯誤環境（非 Production）。
- 使用 Edge runtime 但依賴 Node `crypto` 或第三方 SDK（在 Edge 不支援）。
- 對 LINE Reply API 的非 2xx 回應未處理就 throw，導致 500。
- 直接存取 `payload.events[0].xxx`，在空陣列時拋錯。

---

## 驗證流程建議
1) 本地先以相同 `event.json` 產生簽章並 `curl` 到已部署的 endpoint。
2) 先確保 401 → 200 可被穩定重現（401 代表驗簽確實生效）。
3) 接著打開 Vercel → Deployments → 點選該請求 → Functions Logs，觀察是否有 `Missing LINE_CHANNEL_SECRET`、`handler crashed`、`LINE reply failed` 等訊息。
4) 若要回覆訊息，請確保 `LINE_CHANNEL_ACCESS_TOKEN` 正確且未過期；有需要可先將回覆區塊註解掉以隔離問題。

---

## 附錄：純 Node 驗簽（離線比對）

```js
// verify.js
const fs = require('fs');
const crypto = require('crypto');
const secret = process.env.LINE_CHANNEL_SECRET;
const body = fs.readFileSync('event.json', 'utf8');
const sig  = crypto.createHmac('sha256', secret).update(body).digest('base64');
console.log(sig);
```

與 `X-Line-Signature` 對比，應完全一致。

---

## 你現在可以做什麼
- 用本文的 cURL 指令重試：若仍 401，優先檢查簽章的產生與 `--data-binary`；若 500，打開 Vercel Logs 對照本文的錯誤訊息關鍵字。
- 若方便，將你專案中的 `api/line-webhook` 目前版本貼上（可遮蔽機密），我可對照本文最小範例指出差異點並給出最小修補。

