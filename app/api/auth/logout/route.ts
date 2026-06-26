import { NextResponse } from "next/server";
import { clearInterviewerCookie } from "@/lib/auth";

export async function POST() {
  await clearInterviewerCookie();
  return NextResponse.json({ ok: true });
}
