"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <label className="block text-sm text-zinc-400 mb-2">Interviewer password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-teal-500"
        />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal-500 px-3 py-2 font-medium text-zinc-950 hover:bg-teal-400 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
