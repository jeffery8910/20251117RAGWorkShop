import { NextRequest } from 'next/server';
import { getConfig as getMongoConfig } from '@/lib/mongo';
import { atlasDriverConfigured, driverGetConfig } from '@/lib/atlas-driver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get('authorization') || '';
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return new Response('unauthorized', { status: 401 });

  // Load config (Atlas driver first if enabled)
  let cfg: any = {};
  if (atlasDriverConfigured()) {
    cfg = (await driverGetConfig()) || {};
  } else {
    cfg = await getMongoConfig();
  }

  const forwardToN8nUrl =
    (cfg.forwardToN8nUrl as string | undefined) || process.env.FORWARD_TO_N8N_URL || '';

  if (!forwardToN8nUrl) {
    return new Response(
      JSON.stringify({ ok: false, error: 'FORWARD_TO_N8N_URL not configured' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    const webhookUrl = new URL(forwardToN8nUrl);
    // Replace path with /rest/ping on the same host to check n8n health
    webhookUrl.pathname = '/rest/ping';
    webhookUrl.search = '';

    const res = await fetch(webhookUrl.toString(), { method: 'GET' });
    const text = await res.text();

    return new Response(
      JSON.stringify({
        ok: res.ok,
        status: res.status,
        url: webhookUrl.toString(),
        bodySample: text.slice(0, 200)
      }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}

