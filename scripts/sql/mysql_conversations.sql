-- Conversations table for MySQL (PlanetScale)
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(191) PRIMARY KEY,
  ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  channel_id VARCHAR(191),
  user_id VARCHAR(191),
  direction ENUM('in','out'),
  type ENUM('message','reply','error'),
  text TEXT,
  hits JSON,
  reply_to_id VARCHAR(191)
) ENGINE=InnoDB;

-- Full-text index for content (InnoDB supports FULLTEXT on MySQL 5.6+; PlanetScale is MySQL-compatible)
CREATE FULLTEXT INDEX IF NOT EXISTS conversations_text_ft ON conversations (text);

-- Secondary indexes
CREATE INDEX IF NOT EXISTS conversations_ts_idx ON conversations (ts);
CREATE INDEX IF NOT EXISTS conversations_user_idx ON conversations (user_id);
CREATE INDEX IF NOT EXISTS conversations_channel_idx ON conversations (channel_id);

