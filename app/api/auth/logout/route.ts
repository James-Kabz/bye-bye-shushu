import { NextResponse } from "next/server";
import { postAuthCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    ...postAuthCookie,
    value: "",
    maxAge: 0
  });

  return response;
}
