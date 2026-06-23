import { NextResponse } from "next/server";
import { getSessionById, updateSession } from "@/lib/interviewDb";

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

    // Verify if original snippet matches
    if (!fileContent.includes(original)) {
      return NextResponse.json({
        error: "original_snippet_mismatch",
        message: `The original snippet to replace was not found in ${filename}. The codebase may have been updated since this suggestion was made.`
      }, { status: 400 });
    }

    // Apply the replacement
    const updatedContent = fileContent.replace(original, replacement);
    codebase[filename] = updatedContent;

    // Save codebase to database
    await updateSession(session_id, { current_codebase: codebase });

    return NextResponse.json({ updated_codebase: codebase });
  } catch (err: any) {
    console.error("Error in /api/interview/accept-change route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
