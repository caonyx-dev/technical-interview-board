// Standalone y-websocket server for production. Deploy this on Render / Railway / Fly.
//
// Env vars:
//   PORT                      — port to listen on (default 1234)
//   JWT_SECRET                — same secret as the Next.js app; lets us identify interviewers
//   ALLOWED_ORIGIN (optional) — if set, only accept WS upgrades whose Origin matches
//
// Clients connect to:  wss://<host>/yjs/<sessionId>
// Configure NEXT_PUBLIC_YJS_URL on the Next.js side to point at this host.

import { createServer } from "node:http";
import { parse } from "node:url";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils";
import { jwtVerify } from "jose";

const port = Number(process.env.PORT ?? 1234);
const allowedOrigin = process.env.ALLOWED_ORIGIN;
const COOKIE_NAME = "caonyx_interview_session";

const intervieweeSlots = new Set();

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

const httpServer = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", async (req, socket, head) => {
  if (allowedOrigin) {
    const origin = req.headers.origin;
    if (origin && origin !== allowedOrigin) {
      return reject(socket, 403, "Forbidden Origin");
    }
  }

  let pathname;
  try {
    pathname = parse(req.url, true).pathname ?? "";
  } catch {
    socket.destroy();
    return;
  }

  if (!pathname.startsWith("/yjs/")) {
    socket.destroy();
    return;
  }

  const sessionId = decodeURIComponent(pathname.slice("/yjs/".length));
  if (!sessionId) return reject(socket, 400, "Bad Request");

  const interviewer = await isInterviewer(req.headers.cookie);
  if (!interviewer) {
    if (intervieweeSlots.has(sessionId)) {
      return reject(socket, 409, "Session Occupied");
    }
    intervieweeSlots.add(sessionId);
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    if (!interviewer) {
      const release = () => intervieweeSlots.delete(sessionId);
      ws.on("close", release);
      ws.on("error", release);
    }
    setupWSConnection(ws, req, { docName: sessionId, gc: true });
  });
});

httpServer.listen(port, () => {
  console.log(`Caonyx Interview WS server listening on :${port}`);
});
