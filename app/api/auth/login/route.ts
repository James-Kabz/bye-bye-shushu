import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthToken, postAuthCookie, verifyPostingPassword } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-utils";

const loginSchema = z.object({
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());

    if (!verifyPostingPassword(body.password)) {
      return NextResponse.json({ message: "Invalid password." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      ...postAuthCookie,
      value: createAuthToken()
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: `Unable to login. ${getErrorMessage(error)}` },
      { status: 400 }
    );
  }
}
