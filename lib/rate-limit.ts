// Rate-limiter distribué (Upstash Redis) avec fallback en mémoire pour le dev local.
//
// Production : configurer UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// Dev local sans Upstash : tombe automatiquement sur la map en mémoire.
//
// La fenêtre est en secondes (sliding window). Les buckets sont créés à la
// demande, indexés par `max` + `windowSec` pour ne pas multiplier les clients.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Entry = { count: number; resetAt: number };
const memoryStore = new Map<string, Entry>();

// Nettoyage périodique du store mémoire — fallback only
if (typeof globalThis.setInterval === "function") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (now > entry.resetAt) memoryStore.delete(key);
    }
  }, 60_000);
}

function inMemoryRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// Singleton Redis + cache par configuration (max, windowSec)
let redisClient: Redis | null = null;
const limiterCache = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

function getLimiter(max: number, windowSec: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${max}:${windowSec}`;
  let limiter = limiterCache.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
      analytics: false,
      prefix: "batiflow:rl",
    });
    limiterCache.set(key, limiter);
  }
  return limiter;
}

/**
 * Retourne true si la requête est autorisée, false si elle dépasse le quota.
 * @param key       Identifiant unique (ex: IP + route)
 * @param max       Nombre max de requêtes par fenêtre
 * @param windowMs  Durée de la fenêtre en ms
 */
export async function rateLimit(key: string, max = 60, windowMs = 60_000): Promise<boolean> {
  const windowSec = Math.max(1, Math.round(windowMs / 1000));
  const limiter = getLimiter(max, windowSec);
  if (limiter) {
    const { success } = await limiter.limit(key);
    return success;
  }
  return inMemoryRateLimit(key, max, windowMs);
}
