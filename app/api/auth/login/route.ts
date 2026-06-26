import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { signInterviewerToken, setInterviewerCookie } from "@/lib/auth";

export async function POST(req: Request) {
  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password !== env.interviewerPassword) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }

  const token = await signInterviewerToken();
  await setInterviewerCookie(token);
  return NextResponse.json({ ok: true });
}
