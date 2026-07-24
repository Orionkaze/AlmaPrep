import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signJWT } from "@/lib/jwt";

function checkMockMode() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !supabaseUrl || 
    supabaseUrl.includes("mock-supabase-project-id") || 
    supabaseUrl.includes("evdfkeikrrsdthnekrrz");
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

    const secret = process.env.NEXTAUTH_SECRET || "3c8c7c90b6a2df33be1eb8b4c5384666f7f2d3a3c2a1e64d38c642b918fbd8f0";
    const token = await signJWT(payload, secret);

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
  } catch (err: any) {
    console.error("Error creating mock session:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
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
