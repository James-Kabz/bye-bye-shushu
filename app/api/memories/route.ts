import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createMemory, listMemories } from "@/lib/memories";

export async function GET() {
  try {
    const memories = await listMemories();
    return NextResponse.json({ memories });
  } catch (error) {
    console.error("GET /api/memories failed", error);
    return NextResponse.json(
      { message: "Unable to fetch memories right now." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const memory = await createMemory(body);
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid memory data." },
        { status: 400 }
      );
    }

    console.error("POST /api/memories failed", error);
    return NextResponse.json(
      { message: "Could not save this memory. Try again." },
      { status: 500 }
    );
  }
}
