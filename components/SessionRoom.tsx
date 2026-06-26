"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const PythonEditor = dynamic(() => import("./PythonEditor"), { ssr: false });

type Role = "interviewer" | "interviewee";

type Status = "connecting" | "connected" | "disconnected" | "unavailable";

export default function SessionRoom({ sessionId, role }: { sessionId: string; role: Role }) {
  const [status, setStatus] = useState<Status>("connecting");
  const [failures, setFailures] = useState(0);

  const { doc, provider, problemText, codeText } = useMemo(() => {
    const doc = new Y.Doc();
    const wsUrl = typeof window === "undefined"
      ? ""
      : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/yjs`;
    const provider = new WebsocketProvider(wsUrl, sessionId, doc, { connect: false });
    const problemText = doc.getText("problem");
    const codeText = doc.getText("code");
    return { doc, provider, problemText, codeText };
  }, [sessionId]);

  const connectedOnceRef = useRef(false);

  useEffect(() => {
    const onStatus = (e: { status: "connecting" | "connected" | "disconnected" }) => {
      if (e.status === "connected") {
        connectedOnceRef.current = true;
        setFailures(0);
        setStatus("connected");
      } else if (e.status === "connecting") {
        setStatus((prev) => (prev === "connected" ? "connected" : "connecting"));
      } else {
        setStatus("disconnected");
      }
    };
    const onConnectionError = () => {
      setFailures((n) => n + 1);
    };
    const onConnectionClose = (e?: CloseEvent) => {
      // Server uses HTTP-status-bearing rejections before WS handshake completes.
      // After WS opens, an immediate close with code 1006 + never having connected → likely unavailable.
      if (!connectedOnceRef.current) {
        setFailures((n) => n + 1);
      }
      // Some servers send specific close codes; treat 4409 / 4404 as fatal if we wired them later.
      if (e && (e.code === 4409 || e.code === 4404)) {
        setStatus("unavailable");
        provider.disconnect();
      }
    };

    provider.on("status", onStatus);
    provider.on("connection-error", onConnectionError);
    provider.on("connection-close", onConnectionClose);
    provider.connect();

    return () => {
      provider.off("status", onStatus);
      provider.off("connection-error", onConnectionError);
      provider.off("connection-close", onConnectionClose);
      provider.disconnect();
      provider.destroy();
      doc.destroy();
    };
  }, [provider, doc]);

  // After several failures without ever connecting, surface "unavailable".
  useEffect(() => {
    if (failures >= 3 && !connectedOnceRef.current) {
      setStatus("unavailable");
      provider.disconnect();
    }
  }, [failures, provider]);

  if (status === "unavailable") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Session unavailable</h1>
          <p className="text-zinc-400 text-sm">
            This session either does not exist, has ended, or the candidate slot is already in use.
          </p>
        </div>
      </main>
    );
  }

  const interviewee = role === "interviewee";

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 h-12 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Caonyx Interview</span>
          <span className="text-xs text-zinc-500">·</span>
          <span className="text-xs text-zinc-500">{interviewee ? "Candidate view" : "Interviewer view"}</span>
        </div>
        <StatusDot status={status} />
      </header>

      <div className="flex-1 grid grid-cols-[2fr_3fr] min-h-0">
        <section className="flex flex-col border-r border-zinc-800 min-h-0">
          <div className="flex items-center justify-between px-3 h-8 border-b border-zinc-800 bg-zinc-950/40">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Problem</span>
            {interviewee && <span className="text-xs text-zinc-600">read-only</span>}
          </div>
          <div className="flex-1 min-h-0">
            <PythonEditor
              yText={problemText}
              awareness={provider.awareness}
              readOnly={interviewee}
              wordWrap
              fontSize={13}
            />
          </div>
        </section>

        <section className="flex flex-col min-h-0">
          <div className="flex items-center px-3 h-8 border-b border-zinc-800 bg-zinc-950/40">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Code</span>
          </div>
          <div className="flex-1 min-h-0">
            <PythonEditor
              yText={codeText}
              awareness={provider.awareness}
              readOnly={false}
              showMinimap
              fontSize={14}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusDot({ status }: { status: Status }) {
  const map: Record<Status, { color: string; label: string }> = {
    connecting: { color: "bg-amber-400", label: "Connecting…" },
    connected: { color: "bg-teal-400", label: "Connected" },
    disconnected: { color: "bg-rose-500", label: "Reconnecting…" },
    unavailable: { color: "bg-zinc-600", label: "Unavailable" },
  };
  const { color, label } = map[status];
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      {label}
    </div>
  );
}
