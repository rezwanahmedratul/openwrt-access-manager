import Redis from 'ioredis';

// In-Memory Fallback Cache Store
interface CacheEntry {
  value: string;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry>();

// Periodic in-memory cache purge (every 60s)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.expiresAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 60000).unref?.();
}

let redisClient: Redis | null = null;
let isRedisAvailable = false;

function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      commandTimeout: 500,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) {
          isRedisAvailable = false;
          return null;
        }
        return 500;
      },
    });

    client.on('connect', () => {
      isRedisAvailable = true;
    });

    client.on('ready', () => {
      isRedisAvailable = true;
    });

    client.on('error', () => {
      isRedisAvailable = false;
    });

    client.on('close', () => {
      isRedisAvailable = false;
    });

    redisClient = client;
    return client;
  } catch {
    isRedisAvailable = false;
    return null;
  }
}

/**
 * Retrieve cached value by key with sub-100ms failsafe
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  const client = getRedisClient();

  if (client && isRedisAvailable) {
    try {
      const raw = await Promise.race([
        client.get(key),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 100)),
      ]);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // Fallback to memory
    }
  }

  // Memory fallback
  const entry = memoryStore.get(key);
  if (entry) {
    if (entry.expiresAt > Date.now()) {
      try {
        return JSON.parse(entry.value) as T;
      } catch {
        return null;
      }
    } else {
      memoryStore.delete(key);
    }
  }

  return null;
}

/**
 * Store value in cache with a TTL (seconds)
 */
export async function cacheSet<T = any>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
  const serialized = JSON.stringify(value);

  // Save to memory store first for immediate local availability
  memoryStore.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  const client = getRedisClient();
  if (client && isRedisAvailable) {
    try {
      if (ttlSeconds > 0) {
        await Promise.race([
          client.set(key, serialized, 'EX', ttlSeconds),
          new Promise((resolve) => setTimeout(resolve, 100)),
        ]);
      } else {
        await Promise.race([
          client.set(key, serialized),
          new Promise((resolve) => setTimeout(resolve, 100)),
        ]);
      }
    } catch {
      // Memory store already set
    }
  }
}

/**
 * Delete a specific key
 */
export async function cacheDel(key: string): Promise<void> {
  memoryStore.delete(key);

  const client = getRedisClient();
  if (client && isRedisAvailable) {
    try {
      await Promise.race([
        client.del(key),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
    } catch {
      // Ignored
    }
  }
}

/**
 * Invalidate all keys matching a prefix (e.g. "users:", "config:")
 */
export async function cacheDelPrefix(prefix: string): Promise<void> {
  // Memory store purge
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) {
      memoryStore.delete(key);
    }
  }

  const client = getRedisClient();
  if (client && isRedisAvailable) {
    try {
      await Promise.race([
        (async () => {
          let cursor = '0';
          do {
            const [nextCursor, keys] = await client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length > 0) {
              await client.del(...keys);
            }
          } while (cursor !== '0');
        })(),
        new Promise((resolve) => setTimeout(resolve, 200)),
      ]);
    } catch {
      // Ignored
    }
  }
}

/**
 * Clear the entire cache
 */
export async function cacheFlush(): Promise<void> {
  memoryStore.clear();

  const client = getRedisClient();
  if (client && isRedisAvailable) {
    try {
      await Promise.race([
        client.flushdb(),
        new Promise((resolve) => setTimeout(resolve, 200)),
      ]);
    } catch {
      // Ignored
    }
  }
}

/**
 * Diagnostic status of the Cache Engine
 */
export async function getCacheStatus(): Promise<{
  engine: 'redis' | 'memory';
  connected: boolean;
  keysCount: number;
  pingMs: number;
}> {
  const client = getRedisClient();

  if (client && isRedisAvailable) {
    try {
      const start = Date.now();
      const pingResult = await Promise.race([
        client.ping(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 200)),
      ]);

      if (pingResult === 'PONG') {
        const pingMs = Math.max(0, Date.now() - start);
        const dbSize = await client.dbsize();
        return {
          engine: 'redis',
          connected: true,
          keysCount: dbSize,
          pingMs,
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    engine: 'memory',
    connected: true,
    keysCount: memoryStore.size,
    pingMs: 0,
  };
}
