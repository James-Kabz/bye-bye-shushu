import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isPostAuthenticated } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-utils";
import { appendPhotosToMemory, createMemory, deleteMemoryPhoto, listMemories } from "@/lib/memories";

export async function GET() {
  try {
    const memories = await listMemories();
    return NextResponse.json({ memories });
  } catch (error) {
    console.error("GET /api/memories failed", error);
    return NextResponse.json(
      { message: `Unable to fetch memories right now. ${getErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const isAuthorized = await isPostAuthenticated();
    if (!isAuthorized) {
      return NextResponse.json(
        { message: "Login required. Please enter the posting password first." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const isAppend = Boolean(body?.appendToMemoryId);
    let memoryId = "";

    if (isAppend) {
      const appendedMemory = await appendPhotosToMemory(body);
      memoryId = appendedMemory.id;
    } else {
      const createdMemory = await createMemory(body);
      memoryId = createdMemory.id;
    }

    return NextResponse.json(
      {
        ok: true,
        memoryId,
        message: isAppend ? "Photos added successfully." : "Memory saved successfully."
      },
      { status: isAppend ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid memory data." },
        { status: 400 }
      );
    }

    console.error("POST /api/memories failed", error);
    return NextResponse.json(
      { message: `Could not save this memory. ${getErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const isAuthorized = await isPostAuthenticated();
    if (!isAuthorized) {
      return NextResponse.json(
        { message: "Login required. Please enter the posting password first." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { photoId?: string };
    const result = await deleteMemoryPhoto({ photoId: body?.photoId ?? "" });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid delete request." },
        { status: 400 }
      );
    }

    console.error("DELETE /api/memories failed", error);
    return NextResponse.json(
      { message: `Could not delete this photo. ${getErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
