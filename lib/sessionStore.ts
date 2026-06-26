import { nanoid } from "nanoid";

export type Session = {
  id: string;
  createdAt: number;
  name?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __caonyxSessionStore: Map<string, Session> | undefined;
  // eslint-disable-next-line no-var
  var __caonyxIntervieweeSlots: Set<string> | undefined;
}

const store: Map<string, Session> =
  globalThis.__caonyxSessionStore ?? (globalThis.__caonyxSessionStore = new Map());

const intervieweeSlots: Set<string> =
  globalThis.__caonyxIntervieweeSlots ?? (globalThis.__caonyxIntervieweeSlots = new Set());

export const sessionStore = {
  create(name?: string): Session {
    const id = nanoid(10);
    const session: Session = { id, createdAt: Date.now(), name };
    store.set(id, session);
    return session;
  },
  get(id: string): Session | undefined {
    return store.get(id);
  },
  list(): Session[] {
    return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
  },
  delete(id: string): boolean {
    intervieweeSlots.delete(id);
    return store.delete(id);
  },
  claimInterviewee(id: string): boolean {
    if (!store.has(id)) return false;
    if (intervieweeSlots.has(id)) return false;
    intervieweeSlots.add(id);
    return true;
  },
  releaseInterviewee(id: string): void {
    intervieweeSlots.delete(id);
  },
  hasInterviewee(id: string): boolean {
    return intervieweeSlots.has(id);
  },
};
