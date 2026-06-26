import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE_NAME = "caonyx_interview_session";
const COOKIE_MAX_AGE_S = 60 * 60 * 12;

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.jwtSecret);
}

export type Role = "interviewer";

export async function signInterviewerToken(): Promise<string> {
  return await new SignJWT({ role: "interviewer" satisfies Role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_S}s`)
    .sign(secretKey());
}

export async function verifyInterviewerToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === "interviewer";
  } catch {
    return false;
  }
}

export async function setInterviewerCookie(token: string) {
  const store = await cookies();
  store.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S,
  });
}

export async function clearInterviewerCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getInterviewerFromCookies(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return await verifyInterviewerToken(token);
}

export const COOKIE = { name: COOKIE_NAME };
