import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signJWT } from "@/lib/jwt";
import { getAuthSecret, isMockAuthEnabled } from "@/lib/env";

// This endpoint mints a session for any email with no credential check, so it
// exists only while mock auth is explicitly enabled (never in production).
function checkMockMode() {
  return isMockAuthEnabled();
}

export async function POST(request: Request) {
  if (!checkMockMode()) {
    return NextResponse.json({ error: "Method not allowed in this environment" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { email, username } = body;

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const payload = {
      userId: "demo-user-id",
      email,
      username: username || email.split("@")[0],
      exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
    };

    const token = await signJWT(payload, getAuthSecret());

    const cookieStore = await cookies();
    cookieStore.set("mockmate-mock-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 604800, // 7 days
    });

    // For compatibility with getCurrentUser and other scripts, we also set the mockmate-demo-user cookie
    cookieStore.set("mockmate-demo-user", JSON.stringify({ email, username: payload.username }), {
      path: "/",
      maxAge: 604800,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error creating mock session:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  if (!checkMockMode()) {
    return NextResponse.json({ error: "Method not allowed in this environment" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.delete("mockmate-mock-session");
  cookieStore.delete("mockmate-demo-user");

  return NextResponse.json({ success: true });
}
