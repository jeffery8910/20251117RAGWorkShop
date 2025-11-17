import { aggregateOn, insertOne } from './mongo';
import { atlasDriverConfigured, driverLogConversation as drvLogConv, driverListConversations as drvListConvs, driverGetConversationById as drvGetConv } from './atlas-driver';
import crypto from 'crypto';
import pgPkg from 'pg';
import mysql from 'mysql2/promise';

export type ConvEntry = {
  id?: string;
  replyToId?: string;
  channelId?: string;
  userId?: string;
  direction: 'in'|'out';
  type: 'message'|'reply'|'error';
  text?: string;
  hits?: any[];
  meta?: any;
};

const PROVIDER = process.env.LOG_PROVIDER || 'atlas';

function ensureId(e: ConvEntry): ConvEntry { return { id: e.id ?? crypto.randomUUID(), ...e }; }

export async function logConversation(entry: ConvEntry) {
  const e = ensureId(entry);
  if (PROVIDER === 'atlas') {
    await insertOne({ ...e, ts: new Date().toISOString() }, 'conversations');
    return;
  }
  if (PROVIDER === 'atlas-driver') {
    await drvLogConv(e);
    return;
  }
  if (PROVIDER === 'supabase') {
    const url = process.env.SUPABASE_URL as string;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    const res = await fetch(`${url}/rest/v1/conversations`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ ...e, ts: new Date().toISOString() })
    });
    if (!res.ok) throw new Error(`Supabase insert failed: ${res.status} ${await res.text()}`);
    return;
  }
  if (PROVIDER === 'pg') {
    const { Client } = pgPkg; const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query(
        `INSERT INTO conversations
         (id, ts, channel_id, user_id, direction, type, text, hits, reply_to_id)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8)`,
        [e.id, e.channelId ?? null, e.userId ?? null, e.direction, e.type, e.text ?? null, e.hits ? JSON.stringify(e.hits) : null, e.replyToId ?? null]
      );
    } finally { await client.end(); }
    return;
  }
  if (PROVIDER === 'mysql') {
    const conn = await mysql.createConnection(process.env.MYSQL_URL as string);
    try {
      await conn.execute(
        `INSERT INTO conversations
         (id, ts, channel_id, user_id, direction, type, text, hits, reply_to_id)
         VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.channelId ?? null, e.userId ?? null, e.direction, e.type, e.text ?? null, e.hits ? JSON.stringify(e.hits) : null, e.replyToId ?? null]
      );
    } finally { await conn.end(); }
    return;
  }
  throw new Error(`LOG_PROVIDER=${PROVIDER} not implemented. Supported: atlas`);
}

export async function listConversations(limit=50, filters: { userId?: string; channelId?: string; q?: string; from?: string; to?: string } = {}) {
  if (PROVIDER === 'atlas') {
    const match: any = {};
    if (filters.userId) match.userId = filters.userId;
    if (filters.channelId) match.channelId = filters.channelId;
    if (filters.from || filters.to) match.ts = {};
    if (filters.from) match.ts.$gte = new Date(filters.from as string);
    if (filters.to) match.ts.$lte = new Date(filters.to as string);
    const pipe: any[] = [ { $match: match } ];
    if (filters.q) pipe.push({ $match: { text: { $regex: filters.q, $options: 'i' } } });
    pipe.push({ $sort: { ts: -1 } }, { $limit: Math.min(Math.max(limit, 1), 200) });
    const r: any = await aggregateOn('conversations', pipe);
    return r?.documents ?? [];
  }
  if (PROVIDER === 'atlas-driver') {
    return drvListConvs(limit, filters);
  }
  if (PROVIDER === 'supabase') {
    const url = process.env.SUPABASE_URL as string;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    const params = new URLSearchParams({ select: '*', order: 'ts.desc', limit: String(Math.min(Math.max(limit,1),200)) });
    if (filters.userId) params.append('userId', `eq.${filters.userId}`);
    if (filters.channelId) params.append('channelId', `eq.${filters.channelId}`);
    if (filters.from) params.append('ts', `gte.${new Date(filters.from).toISOString()}`);
    if (filters.to) params.append('ts', `lte.${new Date(filters.to).toISOString()}`);
    const res = await fetch(`${url}/rest/v1/conversations?${params}`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    if (!res.ok) throw new Error(`Supabase select failed: ${res.status} ${await res.text()}`);
    let rows = await res.json();
    if (filters.q) rows = rows.filter((r:any)=> (r.text||'').toLowerCase().includes(filters.q!.toLowerCase()));
    return rows;
  }
  if (PROVIDER === 'pg') {
    const { Client } = pgPkg; const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const parts: string[] = [];
      const vals: any[] = [];
      if (filters.userId) { vals.push(filters.userId); parts.push(`user_id = $${vals.length}`); }
      if (filters.channelId) { vals.push(filters.channelId); parts.push(`channel_id = $${vals.length}`); }
      if (filters.from) { vals.push(filters.from); parts.push(`ts >= $${vals.length}`); }
      if (filters.to) { vals.push(filters.to); parts.push(`ts <= $${vals.length}`); }
      let where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
      let searchJoin = '';
      if (filters.q) {
        vals.push(filters.q);
        where += where ? ` AND to_tsvector('simple', coalesce(text,'')) @@ plainto_tsquery('simple', $${vals.length})` : `WHERE to_tsvector('simple', coalesce(text,'')) @@ plainto_tsquery('simple', $${vals.length})`;
      }
      vals.push(Math.min(Math.max(limit,1),200));
      const sql = `SELECT id, ts, channel_id as "channelId", user_id as "userId", direction, type, text FROM conversations ${where} ORDER BY ts DESC LIMIT $${vals.length}`;
      const r = await client.query(sql, vals);
      return r.rows;
    } finally { await client.end(); }
  }
  if (PROVIDER === 'mysql') {
    const conn = await mysql.createConnection(process.env.MYSQL_URL as string);
    try {
      const parts: string[] = [];
      const vals: any[] = [];
      if (filters.userId) { parts.push('user_id = ?'); vals.push(filters.userId); }
      if (filters.channelId) { parts.push('channel_id = ?'); vals.push(filters.channelId); }
      if (filters.from) { parts.push('ts >= ?'); vals.push(filters.from); }
      if (filters.to) { parts.push('ts <= ?'); vals.push(filters.to); }
      if (filters.q) { parts.push('MATCH(text) AGAINST(? IN BOOLEAN MODE)'); vals.push(`+${filters.q.replace(/\s+/g,'* +')}*`); }
      const where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
      vals.push(Math.min(Math.max(limit,1),200));
      const [rows] = await conn.execute(`SELECT id, ts, channel_id as channelId, user_id as userId, direction, type, text FROM conversations ${where} ORDER BY ts DESC LIMIT ?`, vals);
      return rows as any[];
    } finally { await conn.end(); }
  }
  throw new Error(`LOG_PROVIDER=${PROVIDER} not implemented. Supported: atlas`);
}

export async function getConversationById(id: string) {
  if (PROVIDER === 'atlas') {
    const r: any = await aggregateOn('conversations', [ { $match: { id } }, { $limit: 1 } ]);
    return (r?.documents ?? [])[0] || null;
  }
  if (PROVIDER === 'atlas-driver') {
    return drvGetConv(id);
  }
  if (PROVIDER === 'supabase') {
    const url = process.env.SUPABASE_URL as string;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const res = await fetch(`${url}/rest/v1/conversations?id=eq.${id}&select=*`, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
    if (!res.ok) throw new Error(`Supabase select failed: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    return rows[0] || null;
  }
  if (PROVIDER === 'pg') {
    const { Client } = pgPkg; const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect(); try {
      const r = await client.query(`SELECT id, ts, channel_id as "channelId", user_id as "userId", direction, type, text, hits, reply_to_id as "replyToId" FROM conversations WHERE id = $1 LIMIT 1`, [id]);
      return r.rows[0] || null;
    } finally { await client.end(); }
  }
  if (PROVIDER === 'mysql') {
    const conn = await mysql.createConnection(process.env.MYSQL_URL as string);
    try {
      const [rows] = await conn.execute(`SELECT id, ts, channel_id as channelId, user_id as userId, direction, type, text, hits, reply_to_id as replyToId FROM conversations WHERE id = ? LIMIT 1`, [id]);
      return (rows as any[])[0] || null;
    } finally { await conn.end(); }
  }
  throw new Error(`LOG_PROVIDER=${PROVIDER} not implemented. Supported: atlas, atlas-driver, supabase, pg, mysql`);
}
