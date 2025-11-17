import { NextRequest } from 'next/server';
import { getConfig, updateConfig } from '@/lib/mongo';
import { atlasDriverConfigured, driverGetConfig, driverUpdateConfig } from '@/lib/atlas-driver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.headers.get('authorization') || '';
  return token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export async function GET() {
  if (atlasDriverConfigured()) {
    const doc = await driverGetConfig();
    const cfg = doc || {};
    return new Response(JSON.stringify(cfg), { headers: { 'content-type': 'application/json' } });
  }
  const cfg = await getConfig();
  return new Response(JSON.stringify(cfg), { headers: { 'content-type': 'application/json' } });
}

export async function PUT(req: NextRequest) {
  if (!auth(req)) return new Response('unauthorized', { status: 401 });
  const body = await req.json();
  if (atlasDriverConfigured()) {
    await driverUpdateConfig(body);
    const doc = await driverGetConfig();
    return new Response(JSON.stringify(doc||{}), { headers: { 'content-type': 'application/json' } });
  } else {
    await updateConfig(body);
    const cfg = await getConfig();
    return new Response(JSON.stringify(cfg), { headers: { 'content-type': 'application/json' } });
  }
}
