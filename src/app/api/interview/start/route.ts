import { NextResponse } from "next/server";
import { getChallengeById, createSession } from "@/lib/interviewDb";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { challenge_id, user_id } = body;

    if (!challenge_id) {
      return NextResponse.json({ error: "Missing challenge_id" }, { status: 400 });
    }

    // fallback to demo-user-id for easy local testing
    const activeUserId = user_id || "demo-user-id";

    const challenge = await getChallengeById(challenge_id);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 400 });
    }

    const session = await createSession(activeUserId, challenge_id, challenge.starter_code);

    return NextResponse.json({
      session_id: session.id,
      challenge
    });
  } catch (err: any) {
    console.error("Error starting interview session:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
