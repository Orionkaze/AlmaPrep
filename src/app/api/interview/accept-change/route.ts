import { NextResponse } from "next/server";
import { getSessionById, updateSession } from "@/lib/interviewDb";
import { createClient } from "@/lib/supabase/server";
import { getRequestUserId } from "@/lib/getRequestUserId";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get("session_id");

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id parameter" }, { status: 400 });
    }

    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await getSessionById(session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("users")
      .select("github_autosave")
      .eq("id", session.user_id)
      .maybeSingle();

    return NextResponse.json({
      ...session,
      github_autosave: !!profile?.github_autosave
    });
  } catch (err) {
    console.error("Error fetching session:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { session_id, filename, original, replacement } = body;

    if (!session_id || !filename || original === undefined || replacement === undefined) {
      return NextResponse.json({ error: "Missing required parameters: session_id, filename, original, or replacement" }, { status: 400 });
    }

    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await getSessionById(session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    let updatedContent = "";

    if (normalizedContent.includes(normalizedOriginal)) {
      updatedContent = normalizedContent.replace(normalizedOriginal, normalizedReplacement);
    } else {
      // Fallback: Attempt to find and replace ignoring all whitespace differences (spaces, tabs, newlines)
      const cleanOriginal = normalizedOriginal.replace(/\s+/g, "");
      if (!cleanOriginal) {
        return NextResponse.json({
          error: "empty_original_snippet",
          message: "The original snippet is empty."
        }, { status: 400 });
      }

      let origIdx = 0;
      let startIdx = -1;
      let endIdx = -1;

      for (let i = 0; i < normalizedContent.length; i++) {
        const char = normalizedContent[i];
        if (/\s/.test(char)) {
          continue;
        }

        if (char === cleanOriginal[origIdx]) {
          if (origIdx === 0) {
            startIdx = i;
          }
          origIdx++;
          if (origIdx === cleanOriginal.length) {
            endIdx = i + 1;
            break;
          }
        } else {
          if (startIdx !== -1) {
            i = startIdx;
            startIdx = -1;
            origIdx = 0;
          }
        }
      }

      if (startIdx !== -1 && endIdx !== -1 && origIdx === cleanOriginal.length) {
        updatedContent = normalizedContent.slice(0, startIdx) + normalizedReplacement + normalizedContent.slice(endIdx);
      } else {
        return NextResponse.json({
          error: "original_snippet_mismatch",
          message: `The original snippet to replace was not found in ${filename}. The codebase may have been updated since this suggestion was made.`
        }, { status: 400 });
      }
    }

    codebase[filename] = updatedContent;

    // Save codebase to database
    await updateSession(session_id, { current_codebase: codebase });

    return NextResponse.json({ updated_codebase: codebase });
  } catch (err) {
    console.error("Error in /api/interview/accept-change route:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
