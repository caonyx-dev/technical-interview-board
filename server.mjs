import { createServer } from "node:http";
import { parse } from "node:url";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils";
import { jwtVerify } from "jose";
import nextEnv from "@next/env";
import next from "next";

const { loadEnvConfig } = nextEnv;

const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(process.cwd(), dev);

// Shared in-memory state between this WS server and the Next.js process.
// sessionStore.ts uses globalThis with `??=` so it'll pick up these instances.
globalThis.__caonyxSessionStore ??= new Map();
globalThis.__caonyxIntervieweeSlots ??= new Set();

const port = Number(process.env.PORT ?? 3002);
const app = next({ dev, hostname: "localhost", port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => handle(req, res, parse(req.url, true)));
const wss = new WebSocketServer({ noServer: true });

const COOKIE_NAME = "caonyx_interview_session";

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

async function isInterviewer(cookieHeader) {
  const token = parseCookies(cookieHeader)[COOKIE_NAME];
  if (!token) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.role === "interviewer";
  } catch {
    return false;
  }
}

function reject(socket, status, msg) {
  socket.write(`HTTP/1.1 ${status} ${msg}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

httpServer.on("upgrade", async (req, socket, head) => {
  let pathname;
  try {
    pathname = parse(req.url, true).pathname ?? "";
  } catch {
    socket.destroy();
    return;
  }

  // Let Next handle its own HMR sockets.
  if (!pathname.startsWith("/yjs/")) {
    if (pathname.startsWith("/_next/")) return;
    socket.destroy();
    return;
  }

  const sessionId = decodeURIComponent(pathname.slice("/yjs/".length));
  const sessions = globalThis.__caonyxSessionStore;
  const slots = globalThis.__caonyxIntervieweeSlots;

  if (!sessions.has(sessionId)) {
    return reject(socket, 404, "Session Not Found");
  }

  const interviewer = await isInterviewer(req.headers.cookie);

  if (!interviewer) {
    if (slots.has(sessionId)) {
      return reject(socket, 409, "Session Occupied");
    }
    slots.add(sessionId);
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    if (!interviewer) {
      const release = () => slots.delete(sessionId);
      ws.on("close", release);
      ws.on("error", release);
    }
    setupWSConnection(ws, req, { docName: sessionId, gc: true });
  });
});

httpServer.listen(port, () => {
  console.log(`Caonyx Interview ready on http://localhost:${port}`);
});
