import crypto from "node:crypto";
import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "shushu_post_auth";
const AUTH_PAYLOAD = "can_post_memories";

function getAccessPassword(): string {
  const password = process.env.POST_ACCESS_PASSWORD?.trim();
  if (!password) {
    throw new Error("POST_ACCESS_PASSWORD is not set.");
  }
  return password;
}

function getSigningSecret(): string {
  return process.env.AUTH_SECRET?.trim() || getAccessPassword();
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

export function createAuthToken(): string {
  return `${AUTH_PAYLOAD}.${signPayload(AUTH_PAYLOAD)}`;
}

export function verifyAuthToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || payload !== AUTH_PAYLOAD) {
    return false;
  }

  let expected = "";
  try {
    expected = signPayload(payload);
  } catch {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function isPostAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return verifyAuthToken(token);
}

export function verifyPostingPassword(input: string): boolean {
  const expected = getAccessPassword();
  const expectedBuffer = Buffer.from(expected);
  const inputBuffer = Buffer.from(input.trim());

  if (expectedBuffer.length !== inputBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, inputBuffer);
}

export const postAuthCookie = {
  name: AUTH_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 14
};
