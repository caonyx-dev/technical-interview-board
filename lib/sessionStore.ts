import { nanoid } from "nanoid";
import { Redis } from "@upstash/redis";

export type Session = {
  id: string;
  createdAt: number;
  name?: string;
};

const SESSION_KEY = (id: string) => `caonyx:session:${id}`;
const SESSION_INDEX = "caonyx:sessions";
const SESSION_TTL_S = 60 * 60 * 24; // 24h — sessions auto-expire

function redisFromEnv(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// In-memory fallback for local dev when no Redis is configured.
declare global {
  // eslint-disable-next-line no-var
  var __caonyxMemSessions: Map<string, Session> | undefined;
}
const mem: Map<string, Session> =
  globalThis.__caonyxMemSessions ?? (globalThis.__caonyxMemSessions = new Map());

const redis = redisFromEnv();

export const sessionStore = {
  async create(name?: string): Promise<Session> {
    const session: Session = { id: nanoid(10), createdAt: Date.now(), name };
    if (redis) {
      await redis.set(SESSION_KEY(session.id), session, { ex: SESSION_TTL_S });
      await redis.zadd(SESSION_INDEX, { score: session.createdAt, member: session.id });
    } else {
      mem.set(session.id, session);
    }
    return session;
  },

  async get(id: string): Promise<Session | undefined> {
    if (redis) {
      const value = await redis.get<Session>(SESSION_KEY(id));
      return value ?? undefined;
    }
    return mem.get(id);
  },

  async list(): Promise<Session[]> {
    if (redis) {
      const ids = (await redis.zrange<string[]>(SESSION_INDEX, 0, -1, { rev: true })) ?? [];
      if (ids.length === 0) return [];
      const values = await Promise.all(ids.map((id) => redis.get<Session>(SESSION_KEY(id))));
      const sessions: Session[] = [];
      const stale: string[] = [];
      values.forEach((v, i) => {
        if (v) sessions.push(v);
        else stale.push(ids[i]);
      });
      if (stale.length) {
        await redis.zrem(SESSION_INDEX, ...stale);
      }
      return sessions;
    }
    return Array.from(mem.values()).sort((a, b) => b.createdAt - a.createdAt);
  },

  async delete(id: string): Promise<boolean> {
    if (redis) {
      const removed = await redis.del(SESSION_KEY(id));
      await redis.zrem(SESSION_INDEX, id);
      return removed > 0;
    }
    return mem.delete(id);
  },
};
