"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@/lib/sessionStore";

export default function Dashboard({ initialSessions }: { initialSessions: Session[] }) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  async function refresh() {
    const res = await fetch("/api/sessions");
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
    }
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name || undefined }),
      });
      if (res.ok) {
        setName("");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function endSession(id: string) {
    if (!confirm("End this session? The shared link will stop working.")) return;
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function joinUrl(id: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/session/${id}`;
  }

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(joinUrl(id));
      setCopied(id);
    } catch {
      // ignore
    }
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Caonyx Interview</h1>
          <p className="text-sm text-zinc-400">Create a session and share the link with a candidate.</p>
        </div>
        <button onClick={logout} className="text-sm text-zinc-400 hover:text-zinc-200">
          Sign out
        </button>
      </header>

      <form onSubmit={createSession} className="flex gap-2 mb-8">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional label (e.g. Candidate name)"
          className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-teal-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-teal-500 px-4 py-2 font-medium text-zinc-950 hover:bg-teal-400 disabled:opacity-60"
        >
          {busy ? "Creating…" : "New session"}
        </button>
      </form>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-3">Active sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No active sessions yet.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.name ?? `Session ${s.id}`}</div>
                  <div className="text-xs text-zinc-500 truncate">{joinUrl(s.id)}</div>
                </div>
                <a
                  href={`/session/${s.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                >
                  Open
                </a>
                <button
                  onClick={() => copy(s.id)}
                  className="text-xs rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                >
                  {copied === s.id ? "Copied!" : "Copy link"}
                </button>
                <button
                  onClick={() => endSession(s.id)}
                  className="text-xs rounded border border-rose-900 px-2 py-1 text-rose-300 hover:bg-rose-950/40"
                >
                  End
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
