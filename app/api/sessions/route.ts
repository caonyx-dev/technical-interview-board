import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/sessionStore";

export async function GET() {
  const sessions = await sessionStore.list();
  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  let name: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.name === "string" && body.name.trim()) {
      name = body.name.trim().slice(0, 80);
    }
  } catch {
    // body is optional
  }
  const session = await sessionStore.create(name);
  return NextResponse.json({ session });
}
