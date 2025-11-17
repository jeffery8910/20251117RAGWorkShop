import { NextRequest } from 'next/server';
import { aggregate } from '@/lib/mongo';
import { ping as qdrantPing } from '@/lib/qdrant';
import pgPkg from 'pg';
import mysql from 'mysql2/promise';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Check = { name: string; ok: boolean; info?: any; error?: string };

async function checkAtlas(): Promise<Check> {
  const need = ['ATLAS_DATA_API_BASE','ATLAS_DATA_API_KEY','ATLAS_DATA_SOURCE','ATLAS_DATABASE','ATLAS_COLLECTION'];
  const miss = need.filter(k=>!process.env[k]);
  if (miss.length) return { name: 'atlas', ok: false, error: `missing env: ${miss.join(',')}` };
  try {
    // try a harmless aggregate limit 1
    const r: any = await aggregate([{ $limit: 1 }]);
    return { name: 'atlas', ok: true, info: { documents: Array.isArray(r?.documents) ? r.documents.length : 0 } };
  } catch (e:any) {
    return { name: 'atlas', ok: false, error: e?.message || String(e) };
  }
}

async function checkPostgres(): Promise<Check> {
  if (!process.env.DATABASE_URL) return { name: 'pg', ok: false, error: 'missing env: DATABASE_URL' };
  const { Client } = pgPkg; const client = new Client({ connectionString: process.env.DATABASE_URL });
  try { await client.connect(); const r = await client.query('select 1 as ok'); return { name: 'pg', ok: true, info: r.rows[0] }; }
  catch (e:any) { return { name: 'pg', ok: false, error: e?.message || String(e) }; }
  finally { try { await client.end(); } catch {} }
}

async function checkMySQL(): Promise<Check> {
  if (!process.env.MYSQL_URL) return { name: 'mysql', ok: false, error: 'missing env: MYSQL_URL' };
  try {
    const conn = await mysql.createConnection(process.env.MYSQL_URL as string);
    try { const [rows] = await conn.execute('select 1 as ok'); return { name: 'mysql', ok: true, info: rows }; }
    finally { await conn.end(); }
  } catch (e:any) { return { name: 'mysql', ok: false, error: e?.message || String(e) }; }
}

function checkEnvOnly(): Check[] {
  const present = (k:string)=> Boolean(process.env[k] && String(process.env[k]).length>0);
  return [
    { name: 'adminToken', ok: present('ADMIN_TOKEN') },
    { name: 'geminiKey', ok: present('GEMINI_API_KEY') || present('GOOGLE_API_KEY') },
    { name: 'lineSecret', ok: present('LINE_CHANNEL_SECRET') },
    { name: 'lineAccessToken', ok: present('LINE_CHANNEL_ACCESS_TOKEN') },
  ];
}

function envSummary() {
  const has = (k:string)=> Boolean(process.env[k] && String(process.env[k]).length>0);
  const cat = (name:string, reqs:string[])=> ({
    name,
    required: reqs,
    present: reqs.filter(has),
    missing: reqs.filter(k=>!has(k))
  });

  const groups = [
    cat('admin', ['ADMIN_TOKEN']),
    cat('log', ['LOG_PROVIDER']),
    cat('gemini', ['GEMINI_API_KEY','GOOGLE_API_KEY','EMBED_MODEL','GEN_MODEL']),
    cat('line', ['LINE_CHANNEL_SECRET','LINE_CHANNEL_ACCESS_TOKEN']),
    cat('qdrant', ['QDRANT_URL','QDRANT_API_KEY','QDRANT_COLLECTION']),
    cat('atlas', ['ATLAS_DATA_API_BASE','ATLAS_DATA_API_KEY','ATLAS_DATA_SOURCE','ATLAS_DATABASE','ATLAS_COLLECTION','ATLAS_SEARCH_INDEX']),
    cat('postgres', ['DATABASE_URL']),
    cat('mysql', ['MYSQL_URL']),
    cat('supabase', ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']),
    cat('retrieval-params', ['TOPK','SCORE_THRESHOLD','NUM_CANDIDATES'])
  ];
  return groups;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const provider = (process.env.LOG_PROVIDER || 'none').toLowerCase();
  const withDb = url.searchParams.get('withDb') === '1';
  const checks: Check[] = [...checkEnvOnly()];
  if (withDb) {
    // Qdrant (vector store)
    if (process.env.QDRANT_URL && process.env.QDRANT_API_KEY) {
      const qOk = await qdrantPing();
      checks.push({ name: 'qdrant', ok: qOk, error: qOk ? undefined : 'cannot list collections (check QDRANT_URL/API_KEY)' });
    } else {
      checks.push({ name: 'qdrant', ok: false, error: 'not configured' });
    }
    if ((process.env.ATLAS_DATA_API_BASE || process.env.ATLAS_DATA_API_URL) && provider === 'atlas') {
      checks.push(await checkAtlas());
    } else if (provider === 'atlas') {
      checks.push({ name: 'atlas', ok: false, error: 'not configured' });
    }
    if (provider === 'pg') checks.push(await checkPostgres());
    if (provider === 'mysql') checks.push(await checkMySQL());
  }
  const summary = envSummary();
  return new Response(JSON.stringify({ provider, checks, envSummary: summary }), { headers: { 'content-type': 'application/json' } });
}
