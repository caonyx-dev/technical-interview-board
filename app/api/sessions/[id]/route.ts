import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/sessionStore";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = sessionStore.get(id);
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ session });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = sessionStore.delete(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
