type Task<T> = () => Promise<T>;

class SimpleLimiter {
  private queue: Array<{ run: () => void }>; 
  private running: number;
  private lastStartAt: number;
  private minDelayMs: number;
  private maxConcurrency: number;

  constructor(opts: { minDelayMs: number; maxConcurrency: number }) {
    this.queue = [];
    this.running = 0;
    this.lastStartAt = 0;
    this.minDelayMs = Math.max(0, opts.minDelayMs || 0);
    this.maxConcurrency = Math.max(1, opts.maxConcurrency || 1);
  }

  schedule<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        const now = Date.now();
        const wait = Math.max(0, this.lastStartAt + this.minDelayMs - now);
        try {
          this.running++;
          if (wait > 0) await new Promise(r => setTimeout(r, wait));
          this.lastStartAt = Date.now();
          const result = await task();
          resolve(result);
        } catch (e) { reject(e); }
        finally {
          this.running--;
          this.dequeue();
        }
      };
      this.queue.push({ run });
      this.dequeue();
    });
  }

  private dequeue() {
    while (this.running < this.maxConcurrency && this.queue.length) {
      const next = this.queue.shift();
      next?.run();
    }
  }
}

const limiters = new Map<string, SimpleLimiter>();

function msFromRate(per: number | undefined, windowMs: number) {
  if (!per || per <= 0) return 0;
  return Math.ceil(windowMs / per);
}

function getNumeric(name: string, def?: number) {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export function getLimiter(name: 'gemini'|'gemini_embed'|'gemini_embed_te'|'gemini_embed_ge'|'gemini_gen'|'qdrant'|'line'|'default') {
  if (limiters.has(name)) return limiters.get(name)!;
  const prefix = name.toUpperCase();
  const rps = getNumeric(`${prefix}_RPS`);
  const rpm = getNumeric(`${prefix}_RPM`);
  const conc = getNumeric(`${prefix}_MAX_CONCURRENCY`, 1)!;
  const minDelayMs = Math.max(msFromRate(rps, 1000), msFromRate(rpm, 60_000));
  const lim = new SimpleLimiter({ minDelayMs, maxConcurrency: conc });
  limiters.set(name, lim);
  return lim;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export async function limitedFetch(name: 'gemini'|'qdrant'|'line'|'default', url: string, init: RequestInit & { retry?: number } = {}) {
  const limiter = getLimiter(name);
  const maxRetry = getNumeric('GLOBAL_RETRY_MAX', 4)!;
  const baseDelay = getNumeric('GLOBAL_RETRY_BASE_MS', 500)!;
  const maxDelay = getNumeric('GLOBAL_RETRY_MAX_DELAY_MS', 5000)!;

  let attempt = 0;
  while (true) {
    try {
      return await limiter.schedule(() => fetch(url, init));
    } catch (e) {
      throw e;
    }
    finally {}
    attempt++;
    if (attempt > maxRetry) throw new Error(`fetch failed after ${maxRetry} retries`);
    const jitter = Math.random() * baseDelay;
    const delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt)) + jitter;
    await sleep(delay);
  }
}

export async function limitedJsonPost(name: 'gemini'|'gemini_embed'|'gemini_embed_te'|'gemini_embed_ge'|'gemini_gen'|'qdrant'|'line'|'default', url: string, headers: Record<string,string>, body: any, attempt=0) {
  const res = await getLimiter(name).schedule(() => fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  }));
  if (res.status === 429 || res.status === 503) {
    // basic backoff on rate limit responses
    const retryAfter = Number(res.headers.get('retry-after'));
    const wait = Number.isFinite(retryAfter) ? retryAfter * 1000 : getNumeric('GLOBAL_RETRY_BASE_MS', 500)!;
    const maxRetry = getNumeric('GLOBAL_RETRY_MAX', 4)!;
    if (attempt >= maxRetry) return res; // give up to caller
    await sleep(wait + Math.random()*200);
    return limitedJsonPost(name, url, headers, body, attempt+1);
  }
  return res;
}
