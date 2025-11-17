import crypto from 'crypto';

export function verifyLineSignature(rawBody: string, signature: string) {
  const secret = process.env.LINE_CHANNEL_SECRET as string;
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try { return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature||'')); }
  catch { return false; }
}

export type LineMessage = any; // 直接沿用 LINE Messaging API 結構

export async function replyToLine(replyToken: string, textOrMessages: string | LineMessage[]) {
  const messages: LineMessage[] = typeof textOrMessages === 'string'
    ? [{ type: 'text', text: textOrMessages }]
    : textOrMessages;

  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ replyToken, messages })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LINE reply failed: ${res.status} ${t}`);
  }
}
