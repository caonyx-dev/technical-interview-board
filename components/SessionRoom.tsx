"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { nanoid } from "nanoid";
import type { SessionState, Field } from "@/lib/stateStore";

const PythonEditor = dynamic(() => import("./PythonEditor"), { ssr: false });

type Role = "interviewer" | "interviewee";
type Status = "connecting" | "online" | "offline" | "unavailable";

const POLL_MS = 800;
const POST_DEBOUNCE_MS = 250;
const LOCAL_OWNERSHIP_GRACE_MS = 1500;

export default function SessionRoom({ sessionId, role }: { sessionId: string; role: Role }) {
  const [status, setStatus] = useState<Status>("connecting");
  const [problem, setProblem] = useState("");
  const [code, setCode] = useState("");

  const clientIdRef = useRef<string>("");
  if (!clientIdRef.current) clientIdRef.current = nanoid(8);

  // For each field: when we last sent an edit. Used to ignore our own echo.
  const lastLocalEditAtRef = useRef<Record<Field, number>>({ problem: 0, code: 0 });
  // For each field: the server timestamp we last applied locally.
  const lastAppliedAtRef = useRef<Record<Field, number>>({ problem: 0, code: 0 });
  // Pending POSTs (debounced)
  const postTimersRef = useRef<Record<Field, ReturnType<typeof setTimeout> | null>>({
    problem: null,
    code: null,
  });
  // Latest text we want to send per field (the timer captures whatever's here at fire time).
  const pendingTextRef = useRef<Record<Field, string>>({ problem: "", code: "" });

  const consecutiveErrorsRef = useRef(0);

  const applyRemoteState = useCallback((state: SessionState) => {
    const now = Date.now();
    const myId = clientIdRef.current;

    (["problem", "code"] as Field[]).forEach((field) => {
      const at = field === "problem" ? state.problemAt : state.codeAt;
      const by = field === "problem" ? state.problemBy : state.codeBy;
      const text = field === "problem" ? state.problem : state.code;
      if (at <= lastAppliedAtRef.current[field]) return;
      // Skip our own echoes while we're still actively typing the same field.
      const stillTyping = now - lastLocalEditAtRef.current[field] < LOCAL_OWNERSHIP_GRACE_MS;
      if (by === myId && stillTyping) return;
      lastAppliedAtRef.current[field] = at;
      if (field === "problem") setProblem(text);
      else setCode(text);
    });
  }, []);

  const pollOnce = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/state`, { cache: "no-store" });
      if (res.status === 404) {
        setStatus("unavailable");
        return false;
      }
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { state: SessionState };
      applyRemoteState(data.state);
      consecutiveErrorsRef.current = 0;
      setStatus("online");
      return true;
    } catch {
      consecutiveErrorsRef.current += 1;
      if (consecutiveErrorsRef.current >= 2) setStatus("offline");
      return false;
    }
  }, [sessionId, applyRemoteState]);

  // Initial fetch + polling loop
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (cancelled) return;
      const keepGoing = await pollOnce();
      if (cancelled) return;
      if (keepGoing || consecutiveErrorsRef.current > 0) {
        timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollOnce]);

  const schedulePost = useCallback(
    (field: Field, text: string) => {
      pendingTextRef.current[field] = text;
      lastLocalEditAtRef.current[field] = Date.now();
      if (postTimersRef.current[field]) clearTimeout(postTimersRef.current[field]!);
      postTimersRef.current[field] = setTimeout(async () => {
        postTimersRef.current[field] = null;
        const payload = {
          field,
          text: pendingTextRef.current[field],
          clientId: clientIdRef.current,
        };
        try {
          const res = await fetch(`/api/sessions/${sessionId}/state`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
            cache: "no-store",
          });
          if (res.ok) {
            const data = (await res.json()) as { state: SessionState };
            // Mark this server timestamp as applied so polling doesn't redundantly re-set us.
            lastAppliedAtRef.current[field] =
              field === "problem" ? data.state.problemAt : data.state.codeAt;
            consecutiveErrorsRef.current = 0;
            setStatus("online");
          } else if (res.status === 403) {
            // interviewee tried to edit problem — silently ignore (UI already prevents this)
          } else if (res.status === 404) {
            setStatus("unavailable");
          } else {
            consecutiveErrorsRef.current += 1;
            if (consecutiveErrorsRef.current >= 2) setStatus("offline");
          }
        } catch {
          consecutiveErrorsRef.current += 1;
          if (consecutiveErrorsRef.current >= 2) setStatus("offline");
        }
      }, POST_DEBOUNCE_MS);
    },
    [sessionId],
  );

  // Cleanup pending timers on unmount
  useEffect(() => {
    return () => {
      (["problem", "code"] as Field[]).forEach((f) => {
        const t = postTimersRef.current[f];
        if (t) clearTimeout(t);
      });
    };
  }, []);

  if (status === "unavailable") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Session unavailable</h1>
          <p className="text-zinc-400 text-sm">
            This session either does not exist or has ended.
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
          <span className="text-xs text-zinc-500">
            {interviewee ? "Candidate view" : "Interviewer view"}
          </span>
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
              value={problem}
              readOnly={interviewee}
              wordWrap
              fontSize={13}
              onChange={interviewee ? undefined : (next) => {
                setProblem(next);
                schedulePost("problem", next);
              }}
            />
          </div>
        </section>

        <section className="flex flex-col min-h-0">
          <div className="flex items-center px-3 h-8 border-b border-zinc-800 bg-zinc-950/40">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Code</span>
          </div>
          <div className="flex-1 min-h-0">
            <PythonEditor
              value={code}
              showMinimap
              fontSize={14}
              onChange={(next) => {
                setCode(next);
                schedulePost("code", next);
              }}
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
    online: { color: "bg-teal-400", label: "Synced" },
    offline: { color: "bg-rose-500", label: "Reconnecting…" },
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
