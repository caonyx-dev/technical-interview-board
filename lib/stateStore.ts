import { Redis } from "@upstash/redis";

export type Field = "problem" | "code";

export type SessionState = {
  problem: string;
  code: string;
  problemBy: string;
  codeBy: string;
  problemAt: number;
  codeAt: number;
};

const STATE_KEY = (id: string) => `caonyx:state:${id}`;
const STATE_TTL_S = 60 * 60 * 24;

function redisFromEnv(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

declare global {
  // eslint-disable-next-line no-var
  var __caonyxMemState: Map<string, SessionState> | undefined;
}
const mem: Map<string, SessionState> =
  globalThis.__caonyxMemState ?? (globalThis.__caonyxMemState = new Map());

const redis = redisFromEnv();

const EMPTY: SessionState = { problem: "", code: "", problemBy: "", codeBy: "", problemAt: 0, codeAt: 0 };

export const stateStore = {
  async get(id: string): Promise<SessionState> {
    if (redis) {
      const value = await redis.get<SessionState>(STATE_KEY(id));
      return value ?? EMPTY;
    }
    return mem.get(id) ?? EMPTY;
  },

  async update(id: string, field: Field, text: string, clientId: string): Promise<SessionState> {
    const prev = await this.get(id);
    const now = Date.now();
    const next: SessionState = { ...prev };
    if (field === "problem") {
      next.problem = text;
      next.problemBy = clientId;
      next.problemAt = now;
    } else {
      next.code = text;
      next.codeBy = clientId;
      next.codeAt = now;
    }
    if (redis) {
      await redis.set(STATE_KEY(id), next, { ex: STATE_TTL_S });
    } else {
      mem.set(id, next);
    }
    return next;
  },
};
