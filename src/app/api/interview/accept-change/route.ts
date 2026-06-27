import { NextResponse } from "next/server";
import { getSessionById, updateSession } from "@/lib/interviewDb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get("session_id");

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id parameter" }, { status: 400 });
    }

    const session = await getSessionById(session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (err: any) {
    console.error("Error fetching session:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { session_id, filename, original, replacement } = body;

    if (!session_id || !filename || original === undefined || replacement === undefined) {
      return NextResponse.json({ error: "Missing required parameters: session_id, filename, original, or replacement" }, { status: 400 });
    }

    const session = await getSessionById(session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const codebase = { ...(session.current_codebase || {}) };
    const fileContent = codebase[filename];

    if (fileContent === undefined) {
      return NextResponse.json({ error: `File '${filename}' does not exist in the codebase` }, { status: 400 });
    }

    // Normalize CRLF to LF to prevent Windows vs LLM line ending mismatches
    const normalizeLineEndings = (str: string) => str.replace(/\r\n/g, "\n");
    const normalizedContent = normalizeLineEndings(fileContent);
    const normalizedOriginal = normalizeLineEndings(original);
    const normalizedReplacement = normalizeLineEndings(replacement);

    // Verify if original snippet matches
    if (!normalizedContent.includes(normalizedOriginal)) {
      return NextResponse.json({
        error: "original_snippet_mismatch",
        message: `The original snippet to replace was not found in ${filename}. The codebase may have been updated since this suggestion was made.`
      }, { status: 400 });
    }

    // Apply the replacement on normalized content
    const updatedContent = normalizedContent.replace(normalizedOriginal, normalizedReplacement);
    codebase[filename] = updatedContent;

    // Save codebase to database
    await updateSession(session_id, { current_codebase: codebase });

    return NextResponse.json({ updated_codebase: codebase });
  } catch (err: any) {
    console.error("Error in /api/interview/accept-change route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
