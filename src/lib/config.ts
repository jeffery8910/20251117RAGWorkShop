import { getConfig as getEnvConfig } from './mongo';
import { atlasDriverConfigured, driverGetConfig } from './atlas-driver';

export type RuntimeConfig = {
  prompt: string;
  keywords: string[];
  TOPK: number;
  SCORE_THRESHOLD: number;
  NUM_CANDIDATES: number;
};

const defaultCfg: RuntimeConfig = {
  prompt: process.env.DEFAULT_PROMPT || '你是一位助教。請根據提供的教材內容回答問題，清楚引用來源（檔名與頁碼/段落）。',
  keywords: (process.env.DEFAULT_KEYWORDS || 'help,課程,教材').split(',').map(s=>s.trim()).filter(Boolean),
  TOPK: Number(process.env.TOPK || 6),
  SCORE_THRESHOLD: Number(process.env.SCORE_THRESHOLD || 0.1),
  NUM_CANDIDATES: Number(process.env.NUM_CANDIDATES || 400)
};

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    // 優先使用 Atlas Driver（MONGODB_URI），否則退回環境變數／預設值
    if (atlasDriverConfigured()) {
      const cfg = await driverGetConfig();
      if (cfg) return { ...defaultCfg, ...cfg };
    } else {
      const cfg = await getEnvConfig();
      if (cfg) return { ...defaultCfg, ...cfg };
    }
  } catch {}
  return defaultCfg;
}
