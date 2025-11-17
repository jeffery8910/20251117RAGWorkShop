import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export function atlasDriverConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);
}

async function getDb(): Promise<Db> {
  if (!atlasDriverConfigured()) throw new Error('MONGODB_URI and MONGODB_DB required');
  if (db) return db;
  client = new MongoClient(process.env.MONGODB_URI as string, { maxPoolSize: 5 });
  await client.connect();
  db = client.db(process.env.MONGODB_DB as string);
  return db!;
}

function colName(name: 'logs'|'conversations'|'config'): string {
  if (name === 'logs') return process.env.MONGODB_COLLECTION_LOGS || 'logs';
  if (name === 'conversations') return process.env.MONGODB_COLLECTION_CONVERSATIONS || 'conversations';
  return process.env.MONGODB_COLLECTION_CONFIG || 'config';
}

// Config document shape (_id usually 'default')
type ConfigDoc = {
  _id: string;
  prompt?: string;
  keywords?: string[];
  TOPK?: number;
  SCORE_THRESHOLD?: number;
  NUM_CANDIDATES?: number;
  forwardToN8nUrl?: string;
  forwardRule?: string;
};

// Config
export async function driverGetConfig(): Promise<any> {
  const dbo = await getDb();
  const coll = dbo.collection<ConfigDoc>(colName('config'));
  const doc = await coll.findOne({ _id: 'default' });
  return doc || null;
}

export async function driverUpdateConfig(patch: any): Promise<void> {
  const dbo = await getDb();
  const coll = dbo.collection<ConfigDoc>(colName('config'));
  await coll.updateOne({ _id: 'default' }, { $set: patch }, { upsert: true });
}

// Logs (generic small logs table)
export async function driverInsertLog(entry: any): Promise<void> {
  const dbo = await getDb();
  await dbo.collection(colName('logs')).insertOne({ ...entry, ts: new Date().toISOString() });
}

export async function driverListLogs(limit = 50): Promise<any[]> {
  const dbo = await getDb();
  const arr = await dbo.collection(colName('logs')).find({}).sort({ ts: -1 }).limit(Math.min(Math.max(limit,1),200)).toArray();
  return arr;
}

// Conversations
export type ConvFilters = { userId?: string; channelId?: string; q?: string; from?: string; to?: string };

export async function driverLogConversation(entry: any): Promise<void> {
  const dbo = await getDb();
  await dbo.collection(colName('conversations')).insertOne({ ...entry, ts: new Date() });
}

export async function driverListConversations(limit=50, filters: ConvFilters = {}): Promise<any[]> {
  const dbo = await getDb();
  const query: any = {};
  if (filters.userId) query.userId = filters.userId;
  if (filters.channelId) query.channelId = filters.channelId;
  if (filters.from || filters.to) {
    query.ts = {};
    if (filters.from) query.ts.$gte = new Date(filters.from);
    if (filters.to) query.ts.$lte = new Date(filters.to);
  }
  if (filters.q) {
    query.text = { $regex: filters.q, $options: 'i' };
  }
  const arr = await dbo.collection(colName('conversations'))
    .find(query)
    .sort({ ts: -1 })
    .limit(Math.min(Math.max(limit,1), 200))
    .toArray();
  return arr;
}

export async function driverGetConversationById(id: string): Promise<any | null> {
  const dbo = await getDb();
  const row = await dbo.collection(colName('conversations')).findOne({ id });
  return row || null;
}
