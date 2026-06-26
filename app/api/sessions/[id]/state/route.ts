import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/sessionStore";
import { stateStore, type Field } from "@/lib/stateStore";
import { getInterviewerFromCookies } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await sessionStore.get(id);
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });
  const state = await stateStore.get(id);
  return NextResponse.json({ state });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await sessionStore.get(id);
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: { field?: unknown; text?: unknown; clientId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const field = body.field;
  const text = body.text;
  const clientId = body.clientId;
  if (field !== "problem" && field !== "code") {
    return NextResponse.json({ error: "field must be 'problem' or 'code'" }, { status: 400 });
  }
  if (typeof text !== "string") {
    return NextResponse.json({ error: "text must be string" }, { status: 400 });
  }
  if (typeof clientId !== "string" || !clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }
  if (text.length > 200_000) {
    return NextResponse.json({ error: "text too long" }, { status: 413 });
  }

  if (field === "problem") {
    const ok = await getInterviewerFromCookies();
    if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const state = await stateStore.update(id, field as Field, text, clientId);
  return NextResponse.json({ state });
}
