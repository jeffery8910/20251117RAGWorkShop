-- Conversations table for Postgres (Vercel Postgres / Neon)
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel_id TEXT,
  user_id TEXT,
  direction TEXT CHECK (direction IN ('in','out')),
  type TEXT CHECK (type IN ('message','reply','error')),
  text TEXT,
  hits JSONB,
  reply_to_id TEXT
);

-- Full-text search index (simple config)
CREATE INDEX IF NOT EXISTS conversations_fts_idx ON conversations USING GIN (to_tsvector('simple', coalesce(text,'')));

-- Secondary indexes for filters
CREATE INDEX IF NOT EXISTS conversations_ts_idx ON conversations (ts DESC);
CREATE INDEX IF NOT EXISTS conversations_user_idx ON conversations (user_id);
CREATE INDEX IF NOT EXISTS conversations_channel_idx ON conversations (channel_id);

